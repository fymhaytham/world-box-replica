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
