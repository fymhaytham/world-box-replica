/**
 * EntityManager: pool of entity IDs and their component maps.
 * ECS-Lite — no inheritance, just maps of data.
 * Spawning logic lives in EntityFactory.js.
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
        this.clouds = new Map();
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
        this.clouds.delete(id);
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
        this.clouds.clear();
        this._nextId = 1;
    }
}
