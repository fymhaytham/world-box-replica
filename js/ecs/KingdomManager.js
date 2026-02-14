/**
 * KingdomManager — handles formation of kingdoms, territory claims,
 * unit allegiance, and wars between kingdoms.
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

export class KingdomManager {
    constructor() {
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
        };
        this.kingdoms.set(id, kingdom);
        this.membership.set(leaderId, id);
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
                // Dissolve empty kingdoms — check for conquest
                if (oldK.members.size === 0) {
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

    /**
     * Start a war between two kingdoms.
     */
    declareWar(kid1, kid2) {
        const lo = Math.min(kid1, kid2);
        const hi = Math.max(kid1, kid2);
        this.wars.add(`${lo}-${hi}`);
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

                if (Math.random() < chanceA || Math.random() < chanceB || retaliateA || retaliateB) {
                    this.declareWar(kidA, kidB);
                    // Track who attacked whom for pacifist retaliation
                    if (chanceA > 0 || retaliateA) {
                        if (!this._attackedBy.has(kidB)) this._attackedBy.set(kidB, new Set());
                        this._attackedBy.get(kidB).add(kidA);
                    }
                    if (chanceB > 0 || retaliateB) {
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
                this.wars.delete(warKey);
                // Clear retaliation records
                this._attackedBy.get(Number(aIdStr))?.delete(Number(bIdStr));
                this._attackedBy.get(Number(bIdStr))?.delete(Number(aIdStr));
            }
        }
    }

    // ─── Combat System ────────────────────────────────────
    // Units from warring kingdoms attack each other when close

    _combatSystem(entities, tickCount) {
        this._combatTimer++;

        const ATTACK_RANGE = 3;  // tiles
        const DAMAGE = 8;
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
            let closestDist = TARGET_RANGE;

            for (let j = 0; j < units.length; j++) {
                if (i === j) continue;
                const b = units[j];
                if (!this.areAtWar(a.kid, b.kid)) continue;

                const dist = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = b;
                }
            }

            if (closestEnemy) {
                targeting.add(a.id);

                // Move towards closest enemy
                const vel = entities.velocities.get(a.id);
                if (vel) {
                    const dx = closestEnemy.pos.x - a.pos.x;
                    const dy = closestEnemy.pos.y - a.pos.y;
                    const len = Math.hypot(dx, dy) || 1;
                    vel.vx = (dx / len) * CHASE_SPEED;
                    vel.vy = (dy / len) * CHASE_SPEED;
                }

                // Deal damage if in attack range (only on combat ticks)
                if (this._combatTimer >= 5 && closestDist < ATTACK_RANGE) {
                    const hpEnemy = entities.healths.get(closestEnemy.id);
                    if (hpEnemy) {
                        hpEnemy.current -= DAMAGE * (0.5 + Math.random() * 0.5);
                        this._lastAttackerKingdom.set(closestEnemy.id, a.kid);
                    }
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

        const MAX_POP = 60; // global population cap per kingdom

        for (const [kid, k] of this.kingdoms) {
            if (k.members.size < 2) continue;
            if (k.members.size >= MAX_POP) continue;

            // Chance to breed scales with population: more members = higher chance
            const breedChance = 0.08 + Math.min(k.members.size * 0.02, 0.4);
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
            const childId = entities.spawnHuman(spawnX, spawnY);
            this.joinKingdom(childId, kid);
        }
    }
}
