import {
    WANDER_SPEED,
    SEPARATION_DIST,
    REPULSION_FORCE,
    VELOCITY_DAMPING,
} from '../../balance.js';

/**
 * MovementSystem — wander AI and physics-based movement with grid collision.
 */

// ─── Wander System ──────────────────────────────────────
// warTargeting: optional Set<entityId> — entities currently chasing war targets
export function wanderSystem(positions, velocities, wanders, warTargeting) {
    for (const [id, w] of wanders) {
        // Skip units that are actively targeting an enemy or on a boat
        if ((warTargeting && warTargeting.has(id)) || positions.isPassenger && positions.isPassenger(id)) continue;

        w.timer--;
        if (w.timer <= 0) {
            w.timer = w.interval + Math.floor(Math.random() * 20);
            const angle = Math.random() * Math.PI * 2;
            w.dirX = Math.cos(angle);
            w.dirY = Math.sin(angle);
        }
        const vel = velocities.get(id);
        if (vel) {
            vel.vx = w.dirX * WANDER_SPEED;
            vel.vy = w.dirY * WANDER_SPEED;
        }
    }
}

// ─── Movement + Grid Collision (top-down AABB) ──────────
export function movementSystem(positions, velocities, world) {
    // 1. Soft Collision (Boids Separation)
    const ids = [...positions.keys()];

    for (let i = 0; i < ids.length; i++) {
        const idA = ids[i];
        const posA = positions.get(idA);
        const velA = velocities.get(idA);
        if (!posA || !velA || positions.isPassenger(idA)) continue;

        for (let j = i + 1; j < ids.length; j++) {
            const idB = ids[j];
            if (positions.isPassenger(idB)) continue;
            const posB = positions.get(idB);
            if (!posB) continue;

            const dx = posA.x - posB.x;
            const dy = posA.y - posB.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < SEPARATION_DIST * SEPARATION_DIST && distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                const pushX = (dx / dist) * REPULSION_FORCE;
                const pushY = (dy / dist) * REPULSION_FORCE;

                velA.vx += pushX;
                velA.vy += pushY;

                const velB = velocities.get(idB);
                if (velB) {
                    velB.vx -= pushX;
                    velB.vy -= pushY;
                }
            }
        }
    }

    // 2. Apply Velocity & Grid Collision
    for (const [id, pos] of positions) {
        if (positions.isPassenger(id)) continue;
        const vel = velocities.get(id);
        if (!vel) continue;

        const isBoat = positions.isBoat(id);
        const canPass = (gx, gy) => isBoat ? world.isSailable(gx, gy) : world.isWalkable(gx, gy);

        // Try X axis
        const nextX = pos.x + vel.vx;
        const gx = Math.floor(nextX);
        const gy = Math.floor(pos.y);
        if (canPass(gx, gy)) {
            pos.x = nextX;
        } else {
            vel.vx = 0;
        }

        // Try Y axis
        const nextY = pos.y + vel.vy;
        const gx2 = Math.floor(pos.x);
        const gy2 = Math.floor(nextY);
        if (canPass(gx2, gy2)) {
            pos.y = nextY;
        } else {
            vel.vy = 0;
        }

        // Clamp to world bounds
        pos.x = Math.max(0, Math.min(world.w - 1, pos.x));
        pos.y = Math.max(0, Math.min(world.h - 1, pos.y));

        // Damping
        vel.vx *= VELOCITY_DAMPING;
        vel.vy *= VELOCITY_DAMPING;
    }
}

// ─── Boat Systems ───────────────────────────────────────

export function boatSystem(entities) {
    const { positions, velocities, boats, passengerOf } = entities;

    for (const [boatId, boat] of boats) {
        const bPos = positions.get(boatId);
        const bVel = velocities.get(boatId);
        if (!bPos || !bVel) continue;

        // Boat speed adjustment based on size
        let speedMult = 1.0;
        if (boat.size === 'small') speedMult = 1.4;
        if (boat.size === 'large') speedMult = 0.7;

        // Scale velocity by size
        bVel.vx *= speedMult;
        bVel.vy *= speedMult;

        // Sync passengers
        for (const pId of boat.passengers) {
            const pPos = positions.get(pId);
            if (pPos) {
                pPos.x = bPos.x;
                pPos.y = bPos.y;
            }
        }
    }
}

export function boardingSystem(entities, membership) {
    const { positions, boats, passengerOf } = entities;

    const BOARD_DIST = 1.5;
    const DISEMBARK_DIST = 2.0;

    for (const [boatId, boat] of boats) {
        const bPos = positions.get(boatId);
        if (!bPos) continue;

        // 1. Boarding logic
        if (boat.passengers.size < boat.capacity) {
            for (const [pId, pPos] of positions) {
                // Already on a boat?
                if (passengerOf.has(pId)) continue;
                // Not a boat itself?
                if (boats.has(pId)) continue;
                // Same kingdom?
                if (membership.get(pId) !== boat.kingdomId) continue;

                const dist = Math.hypot(bPos.x - pPos.x, bPos.y - pPos.y);
                if (dist < BOARD_DIST) {
                    boat.passengers.add(pId);
                    passengerOf.set(pId, boatId);
                    // Reset unit velocity
                    const pVel = entities.velocities.get(pId);
                    if (pVel) { pVel.vx = 0; pVel.vy = 0; }
                }
            }
        }

        // 2. Disembark logic (simplified: if boat is near land and has passengers, maybe drop some off?)
        // For now, let's keep them on the boat until we have specific destination logic.
    }
}
