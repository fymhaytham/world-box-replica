import { wanderSystem, movementSystem } from './MovementSystem.js';
import { hungerSystem, grazingSystem } from './MetabolismSystem.js';
import { zombieBehaviorSystem, humanZombieResponseSystem } from './CombatSystem.js';
import { fireDamageSystem, cloudSystem } from './EnvironmentSystem.js';

/**
 * SystemManager — runs all ECS systems in the correct order each logic tick.
 *
 * Call order matches the original main.js logicTick():
 *   1. Zombie AI + Human Response  (combat must set velocities before movement)
 *   2. Wander + Movement           (apply final velocities, resolve collisions)
 *   3. Hunger + Grazing             (metabolism)
 *   4. Fire Damage + Clouds         (environment)
 */
export function runAllSystems(entities, world, warTargeting) {
    // 1. Combat AI
    zombieBehaviorSystem(entities, world);
    humanZombieResponseSystem(entities, world);

    // 2. Movement
    wanderSystem(entities.positions, entities.velocities, entities.wanders, warTargeting);
    movementSystem(entities.positions, entities.velocities, world);

    // 3. Metabolism
    hungerSystem(entities.hungers, entities.healths);
    grazingSystem(entities.positions, entities.hungers, entities.grazers, world);

    // 4. Environment
    fireDamageSystem(entities, world);
    cloudSystem(entities, world);
}

// Re-export individual systems for consumers that need granular access
export {
    wanderSystem, movementSystem,
    hungerSystem, grazingSystem,
    zombieBehaviorSystem, humanZombieResponseSystem,
    fireDamageSystem, cloudSystem,
};
