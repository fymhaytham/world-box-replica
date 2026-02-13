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
     */
    update(entities, world, tickCount) {
        this._formationSystem(entities, tickCount);
        this._warDeclarationSystem(tickCount);
        this._combatSystem(entities, tickCount);
        this._breedingSystem(entities, world, tickCount);
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

    _warDeclarationSystem(tickCount) {
        this._warTimer++;
        if (this._warTimer < 100) return; // every ~5 seconds
        this._warTimer = 0;

        const kingdomIds = [...this.kingdoms.keys()];
        if (kingdomIds.length < 2) return;

        // Small random chance of war between any two kingdoms
        for (let i = 0; i < kingdomIds.length; i++) {
            for (let j = i + 1; j < kingdomIds.length; j++) {
                if (this.areAtWar(kingdomIds[i], kingdomIds[j])) continue;
                if (Math.random() < 0.08) { // 8% chance per pair per check
                    this.declareWar(kingdomIds[i], kingdomIds[j]);
                }
            }
        }

        // Small chance of peace
        for (const warKey of [...this.wars]) {
            if (Math.random() < 0.03) {
                this.wars.delete(warKey);
            }
        }
    }

    // ─── Combat System ────────────────────────────────────
    // Units from warring kingdoms attack each other when close

    _combatSystem(entities, tickCount) {
        this._combatTimer++;
        if (this._combatTimer < 5) return; // every ~0.25 seconds
        this._combatTimer = 0;

        const ATTACK_RANGE = 3; // tiles
        const DAMAGE = 8;
        const CHASE_SPEED = 0.35;

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

        // Check for combat between warring kingdoms
        for (let i = 0; i < units.length; i++) {
            const a = units[i];
            for (let j = i + 1; j < units.length; j++) {
                const b = units[j];
                if (!this.areAtWar(a.kid, b.kid)) continue;

                const dist = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);

                if (dist < ATTACK_RANGE) {
                    // Both deal damage + track attacker for conquest
                    const hpA = entities.healths.get(a.id);
                    const hpB = entities.healths.get(b.id);
                    if (hpA) {
                        hpA.current -= DAMAGE * (0.5 + Math.random() * 0.5);
                        this._lastAttackerKingdom.set(a.id, b.kid);
                    }
                    if (hpB) {
                        hpB.current -= DAMAGE * (0.5 + Math.random() * 0.5);
                        this._lastAttackerKingdom.set(b.id, a.kid);
                    }
                } else if (dist < 15) {
                    // Chase enemy — override wander velocity
                    const velA = entities.velocities.get(a.id);
                    const velB = entities.velocities.get(b.id);
                    if (velA) {
                        const dx = b.pos.x - a.pos.x;
                        const dy = b.pos.y - a.pos.y;
                        const len = Math.hypot(dx, dy) || 1;
                        velA.vx = (dx / len) * CHASE_SPEED;
                        velA.vy = (dy / len) * CHASE_SPEED;
                    }
                    if (velB) {
                        const dx = a.pos.x - b.pos.x;
                        const dy = a.pos.y - b.pos.y;
                        const len = Math.hypot(dx, dy) || 1;
                        velB.vx = (dx / len) * CHASE_SPEED;
                        velB.vy = (dy / len) * CHASE_SPEED;
                    }
                }
            }
        }
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
