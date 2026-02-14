import { TILE } from '../constants.js';

/**
 * ECS systems — top-down movement, no gravity.
 */

// ─── Wander System ──────────────────────────────────────
// warTargeting: optional Set<entityId> — entities currently chasing war targets
export function wanderSystem(positions, velocities, wanders, warTargeting) {
    for (const [id, w] of wanders) {
        // Skip units that are actively targeting an enemy
        if (warTargeting && warTargeting.has(id)) continue;

        w.timer--;
        if (w.timer <= 0) {
            w.timer = w.interval + Math.floor(Math.random() * 20);
            const angle = Math.random() * Math.PI * 2;
            w.dirX = Math.cos(angle);
            w.dirY = Math.sin(angle);
        }
        const vel = velocities.get(id);
        if (vel) {
            vel.vx = w.dirX * 0.25;
            vel.vy = w.dirY * 0.25;
        }
    }
}

// ─── Movement + Grid Collision (top-down AABB) ──────────
// ─── Movement + Grid Collision (top-down AABB) ──────────
export function movementSystem(positions, velocities, world) {
    // 1. Soft Collision (Boids Separation)
    // Naive O(N^2) check. For < 500 units this is fine.
    // If we have thousands, we'd need a spatial hash grid.
    const ids = [...positions.keys()]; // get all active entity IDs
    const SEPARATION_DIST = 0.5;
    const REPULSION_FORCE = 0.05;

    for (let i = 0; i < ids.length; i++) {
        const idA = ids[i];
        const posA = positions.get(idA);
        const velA = velocities.get(idA);
        if (!posA || !velA) continue;

        for (let j = i + 1; j < ids.length; j++) {
            const idB = ids[j];
            const posB = positions.get(idB);
            if (!posB) continue;

            const dx = posA.x - posB.x;
            const dy = posA.y - posB.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < SEPARATION_DIST * SEPARATION_DIST && distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                const pushX = (dx / dist) * REPULSION_FORCE;
                const pushY = (dy / dist) * REPULSION_FORCE;

                // Push A away
                velA.vx += pushX;
                velA.vy += pushY;

                // Push B opposite (Newton's 3rd law)
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
        const vel = velocities.get(id);
        if (!vel) continue;

        // Try X axis
        const nextX = pos.x + vel.vx;
        const gx = Math.floor(nextX);
        const gy = Math.floor(pos.y);
        if (world.isWalkable(gx, gy)) {
            pos.x = nextX;
        } else {
            vel.vx = 0;
        }

        // Try Y axis
        const nextY = pos.y + vel.vy;
        const gx2 = Math.floor(pos.x);
        const gy2 = Math.floor(nextY);
        if (world.isWalkable(gx2, gy2)) {
            pos.y = nextY;
        } else {
            vel.vy = 0;
        }

        // Clamp to world bounds
        pos.x = Math.max(0, Math.min(world.w - 1, pos.x));
        pos.y = Math.max(0, Math.min(world.h - 1, pos.y));

        // Damping (optional, stops infinite drift)
        vel.vx *= 0.9;
        vel.vy *= 0.9;
    }
}

// ─── Hunger System ──────────────────────────────────────
export function hungerSystem(hungers, healths) {
    for (const [id, h] of hungers) {
        h.value = Math.min(h.max, h.value + h.rate);
        if (h.value >= h.max) {
            const hp = healths.get(id);
            if (hp) hp.current = Math.max(0, hp.current - 0.5);
        }
    }
}

// ─── Grazing System (Sheep eat grass → dirt) ────────────
export function grazingSystem(positions, hungers, grazers, world) {
    for (const [id, _grazer] of grazers) {
        const pos = positions.get(id);
        const hunger = hungers.get(id);
        if (!pos || !hunger) continue;

        const tx = Math.floor(pos.x);
        const ty = Math.floor(pos.y);
        if (world.get(tx, ty) === TILE.GRASS) {
            world.set(tx, ty, TILE.DIRT);
            hunger.value = Math.max(0, hunger.value - 40);
        }
    }
}
