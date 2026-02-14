import * as C from './components.js';

/**
 * EntityManager: pool of entity IDs and their component maps.
 * ECS-Lite — no inheritance, just maps of data.
 */
export class EntityManager {
    constructor() {
        this._nextId = 1;

        // Component pools (Map<entityId, componentData>)
        this.positions = new Map();
        this.velocities = new Map();
        this.healths = new Map();
        this.hungers = new Map();
        this.renders = new Map();
        this.wanders = new Map();
        this.factions = new Map();
        this.grazers = new Map();
        this.personalities = new Map();
        this.zombies = new Map();
    }

    _create() {
        return this._nextId++;
    }

    destroy(id) {
        this.positions.delete(id);
        this.velocities.delete(id);
        this.healths.delete(id);
        this.hungers.delete(id);
        this.renders.delete(id);
        this.wanders.delete(id);
        this.factions.delete(id);
        this.grazers.delete(id);
        this.personalities.delete(id);
        this.zombies.delete(id);
    }

    clear() {
        this.positions.clear();
        this.velocities.clear();
        this.healths.clear();
        this.hungers.clear();
        this.renders.clear();
        this.wanders.clear();
        this.factions.clear();
        this.grazers.clear();
        this.personalities.clear();
        this.zombies.clear();
        this._nextId = 1;
    }

    // ─── Prefab Spawners ─────────────────────────────────

    spawnHuman(x, y) {
        const id = this._create();
        this.positions.set(id, C.Position(x + 0.5, y + 0.5));
        this.velocities.set(id, C.Velocity());
        this.healths.set(id, C.Health(100));
        this.hungers.set(id, C.Hunger(0.03));
        this.renders.set(id, C.Render('#FFD700', 0.8));
        this.wanders.set(id, C.Wander(40));
        this.factions.set(id, C.Faction('human'));
        this.personalities.set(id, C.Personality());
        return id;
    }

    spawnZombie(x, y) {
        const id = this._create();
        this.positions.set(id, C.Position(x + 0.5, y + 0.5));
        this.velocities.set(id, C.Velocity());
        this.healths.set(id, C.Health(60));
        this.renders.set(id, C.Render('🧟', 0.8)); // Zombie emoji
        // Zombies don't wander randomly, they hunt. But we add wander as fallback.
        this.wanders.set(id, { timer: 0, interval: 80, dirX: 0, dirY: 0 });
        this.zombies.set(id, true);
        return id;
    }

    spawnSheep(x, y) {
        const id = this._create();
        this.positions.set(id, C.Position(x + 0.5, y + 0.5));
        this.velocities.set(id, C.Velocity());
        this.healths.set(id, C.Health(60));
        this.hungers.set(id, C.Hunger(0.08));
        this.renders.set(id, C.Render('#F5F5DC', 0.7));
        this.wanders.set(id, C.Wander(25));
        this.factions.set(id, C.Faction('sheep'));
        this.grazers.set(id, C.Grazer());
        return id;
    }
}
