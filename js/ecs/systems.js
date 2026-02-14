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
export function movementSystem(positions, velocities, world) {
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
