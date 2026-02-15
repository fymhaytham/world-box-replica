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
