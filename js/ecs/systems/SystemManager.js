import { wanderSystem, movementSystem, boatSystem, boardingSystem } from './MovementSystem.js';
import { hungerSystem, grazingSystem } from './MetabolismSystem.js';
import { zombieBehaviorSystem, humanZombieResponseSystem, boatBehaviorSystem } from './CombatSystem.js';
import { fireDamageSystem, cloudSystem, nukeSystem } from './EnvironmentSystem.js';
import { pathfollowingSystem } from './PathfollowingSystem.js';

/**
 * SystemManager — runs all ECS systems in the correct order each logic tick.
 *
 * Call order matches the original main.js logicTick():
 *   1. Zombie AI + Human Response  (combat must set velocities before movement)
 *   2. Pathfollowing               (move along path)
 *   3. Wander + Movement           (apply final velocities, resolve collisions)
 *   4. Hunger + Grazing             (metabolism)
 *   5. Fire Damage + Clouds         (environment)
 */
export function runAllSystems(entities, world, warTargeting, kingdomManager) {
    // 1. Combat AI
    zombieBehaviorSystem(entities, world);
    humanZombieResponseSystem(entities, world);
    boatBehaviorSystem(entities, world, kingdomManager);

    // 2. Pathfollowing
    pathfollowingSystem(entities, world);

    // 2. Movement
    entities.positions.isPassenger = (id) => entities.passengerOf.has(id);
    entities.positions.isBoat = (id) => entities.boats.has(id);

    wanderSystem(entities.positions, entities.velocities, entities.wanders, warTargeting);
    movementSystem(entities.positions, entities.velocities, world);
    boatSystem(entities);
    boardingSystem(entities, kingdomManager ? kingdomManager.membership : null);

    // 3. Metabolism
    hungerSystem(entities.hungers, entities.healths);
    grazingSystem(entities.positions, entities.hungers, entities.grazers, world);

    // 4. Environment
    fireDamageSystem(entities, world);
    cloudSystem(entities, world);
    nukeSystem(entities, world);
}

// Re-export individual systems for consumers that need granular access
export {
    wanderSystem, movementSystem, boatSystem, boardingSystem,
    hungerSystem, grazingSystem,
    zombieBehaviorSystem, humanZombieResponseSystem, boatBehaviorSystem,
    fireDamageSystem, cloudSystem, nukeSystem,
};
