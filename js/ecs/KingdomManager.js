import { spawnHuman, spawnNuke, spawnBoat } from './EntityFactory.js';
import { TILE } from '../constants.js';
import { Pathfinding } from '../utils/Pathfinding.js';

/**
 * KingdomManager — handles formation of kingdoms, territory claims,
 * unit allegiance, wars, and kingdom development (resources & tech).
 */

// Color palette for kingdoms (distinct, vibrant colors)
const KINGDOM_COLORS = [
    '#E53935', // red
    '#1E88E5', // blue
    '#43A047', // green
    '#FB8C00', // orange
    '#8E24AA', // purple
    '#00ACC1', // cyan
    '#FFB300', // amber
    '#D81B60', // pink
    '#5E35B1', // deep purple
    '#00897B', // teal
];

// ─── development constants ──────────────────────────────
const BASE_MAX_POP = 60;

const TECH_TREE = {
    stone_tools: {
        name: 'Stone Tools',
        cost: { science: 50 },
        effect: (k) => { k.modifiers.miningRate += 1; },
        description: 'Allows gathering stone and improves mining.'
    },
    farming: {
        name: 'Farming',
        cost: { science: 100, wood: 50 },
        effect: (k) => { k.modifiers.farmingRate += 1; },
        description: 'Increases food production from grass/dirt.'
    },
    architecture: {
        name: 'Architecture',
        cost: { science: 150, wood: 100, stone: 50 },
        effect: (k) => { k.maxPop += 40; },
        description: 'Increases maximum population capacity.'
    },
    warfare: {
        name: 'Warfare',
        cost: { science: 200, wood: 100, stone: 100 },
        effect: (k) => { k.modifiers.damageBonus += 2; },
        description: 'Increases damage dealt by kingdom units.'
    },
    nuclear_projects: {
        name: 'Manhattan Project',
        cost: { science: 500, wood: 200, stone: 200 },
        effect: (k) => { k.modifiers.hasNukes = true; },
        description: 'Unlocks the ability to launch nuclear missiles.'
    },
    irrigation: {
        name: 'Irrigation',
        cost: { science: 100, wood: 50 },
        effect: (k) => { k.modifiers.farmingRate += 1; },
        description: 'Significantly improves food production.'
    },
    medicine: {
        name: 'Medicine',
        cost: { science: 150, food: 100 },
        effect: (k) => { k.modifiers.healingRate += 1; },
        description: 'Improves health recovery for citizens.'
    },
    masonry: {
        name: 'Masonry',
        cost: { science: 200, stone: 100 },
        effect: (k) => { k.maxPop += 40; },
        description: 'Allows for larger population capacity.'
    },
    iron_working: {
        name: 'Iron Working',
        cost: { science: 300, stone: 100 },
        effect: (k) => {
            k.modifiers.damageBonus += 1;
            k.modifiers.defenseBonus += 2;
        },
        description: 'Better weapons and armor for units.'
    },
    sailing: {
        name: 'Sailing',
        cost: { science: 150, wood: 100 },
        effect: (k) => { k.modifiers.canSail = true; },
        description: 'Allows building transport boats for water travel.'
    },
    naval_warfare: {
        name: 'Naval Warfare',
        cost: { science: 300, wood: 200, stone: 100 },
        effect: (k) => { k.modifiers.canNavalWar = true; },
        description: 'Allows building combat boats for sea battles.'
    },
};

export class KingdomManager {
    constructor(notifications) {
        this.notifications = notifications; // Store reference

        this._nextKingdomId = 1;

        /** @type {Map<number, Kingdom>} */
        this.kingdoms = new Map();

        /** @type {Map<number, number>} entity id → kingdom id */
        this.membership = new Map();

        /** @type {Set<string>} active wars, stored as "lowId-highId" */
        this.wars = new Set();

        // Timers
        this._formTimer = 0;
        this._warTimer = 0;
        this._combatTimer = 0;
        this._breedTimer = 0;
        this._resourceTimer = 0; // New timer for resource gathering

        /** @type {Set<string>} names currently in use */
        this._usedNames = new Set();

        /** @type {Map<number, number>} entity id → attacker kingdom id (for conquest) */
        this._lastAttackerKingdom = new Map();

        /** @type {Map<number, Set<number>>} kingdom id → set of kingdom ids that attacked it */
        this._attackedBy = new Map();
    }

    clear() {
        this.kingdoms.clear();
        this.membership.clear();
        this.wars.clear();
        this._usedNames.clear();
        this._lastAttackerKingdom.clear();
        this._attackedBy.clear();
        this._nextKingdomId = 1;
        this._formTimer = 0;
        this._warTimer = 0;
        this._combatTimer = 0;
        this._breedTimer = 0;
        this._resourceTimer = 0;
    }

    /**
     * Create a new kingdom.
     */
    createKingdom(name, leaderId, leaderPos) {
        const id = this._nextKingdomId++;
        const colorIdx = (id - 1) % KINGDOM_COLORS.length;
        const kingdom = {
            id,
            name,
            color: KINGDOM_COLORS[colorIdx],
            leaderId,
            capitalX: Math.floor(leaderPos.x),
            capitalY: Math.floor(leaderPos.y),
            members: new Set([leaderId]),
            strength: 1,
            // Economy & Tech
            resources: {
                food: 0,
                wood: 0,
                stone: 0,
                science: 0,
            },
            techs: new Set(),
            maxPop: BASE_MAX_POP,
            modifiers: {
                miningRate: 0,   // Base 0, unlocks with Stone Tools
                farmingRate: 1,  // Base 1 for food gathering
                damageBonus: 0,
                defenseBonus: 0,
                healingRate: 0, // Bonus healing
                hasNukes: false,
                canSail: false,
                canNavalWar: false,
            },
            nukeTimer: 0,
            navyTimer: 0,
        };
        this.kingdoms.set(id, kingdom);
        this.membership.set(leaderId, id);
        this.notifications?.show(`Kingdom ${name} has been founded!`, 'info');
        return kingdom;
    }

    /**
     * Add an entity to a kingdom.
     */
    joinKingdom(entityId, kingdomId) {
        const k = this.kingdoms.get(kingdomId);
        if (!k) return;

        // Leave old kingdom if any
        this.leaveKingdom(entityId);

        k.members.add(entityId);
        k.strength = k.members.size;
        this.membership.set(entityId, kingdomId);
    }

    leaveKingdom(entityId) {
        const oldKid = this.membership.get(entityId);
        if (oldKid !== undefined) {
            const oldK = this.kingdoms.get(oldKid);
            if (oldK) {
                oldK.members.delete(entityId);
                oldK.strength = oldK.members.size;

                // If the king died/left, appoint a successor
                if (oldK.leaderId === entityId && oldK.members.size > 0) {
                    const candidates = [...oldK.members];
                    const heir = candidates[Math.floor(Math.random() * candidates.length)];
                    oldK.leaderId = heir;
                    // Note: Update logic (crown) will handle visuals next frame
                }

                // Dissolve empty kingdoms — check for conquest
                if (oldK.members.size === 0) {
                    console.log(`Deleting kingdom ${oldK.name} (id ${oldKid}) because it is empty.`);
                    // Find the attacker's kingdom for conquest
                    const attackerKid = this._lastAttackerKingdom.get(entityId);
                    const attackerK = attackerKid != null ? this.kingdoms.get(attackerKid) : null;

                    // Recycle the name
                    this._usedNames.delete(oldK.name);
                    this.kingdoms.delete(oldKid);

                    // Remove any wars involving this kingdom
                    for (const warKey of [...this.wars]) {
                        if (warKey.includes(`-${oldKid}`) || warKey.startsWith(`${oldKid}-`)) {
                            this.wars.delete(warKey);
                        }
                    }

                    // Conquest: move the winning kingdom's capital to the conquered territory
                    if (attackerK) {
                        attackerK.capitalX = oldK.capitalX;
                        attackerK.capitalY = oldK.capitalY;
                        // Loot resources
                        attackerK.resources.food += oldK.resources.food;
                        attackerK.resources.wood += oldK.resources.wood;
                        attackerK.resources.stone += oldK.resources.stone;
                        attackerK.resources.science += oldK.resources.science;

                        this.notifications?.show(`${attackerK.name} has conquered ${oldK.name}!`, 'conquest');
                    } else {
                        this.notifications?.show(`${oldK.name} has fallen.`, 'warning');
                    }
                }
            }
            this.membership.delete(entityId);
        }
        this._lastAttackerKingdom.delete(entityId);
    }

    getKingdom(entityId) {
        const kid = this.membership.get(entityId);
        return kid !== undefined ? this.kingdoms.get(kid) : null;
    }

    getKingdomColor(entityId) {
        const k = this.getKingdom(entityId);
        return k ? k.color : null;
    }

    getLevel(k) {
        // Base level 1, +1 for every 2 techs
        return Math.floor(k.techs.size / 2) + 1;
    }

    /**
     * Start a war between two kingdoms.
     */
    declareWar(kid1, kid2) {
        const lo = Math.min(kid1, kid2);
        const hi = Math.max(kid1, kid2);
        this.wars.add(`${lo}-${hi}`);
        this.notifications?.show(`${this.kingdoms.get(kid1)?.name} and ${this.kingdoms.get(kid2)?.name} are at WAR!`, 'war');
    }

    areAtWar(kid1, kid2) {
        if (kid1 === kid2) return false;
        const lo = Math.min(kid1, kid2);
        const hi = Math.max(kid1, kid2);
        return this.wars.has(`${lo}-${hi}`);
    }

    makePeace(kid1, kid2) {
        const lo = Math.min(kid1, kid2);
        const hi = Math.max(kid1, kid2);
        this.wars.delete(`${lo}-${hi}`);
        this.notifications?.show(`${this.kingdoms.get(kid1)?.name} and ${this.kingdoms.get(kid2)?.name} made peace.`, 'peace');
    }

    // ─── Procedural Name Generator ───────────────────────
    _generateName() {
        const PREFIXES = [
            'Ash', 'Bright', 'Crystal', 'Dark', 'Ember',
            'Frost', 'Gold', 'Iron', 'Moon', 'Red',
            'Silver', 'Storm', 'Sun', 'Thorn', 'Wind',
        ];
        const SUFFIXES = [
            'vale', 'moor', 'hollow', 'peak', 'wall',
            'reach', 'veil', 'wood', 'haven', 'fall',
            'grove', 'cliff', 'crest', 'holme', 'ridge',
            'mere', 'watch', 'spire',
            'opolis', 'gard', 'heim', 'bad', 'grad',
        ];

        // Try random combos, avoiding used names
        for (let attempt = 0; attempt < 100; attempt++) {
            const pre = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
            const suf = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
            const name = pre + suf;
            if (!this._usedNames.has(name)) {
                this._usedNames.add(name);
                return name;
            }
        }

        // Fallback: numbered kingdom
        const fallback = `Kingdom ${this._nextKingdomId}`;
        this._usedNames.add(fallback);
        return fallback;
    }

    /**
     * Main tick — called every logic tick from main.js
     * Returns: Set<entityId> of units currently targeting enemies
     */
    update(entities, world, tickCount) {
        this._formationSystem(entities, tickCount);
        this._warDeclarationSystem(entities, tickCount);
        this._combatSystem(entities, tickCount);
        this._breedingSystem(entities, world, tickCount);

        // New Development Systems
        this._resourceTimer++;
        if (this._resourceTimer >= 20) { // Every ~1 second
            this._resourceGatheringSystem(entities, world);
            this._distributionSystem(entities);
            this._progressionSystem();
            this._nuclearWarfareSystem(entities, world);
            this._rebellionSystem(entities);
            this._navySystem(entities, world);
            this._resourceTimer = 0;
        }

        return this._warTargeting;
    }

    // ─── Kingdom Formation ────────────────────────────────
    // Every N ticks, homeless humans near each other form kingdoms
    // or join existing ones.

    _formationSystem(entities, tickCount) {
        this._formTimer++;
        if (this._formTimer < 40) return; // every ~2 seconds
        this._formTimer = 0;

        // Gather homeless humans
        const homeless = [];
        for (const [id, faction] of entities.factions) {
            if (faction.type !== 'human') continue;
            if (this.membership.has(id)) continue;
            const pos = entities.positions.get(id);
            if (pos) homeless.push({ id, pos });
        }

        for (const unit of homeless) {
            // Try to join nearest existing kingdom
            let joined = false;
            let nearestDist = 20; // max recruit distance (tiles)
            let nearestKid = null;

            for (const [kid, k] of this.kingdoms) {
                for (const memberId of k.members) {
                    const mpos = entities.positions.get(memberId);
                    if (!mpos) continue;
                    const d = Math.hypot(unit.pos.x - mpos.x, unit.pos.y - mpos.y);
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearestKid = kid;
                    }
                }
            }

            if (nearestKid !== null && nearestDist < 12) {
                this.joinKingdom(unit.id, nearestKid);
                joined = true;
            }

            // Or form a new kingdom with another homeless unit nearby
            if (!joined) {
                for (const other of homeless) {
                    if (other.id === unit.id) continue;
                    if (this.membership.has(other.id)) continue;
                    const d = Math.hypot(unit.pos.x - other.pos.x, unit.pos.y - other.pos.y);
                    if (d < 8) {
                        const name = this._generateName();
                        const k = this.createKingdom(name, unit.id, unit.pos);
                        this.joinKingdom(other.id, k.id);
                        joined = true;
                        break;
                    }
                }
            }
        }
    }

    // ─── War Declaration ──────────────────────────────────
    // Periodically, kingdoms may declare war on each other

    _warDeclarationSystem(entities, tickCount) {
        this._warTimer++;
        if (this._warTimer < 100) return; // every ~5 seconds
        this._warTimer = 0;

        const kingdomIds = [...this.kingdoms.keys()];
        if (kingdomIds.length < 2) return;

        // War chance per king personality:
        // 1=Warmonger 25%, 2=Irritable 15%, 3=Neutral 8%, 4=Peaceful 2%, 5=Pacifist 0%
        const WAR_CHANCE = { 1: 0.25, 2: 0.15, 3: 0.08, 4: 0.02, 5: 0 };
        // Peace chance: aggressive kings less likely to make peace
        const PEACE_CHANCE = { 1: 0.01, 2: 0.02, 3: 0.03, 4: 0.06, 5: 0.10 };

        for (let i = 0; i < kingdomIds.length; i++) {
            const kidA = kingdomIds[i];
            const kA = this.kingdoms.get(kidA);
            if (!kA) continue;

            // Get king personality
            const persA = entities.personalities.get(kA.leaderId);
            const pValA = persA ? persA.value : 3;

            for (let j = i + 1; j < kingdomIds.length; j++) {
                const kidB = kingdomIds[j];
                if (this.areAtWar(kidA, kidB)) continue;

                const kB = this.kingdoms.get(kidB);
                if (!kB) continue;
                const persB = entities.personalities.get(kB.leaderId);
                const pValB = persB ? persB.value : 3;

                // Each king rolls independently — war starts if EITHER initiates
                const chanceA = WAR_CHANCE[pValA] || 0;
                const chanceB = WAR_CHANCE[pValB] || 0;

                // Distance-based scaling: closer kingdoms are more likely to fight
                const dist = Math.hypot(kA.capitalX - kB.capitalX, kA.capitalY - kB.capitalY);
                // Baseline distance of 100 tiles. Factor ranges from 0.1x to 5.0x
                const distanceFactor = Math.max(0.1, Math.min(5.0, 100 / (dist || 1)));

                // Pacifists (5) only retaliate — check if they were attacked
                let retaliateA = false, retaliateB = false;
                if (pValA === 5) {
                    const attackers = this._attackedBy.get(kidA);
                    retaliateA = attackers && attackers.has(kidB);
                }
                if (pValB === 5) {
                    const attackers = this._attackedBy.get(kidB);
                    retaliateB = attackers && attackers.has(kidA);
                }

                if (Math.random() < (chanceA * distanceFactor) ||
                    Math.random() < (chanceB * distanceFactor) ||
                    retaliateA || retaliateB) {
                    this.declareWar(kidA, kidB);
                    // Track who attacked whom for pacifist retaliation
                    if ((chanceA * distanceFactor) > 0 || retaliateA) {
                        if (!this._attackedBy.has(kidB)) this._attackedBy.set(kidB, new Set());
                        this._attackedBy.get(kidB).add(kidA);
                    }
                    if ((chanceB * distanceFactor) > 0 || retaliateB) {
                        if (!this._attackedBy.has(kidA)) this._attackedBy.set(kidA, new Set());
                        this._attackedBy.get(kidA).add(kidB);
                    }
                }
            }
        }

        // Peace: roll based on the more peaceful king
        for (const warKey of [...this.wars]) {
            const [aIdStr, bIdStr] = warKey.split('-');
            const kA = this.kingdoms.get(Number(aIdStr));
            const kB = this.kingdoms.get(Number(bIdStr));
            if (!kA || !kB) { this.wars.delete(warKey); continue; }

            const pA = entities.personalities.get(kA.leaderId);
            const pB = entities.personalities.get(kB.leaderId);
            const pValA = pA ? pA.value : 3;
            const pValB = pB ? pB.value : 3;

            // Use the MORE peaceful king's peace chance
            const peaceChance = Math.max(PEACE_CHANCE[pValA] || 0.03, PEACE_CHANCE[pValB] || 0.03);
            if (Math.random() < peaceChance) {
                // Clear retaliation records
                this._attackedBy.get(Number(aIdStr))?.delete(Number(bIdStr));
                this._attackedBy.get(Number(bIdStr))?.delete(Number(aIdStr));
                this.makePeace(Number(aIdStr), Number(bIdStr));
            }
        }
    }

    // ─── Combat System ────────────────────────────────────
    // Units from warring kingdoms attack each other when close

    _combatSystem(entities, tickCount) {
        this._combatTimer++;

        const ATTACK_RANGE = 3;  // tiles
        let DAMAGE = 8;          // Base damage
        const CHASE_SPEED = 0.35;
        const TARGET_RANGE = 50; // tiles — seek enemies from far away

        // Build spatial list of kingdom units
        const units = [];
        for (const [id, faction] of entities.factions) {
            if (faction.type !== 'human') continue;
            const kid = this.membership.get(id);
            if (kid === undefined) continue;
            const pos = entities.positions.get(id);
            if (!pos) continue;
            units.push({ id, kid, pos });
        }

        // Build war-targeting set: for each unit at war, find closest enemy
        const targeting = new Set();
        for (let i = 0; i < units.length; i++) {
            const a = units[i];
            let closestEnemy = null;
            let closestDistSq = TARGET_RANGE * TARGET_RANGE;

            const kA = this.kingdoms.get(a.kid);
            // Apply kingdom tech bonuses to damage if available
            let kDamage = DAMAGE + (kA ? kA.modifiers.damageBonus : 0);

            for (let j = 0; j < units.length; j++) {
                if (i === j) continue;
                const b = units[j];
                if (!this.areAtWar(a.kid, b.kid)) continue;

                const dx = a.pos.x - b.pos.x;
                const dy = a.pos.y - b.pos.y;
                const dSq = dx * dx + dy * dy;
                if (dSq < closestDistSq) {
                    closestDistSq = dSq;
                    closestEnemy = b;
                }
            }

            if (closestEnemy) {
                targeting.add(a.id);
                const path = entities.paths.get(a.id);
                const dist = Math.sqrt(closestDistSq);

                if (path) {
                    // Recalculate path if target changed or timer expired
                    const needsRecalc = path.targetId !== closestEnemy.id ||
                        path.recalcTimer <= 0 ||
                        (path.points.length === 0 && dist > 1.5);

                    if (needsRecalc) {
                        path.targetId = closestEnemy.id;
                        path.targetX = closestEnemy.pos.x;
                        path.targetY = closestEnemy.pos.y;
                        path.recalcTimer = 30 + Math.random() * 20; // Recalc every ~1.5-2.5 seconds

                        const isBoat = entities.boats.has(a.id);
                        const newPoints = Pathfinding.findPath(a.pos.x, a.pos.y, closestEnemy.pos.x, closestEnemy.pos.y, world, 500, isBoat);

                        if (newPoints) {
                            path.points = newPoints;
                        } else {
                            // No route found! Stop and maybe wander or wait
                            path.points = [];
                            const vel = entities.velocities.get(a.id);
                            if (vel) { vel.vx = 0; vel.vy = 0; }
                        }
                    } else {
                        path.recalcTimer--;
                    }
                }

                // Deal damage if in attack range (only on combat ticks)
                if (this._combatTimer >= 5 && dist < ATTACK_RANGE) {
                    const hpEnemy = entities.healths.get(closestEnemy.id);
                    if (hpEnemy) {
                        const kB = this.kingdoms.get(closestEnemy.kid);
                        const def = kB ? kB.modifiers.defenseBonus : 0;
                        const finalDamage = Math.max(1, kDamage - (def * 0.5)); // Defense reduces damage

                        hpEnemy.current -= finalDamage * (0.5 + Math.random() * 0.5);
                        this._lastAttackerKingdom.set(closestEnemy.id, a.kid);
                    }
                }
            } else {
                // No enemy? Clear path
                const path = entities.paths.get(a.id);
                if (path) {
                    path.points = [];
                    path.targetId = null;
                }
            }
        }

        if (this._combatTimer >= 5) this._combatTimer = 0;
        this._warTargeting = targeting;
    }

    // ─── Breeding System ──────────────────────────────────
    // Kingdoms with 2+ members slowly produce new humans

    _breedingSystem(entities, world, tickCount) {
        this._breedTimer++;
        if (this._breedTimer < 80) return; // every ~4 seconds
        this._breedTimer = 0;

        for (const [kid, k] of this.kingdoms) {
            if (k.members.size < 2) continue;
            if (k.members.size >= k.maxPop) continue; // Use dynamic maxPop

            // Chance to breed scales with population: more members = higher chance
            const breedChance = 0.08 + Math.min(k.members.size * 0.02, 0.4);
            // Food abundant? Boost breeding
            if (k.resources.food > k.members.size * 2) {
                // Not implemented: extra boost?
            }
            // Starving? No breeding
            if (k.resources.food <= 0) continue;

            if (Math.random() > breedChance) continue;

            // Pick a random member as "parent"
            const memberArr = [...k.members];
            const parentId = memberArr[Math.floor(Math.random() * memberArr.length)];
            const parentPos = entities.positions.get(parentId);
            if (!parentPos) continue;

            // Find a walkable tile near parent (within ±3 tiles)
            let spawnX = null, spawnY = null;
            for (let attempt = 0; attempt < 10; attempt++) {
                const tx = Math.floor(parentPos.x) + Math.floor(Math.random() * 7) - 3;
                const ty = Math.floor(parentPos.y) + Math.floor(Math.random() * 7) - 3;
                if (world.isWalkable(tx, ty)) {
                    spawnX = tx;
                    spawnY = ty;
                    break;
                }
            }
            if (spawnX === null) continue;

            // Spawn new human and auto-join kingdom
            const childId = spawnHuman(entities, spawnX, spawnY);
            this.joinKingdom(childId, kid);

            // New child costs some food
            k.resources.food = Math.max(0, k.resources.food - 5);
        }
    }

    // ─── Resource Gathering System ────────────────────────
    // Members gather resources based on the tile they are standing on.
    // If they aren't on a good tile, they seek one out.
    _resourceGatheringSystem(entities, world) {
        for (const [kid, k] of this.kingdoms) {
            // Passive Science (base + per member)
            k.resources.science += 0.5 + (k.members.size * 0.1);

            const canMine = k.modifiers.miningRate > 0;

            for (const memberId of k.members) {
                const pos = entities.positions.get(memberId);
                if (!pos) continue;

                const tx = Math.floor(pos.x);
                const ty = Math.floor(pos.y);
                const tile = world.get(tx, ty);

                // 1. Gathering Logic (as before)
                let onUsefulTile = false;
                if (tile === TILE.FOREST) {
                    k.resources.wood += 1;
                    k.resources.food += 0.2 * k.modifiers.farmingRate;
                    onUsefulTile = true;
                } else if (tile === TILE.GRASS) {
                    k.resources.food += 0.5 * k.modifiers.farmingRate;
                    onUsefulTile = true;
                } else if (tile === TILE.STONE && canMine) {
                    k.resources.stone += 1 * k.modifiers.miningRate;
                    onUsefulTile = true;
                }

                // 2. Seeking Logic
                // Only seek if not actively targeted in war (handled by _combatSystem)
                if (this._warTargeting && this._warTargeting.has(memberId)) continue;
                if (entities.passengerOf.has(memberId)) continue;

                const path = entities.paths.get(memberId);
                if (!path) continue;

                // If not on useful tile, seek one
                if (!onUsefulTile && (path.points.length === 0 || path.recalcTimer <= 0)) {
                    // Find nearest useful tile in a 15-tile radius
                    let bestX = null, bestY = null;
                    let bestDistSq = 15 * 15;

                    for (let dy = -15; dy <= 15; dy += 2) { // Step 2 for performance
                        for (let dx = -15; dx <= 15; dx += 2) {
                            const nx = tx + dx;
                            const ny = ty + dy;
                            if (!world.inBounds(nx, ny)) continue;

                            const nTile = world.get(nx, ny);
                            const isUseful = nTile === TILE.FOREST || nTile === TILE.GRASS || (nTile === TILE.STONE && canMine);

                            if (isUseful) {
                                const dSq = dx * dx + dy * dy;
                                if (dSq < bestDistSq) {
                                    bestDistSq = dSq;
                                    bestX = nx;
                                    bestY = ny;
                                }
                            }
                        }
                    }

                    if (bestX !== null) {
                        path.targetX = bestX;
                        path.targetY = bestY;
                        path.recalcTimer = 100 + Math.random() * 100; // Recalc less often for resources
                        const newPoints = Pathfinding.findPath(pos.x, pos.y, bestX, bestY, world, 300);
                        if (newPoints) {
                            path.points = newPoints;
                        } else {
                            path.points = [];
                            // Reached unreachable tile? Stop.
                            const vel = entities.velocities.get(memberId);
                            if (vel) { vel.vx = 0; vel.vy = 0; }
                        }
                    } else {
                        // No useful tiles found, just wander (reset path)
                        path.points = [];
                    }
                } else {
                    path.recalcTimer--;
                }
            }
        }
    }

    // ─── Distribution System ──────────────────────────────
    // Feed the population from kingdom stores.
    _distributionSystem(entities) {
        const FOOD_PER_PERSON = 1.0;

        for (const [kid, k] of this.kingdoms) {
            if (k.members.size === 0) continue;

            // Simple model: Deduct food for total population
            // In a more complex model, we would iterate entities and reduce their individual hunger.
            // For now, let's just reduce global kingdom food.
            // If food is 0, we could apply hunger damage or stop healing.

            const demand = k.members.size * FOOD_PER_PERSON;

            if (k.resources.food >= demand) {
                k.resources.food -= demand;
                // Everyone is fed — maybe heal them slightly?
                // This would require iterating all members.
                // Let's do it to keep it robust.
                for (const memberId of k.members) {
                    const h = entities.hungers.get(memberId);
                    if (h) {
                        h.value = Math.max(0, h.value - 2); // Reduce hunger
                    }
                    // Also small heal?
                    const hp = entities.healths.get(memberId);
                    if (hp && hp.current < hp.max) {
                        const healAmount = 1 + k.modifiers.healingRate;
                        hp.current = Math.min(hp.max, hp.current + healAmount);
                    }
                }
            } else {
                // Not enough food! Rationing.
                k.resources.food = 0;
                // Hunger increases passively by MetabolismSystem anyway.
                // We just don't reduce it here.
                // Optionally: Apply extra morale penalty or starvation warning?
            }
        }
    }

    // ─── Progression System ───────────────────────────────
    // Unlock new tech if resources allow

    _progressionSystem() {
        for (const [kid, k] of this.kingdoms) {
            for (const [techKey, tech] of Object.entries(TECH_TREE)) {
                if (k.techs.has(techKey)) continue;

                // Check costs
                let affordable = true;
                for (const [res, amount] of Object.entries(tech.cost)) {
                    if (k.resources[res] < amount) {
                        affordable = false;
                        break;
                    }
                }

                if (affordable) {
                    // Buy it!
                    for (const [res, amount] of Object.entries(tech.cost)) {
                        k.resources[res] -= amount;
                    }
                    k.techs.add(techKey);
                    tech.effect(k);

                    const progress = k.techs.size;
                    const total = Object.keys(TECH_TREE).length;

                    console.log(`Kingdom ${k.name} researched ${tech.name} (${progress}/${total})!`);
                    this.notifications?.show(
                        `${k.name} researched <b>${tech.name}</b> (${progress}/${total})!<br><small>${tech.description}</small>`,
                        'research'
                    );
                }
            }
        }
    }

    // ─── Rebellion System ─────────────────────────────────
    _rebellionSystem(entities) {
        for (const [kid, k] of this.kingdoms) {
            if (k.members.size < 5) continue; // Need at least some population to rebel

            const kingPers = entities.personalities.get(k.leaderId);
            if (!kingPers) continue;
            const pValK = kingPers.value;

            // Define "aggressive" (1-2) and "peaceful" (4-5) groups
            const isKingAggressive = pValK <= 2;
            const isKingPeaceful = pValK >= 4;

            if (!isKingAggressive && !isKingPeaceful) continue;

            let aggressiveCount = 0;
            let peacefulCount = 0;
            const rebels = [];

            for (const memberId of k.members) {
                if (memberId === k.leaderId) continue;
                const p = entities.personalities.get(memberId);
                if (!p) continue;

                if (p.value <= 2) {
                    aggressiveCount++;
                    if (isKingPeaceful) rebels.push(memberId);
                } else if (p.value >= 4) {
                    peacefulCount++;
                    if (isKingAggressive) rebels.push(memberId);
                }
            }

            const totalCount = k.members.size;
            let triggerRebellion = false;
            let rebellionReason = "";

            if (isKingPeaceful && (aggressiveCount / totalCount) > 0.5) {
                triggerRebellion = true;
                rebellionReason = "The citizens want war, but the king is too peaceful!";
            } else if (isKingAggressive && (peacefulCount / totalCount) > 0.5) {
                triggerRebellion = true;
                rebellionReason = "The citizens want peace, but the king is too aggressive!";
            }

            if (triggerRebellion && rebels.length > 0) {
                this._executeRebellion(k, rebels, entities, rebellionReason);
            }
        }
    }

    _executeRebellion(oldK, rebels, entities, reason) {
        // Find a starting position for the new kingdom (mean of rebels' positions)
        let avgX = 0, avgY = 0;
        let count = 0;
        for (const rId of rebels) {
            const pos = entities.positions.get(rId);
            if (pos) {
                avgX += pos.x;
                avgY += pos.y;
                count++;
            }
        }
        if (count === 0) return;
        avgX /= count;
        avgY /= count;

        const newName = this._generateName();
        // The first rebel becomes the new leader
        const leaderId = rebels[0];

        // IMPORTANT: Must leave old kingdom before creating new one to avoid membership conflicts
        for (const rId of rebels) {
            this.leaveKingdom(rId);
        }

        const newK = this.createKingdom(newName, leaderId, { x: avgX, y: avgY });

        // Move the rest of the rebels to the new kingdom
        for (let i = 1; i < rebels.length; i++) {
            this.joinKingdom(rebels[i], newK.id);
        }

        this.notifications?.show(`REBELLION in ${oldK.name}! ${reason}`, 'warning');
        this.notifications?.show(`${newName} has split off from ${oldK.name}.`, 'info');

        // Rebellions often lead to war
        if (oldK.leaderId && Math.random() < 0.7) {
            this.declareWar(oldK.id, newK.id);
        }
    }

    // ─── Nuclear Warfare System ───────────────────────────
    _nuclearWarfareSystem(entities, world) {
        for (const [kid, k] of this.kingdoms) {
            // Check if kingdom has nukes
            if (!k.modifiers.hasNukes) continue;

            // Timer management
            if (k.nukeTimer > 0) {
                k.nukeTimer--;
                continue;
            }

            // Find valid enemy target
            let target = null;
            const wars = [...this.wars];
            // Find wars involving this kingdom
            const enemyKingdomIds = [];
            for (const warKey of wars) {
                const [id1, id2] = warKey.split('-').map(Number);
                if (id1 === kid) enemyKingdomIds.push(id2);
                else if (id2 === kid) enemyKingdomIds.push(id1);
            }

            if (enemyKingdomIds.length === 0) continue;

            // Select a random enemy kingdom
            const enemyKid = enemyKingdomIds[Math.floor(Math.random() * enemyKingdomIds.length)];
            const enemyK = this.kingdoms.get(enemyKid);

            if (!enemyK || enemyK.members.size === 0) continue;

            // Target Priority:
            // 1. Capital (if populated)
            // 2. Large concentration of troops (simplified: random member)

            // 50% chance to target capital, 50% random unit
            if (Math.random() < 0.5) {
                target = { x: enemyK.capitalX, y: enemyK.capitalY };
            } else {
                const members = [...enemyK.members];
                const victimId = members[Math.floor(Math.random() * members.length)];
                const pos = entities.positions.get(victimId);
                if (pos) target = { x: pos.x, y: pos.y };
            }

            if (target) {
                // Launch Nuke!
                spawnNuke(entities, target.x, target.y);

                // Notifications
                this.notifications?.show(`${k.name} LAUNCHED A NUKE AT ${enemyK.name}!`, 'danger');
                console.log(`${k.name} launched a NUKE at ${enemyK.name}!`);

                // Reset timer (e.g., 60 seconds = ~1200 ticks at 20tps, but we call this every 20 ticks)
                // So delay is in "loop calls". 60s / 1s = 60 calls.
                k.nukeTimer = 60;
            }
        }
    }

    // ─── Navy System ──────────────────────────────────────
    _navySystem(entities, world) {
        for (const [kid, k] of this.kingdoms) {
            if (!k.modifiers.canSail || this.getLevel(k) < 4) continue;

            if (k.navyTimer > 0) {
                k.navyTimer--;
                continue;
            }

            // Decide to build a boat (random chance + resource check)
            if (Math.random() < 0.2) {
                const canAffordCombat = k.modifiers.canNavalWar && k.resources.wood >= 150 && k.resources.stone >= 50;
                const canAffordTravel = k.resources.wood >= 80;

                if (!canAffordTravel && !canAffordCombat) continue;

                // Choose boat type: combat if at war and affordable, else travel
                const isAtWar = [...this.wars].some(w => w.includes(`${kid}`));
                const type = (isAtWar && canAffordCombat && Math.random() < 0.7) ? 'combat' : 'travel';

                // Choose size: large (8%), medium (42%), small (50%)
                const rnd = Math.random();
                const size = rnd < 0.08 ? 'large' : (rnd < 0.5 ? 'medium' : 'small');

                // Find a coastal spot near capital or members
                let spawnPos = null;
                const searchRadius = 15;

                // Try near capital
                for (let attempt = 0; attempt < 20; attempt++) {
                    const tx = k.capitalX + Math.floor(Math.random() * searchRadius * 2) - searchRadius;
                    const ty = k.capitalY + Math.floor(Math.random() * searchRadius * 2) - searchRadius;

                    if (this._isCoastalTile(world, tx, ty)) {
                        spawnPos = { x: tx, y: ty };
                        break;
                    }
                }

                if (spawnPos) {
                    // Deduct resources
                    if (type === 'combat') {
                        k.resources.wood -= 150;
                        k.resources.stone -= 50;
                    } else {
                        k.resources.wood -= 80;
                    }

                    spawnBoat(entities, spawnPos.x, spawnPos.y, size, type, kid);
                    this.notifications?.show(`${k.name} has launched a ${size} ${type} boat!`, 'info');

                    // Reset timer (~30-60 seconds)
                    k.navyTimer = 30 + Math.floor(Math.random() * 30);
                }
            }
        }
    }

    _isCoastalTile(world, x, y) {
        // Must be Water next to Walkable land
        const tile = world.get(x, y);
        if (tile !== TILE.WATER && tile !== TILE.WATER_DEEP) return false;

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                if (world.isWalkable(x + dx, y + dy)) return true;
            }
        }
        return false;
    }
}
