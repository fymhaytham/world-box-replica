import * as C from './components/index.js';

/**
 * EntityFactory — prefab spawners for all entity archetypes.
 * Each function takes (entities, x, y) and returns the new entity ID.
 * The EntityManager is "pure data" — this module owns the spawning recipes.
 */

export function spawnHuman(entities, x, y) {
    const id = entities._create();
    entities.positions.set(id, C.Position(x + 0.5, y + 0.5));
    entities.velocities.set(id, C.Velocity());
    entities.healths.set(id, C.Health(100));
    entities.hungers.set(id, C.Hunger(0.03));
    entities.renders.set(id, C.Render('#FFD700', 0.8));
    entities.wanders.set(id, C.Wander(40));
    entities.factions.set(id, C.Faction('human'));
    entities.personalities.set(id, C.Personality());
    return id;
}

export function spawnZombie(entities, x, y) {
    const id = entities._create();
    entities.positions.set(id, C.Position(x + 0.5, y + 0.5));
    entities.velocities.set(id, C.Velocity());
    entities.healths.set(id, C.Health(60));
    entities.renders.set(id, C.Render('🧟', 0.8));
    entities.wanders.set(id, { timer: 0, interval: 80, dirX: 0, dirY: 0 });
    entities.zombies.set(id, true);
    return id;
}

export function spawnSheep(entities, x, y) {
    const id = entities._create();
    entities.positions.set(id, C.Position(x + 0.5, y + 0.5));
    entities.velocities.set(id, C.Velocity());
    entities.healths.set(id, C.Health(60));
    entities.hungers.set(id, C.Hunger(0.08));
    entities.renders.set(id, C.Render('#F5F5DC', 0.7));
    entities.wanders.set(id, C.Wander(25));
    entities.factions.set(id, C.Faction('sheep'));
    entities.grazers.set(id, C.Grazer());
    return id;
}

export function spawnCloud(entities, x, y) {
    const id = entities._create();
    entities.positions.set(id, C.Position(x + 0.5, y + 0.5));
    entities.velocities.set(id, C.Velocity(0.02, 0));
    entities.renders.set(id, C.Render('☁️', 1.2));
    entities.clouds.set(id, C.Cloud());
    return id;
}

export function spawnNuke(entities, x, y) {
    const id = entities._create();
    entities.positions.set(id, C.Position(x + 0.5, y + 0.5));
    entities.velocities.set(id, C.Velocity(0, 0));
    entities.renders.set(id, C.Render('#006400', 1.2));
    entities.nukes.set(id, C.Nuke(100)); // Explode after 5 seconds
    return id;
}
