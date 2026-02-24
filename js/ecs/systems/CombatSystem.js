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
import { Pathfinding } from '../../utils/Pathfinding.js';

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
            if (f.type !== 'human') continue;
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
            const path = entities.paths.get(zId);
            const dist = Math.sqrt(minDistSq);

            if (path) {
                const needsRecalc = path.targetId !== targetId || path.recalcTimer <= 0 || (path.points.length === 0 && dist > 1);
                if (needsRecalc) {
                    path.targetId = targetId;
                    path.recalcTimer = 40 + Math.random() * 20;
                    const newPoints = Pathfinding.findPath(zPos.x, zPos.y, hPos.x, hPos.y, world, 400);
                    if (newPoints) {
                        path.points = newPoints;
                    } else {
                        path.points = [];
                        if (zVel) { zVel.vx = 0; zVel.vy = 0; }
                    }
                } else {
                    path.recalcTimer--;
                }
            }

            // Attack
            if (dist < ZOMBIE_ATTACK_RANGE) {
                const hHp = entities.healths.get(targetId);
                if (hHp) {
                    hHp.current -= ZOMBIE_ATTACK_DAMAGE;
                }
            }
        } else {
            const path = entities.paths.get(zId);
            if (path) { path.points = []; path.targetId = null; }
        }
    }
}

// ─── Human Zombie Response System ───────────────────────
export function humanZombieResponseSystem(entities, world) {
    for (const [hId, f] of entities.factions) {
        if (f.type !== 'human') continue;

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

            const isAggressive = personality.value <= 2; // 1=Warmongering, 2=Irritable

            if (isAggressive) {
                // FIGHT — Move towards
                const path = entities.paths.get(hId);
                if (path) {
                    const needsRecalc = path.targetId !== nearestZombieId || path.recalcTimer <= 0 || (path.points.length === 0 && dist > 1);
                    if (needsRecalc) {
                        path.targetId = nearestZombieId;
                        path.recalcTimer = 40 + Math.random() * 20;
                        const newPoints = Pathfinding.findPath(hPos.x, hPos.y, zPos.x, zPos.y, world, 400);
                        if (newPoints) {
                            path.points = newPoints;
                        } else {
                            path.points = [];
                            if (hVel) { hVel.vx = 0; hVel.vy = 0; }
                        }
                    } else {
                        path.recalcTimer--;
                    }
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
export function boatBehaviorSystem(entities, world, kingdomManager) {
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
            const path = entities.paths.get(id);
            const dist = Math.sqrt(minDistSq);

            if (path) {
                const needsRecalc = path.targetId !== nearestEnemyId || path.recalcTimer <= 0 || (path.points.length === 0 && dist > 2);
                if (needsRecalc) {
                    path.targetId = nearestEnemyId;
                    path.recalcTimer = 50 + Math.random() * 30;
                    const newPoints = Pathfinding.findPath(pos.x, pos.y, ePos.x, ePos.y, world, 600, true);
                    // Note: Ideally we pass the actual world object. If not available on entities, we need to pass it.
                    if (newPoints) {
                        path.points = newPoints;
                    } else {
                        path.points = [];
                        if (vel) { vel.vx = 0; vel.vy = 0; }
                    }
                } else {
                    path.recalcTimer--;
                }
            }

            // Attack
            if (dist < ATTACK_RANGE) {
                const eHp = healths.get(nearestEnemyId);
                if (eHp) {
                    // Boats do more damage
                    eHp.current -= 2.0;
                }
            }
        } else {
            const path = entities.paths.get(id);
            if (path) { path.points = []; path.targetId = null; }
        }
    }
}
