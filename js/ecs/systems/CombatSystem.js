import {
    ZOMBIE_SPEED,
    ZOMBIE_ATTACK_RANGE,
    ZOMBIE_SEARCH_RADIUS,
    ZOMBIE_ATTACK_DAMAGE,
    HUMAN_SPEED,
    HUMAN_RUN_SPEED,
    ZOMBIE_DETECTION_RADIUS,
    HUMAN_ATTACK_DAMAGE,
} from '../../balance.js';

/**
 * CombatSystem — zombie hunting AI and human fight-or-flight response.
 */

// ─── Zombie Behavior System ─────────────────────────────
export function zombieBehaviorSystem(entities, world) {
    for (const [zId, _] of entities.zombies) {
        const zPos = entities.positions.get(zId);
        const zVel = entities.velocities.get(zId);
        if (!zPos || !zVel) continue;

        let targetId = null;
        let minDistSq = ZOMBIE_SEARCH_RADIUS * ZOMBIE_SEARCH_RADIUS;

        // Find nearest human
        for (const [hId, f] of entities.factions) {
            if (f.name !== 'human') continue;
            const hPos = entities.positions.get(hId);
            if (!hPos) continue;

            const dx = hPos.x - zPos.x;
            const dy = hPos.y - zPos.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                targetId = hId;
            }
        }

        if (targetId) {
            const hPos = entities.positions.get(targetId);
            const dx = hPos.x - zPos.x;
            const dy = hPos.y - zPos.y;
            const dist = Math.sqrt(minDistSq);

            // Move towards
            if (dist > 0.1) {
                zVel.vx = (dx / dist) * ZOMBIE_SPEED;
                zVel.vy = (dy / dist) * ZOMBIE_SPEED;
            }

            // Attack
            if (dist < ZOMBIE_ATTACK_RANGE) {
                const hHp = entities.healths.get(targetId);
                if (hHp) {
                    hHp.current -= ZOMBIE_ATTACK_DAMAGE;
                }
            }
        }
    }
}

// ─── Human Zombie Response System ───────────────────────
export function humanZombieResponseSystem(entities, world) {
    for (const [hId, f] of entities.factions) {
        if (f.name !== 'human') continue;

        const hPos = entities.positions.get(hId);
        const hVel = entities.velocities.get(hId);
        const personality = entities.personalities.get(hId);
        if (!hPos || !hVel || !personality) continue;

        // Check nearest zombie
        let nearestZombieId = null;
        let minDistSq = ZOMBIE_DETECTION_RADIUS * ZOMBIE_DETECTION_RADIUS;

        for (const [zId, _] of entities.zombies) {
            const zPos = entities.positions.get(zId);
            if (!zPos) continue;

            const dx = zPos.x - hPos.x;
            const dy = zPos.y - hPos.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearestZombieId = zId;
            }
        }

        if (nearestZombieId) {
            const zPos = entities.positions.get(nearestZombieId);
            const dx = zPos.x - hPos.x;
            const dy = zPos.y - hPos.y;
            const dist = Math.sqrt(minDistSq);

            const isAggressive = personality.aggressiveness > 3;

            if (isAggressive) {
                // FIGHT — Move towards
                if (dist > 0.5) {
                    hVel.vx = (dx / dist) * HUMAN_SPEED;
                    hVel.vy = (dy / dist) * HUMAN_SPEED;
                }
                // Attack
                if (dist < 1.0) {
                    const zHp = entities.healths.get(nearestZombieId);
                    if (zHp) {
                        zHp.current -= HUMAN_ATTACK_DAMAGE;
                    }
                }
            } else {
                // FLIGHT — Move AWAY
                if (dist > 0) {
                    hVel.vx = -(dx / dist) * HUMAN_RUN_SPEED;
                    hVel.vy = -(dy / dist) * HUMAN_RUN_SPEED;
                }
            }
        }
    }
}

// ─── Boat Behavior System ───────────────────────────────
export function boatBehaviorSystem(entities, kingdomManager) {
    const { positions, velocities, boats, healths, membership } = entities;

    const CHASE_SPEED = 0.25;
    const ATTACK_RANGE = 4;
    const SEARCH_RADIUS = 40;

    for (const [id, boat] of boats) {
        if (boat.type !== 'combat') continue;

        const pos = positions.get(id);
        const vel = velocities.get(id);
        const kid = boat.kingdomId;
        if (!pos || !vel || kid === null || kid === undefined) continue;

        let nearestEnemyId = null;
        let minDistSq = SEARCH_RADIUS * SEARCH_RADIUS;

        // Target enemy boats or units
        for (const [eId, ePos] of positions) {
            if (eId === id) continue;
            // Get kingdom of target
            let eKid = membership.get(eId);
            if (eKid === undefined) {
                const eBoat = boats.get(eId);
                if (eBoat) eKid = eBoat.kingdomId;
            }

            if (eKid === undefined || eKid === null || (kingdomManager && !kingdomManager.areAtWar(kid, eKid))) continue;

            const dx = ePos.x - pos.x;
            const dy = ePos.y - pos.y;
            const dSq = dx * dx + dy * dy;

            if (dSq < minDistSq) {
                minDistSq = dSq;
                nearestEnemyId = eId;
            }
        }

        if (nearestEnemyId) {
            const ePos = positions.get(nearestEnemyId);
            const dx = ePos.x - pos.x;
            const dy = ePos.y - pos.y;
            const dist = Math.sqrt(minDistSq);

            // Move towards
            if (dist > 1.5) {
                vel.vx = (dx / dist) * CHASE_SPEED;
                vel.vy = (dy / dist) * CHASE_SPEED;
            }

            // Attack
            if (dist < ATTACK_RANGE) {
                const eHp = healths.get(nearestEnemyId);
                if (eHp) {
                    // Boats do more damage
                    eHp.current -= 2.0;
                }
            }
        }
    }
}
