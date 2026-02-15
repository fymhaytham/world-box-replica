import { TILE } from '../../constants.js';
import {
    FIRE_DAMAGE_PER_TICK,
    EXPLOSION_FIRE_CHANCE,
    EXPLOSION_MAX_DAMAGE,
    DEFAULT_EXPLOSION_RADIUS,
} from '../../balance.js';

/**
 * EnvironmentSystem — fire/lava damage, sheep explosions, and cloud/lightning.
 */

// ─── Fire Damage System (Burn & Explode) ────────────────
export function fireDamageSystem(entities, world) {
    const { positions, healths, renders } = entities;

    for (const [id, pos] of positions) {
        const hp = healths.get(id);
        if (!hp || hp.current <= 0) continue;

        const tx = Math.floor(pos.x);
        const ty = Math.floor(pos.y);
        const tile = world.get(tx, ty);

        if (tile === TILE.FIRE || tile === TILE.LAVA) {
            hp.current -= FIRE_DAMAGE_PER_TICK;

            // Sheep (grazers) explode on fire contact
            if (entities.grazers.has(id)) {
                hp.current = 0;
                explode(world, entities, pos.x, pos.y, DEFAULT_EXPLOSION_RADIUS);
            }
        }
    }
}

// ─── Explosion Helper ───────────────────────────────────
export function explode(world, entities, cx, cy, radius) {
    const rSq = radius * radius;
    const startX = Math.floor(cx - radius);
    const endX = Math.floor(cx + radius);
    const startY = Math.floor(cy - radius);
    const endY = Math.floor(cy + radius);

    // 1. Terrain Damage
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy <= rSq) {
                if (Math.random() < EXPLOSION_FIRE_CHANCE) {
                    world.set(x, y, TILE.FIRE);
                } else {
                    world.set(x, y, TILE.SAND);
                }
            }
        }
    }

    // 2. Entity Damage
    for (const [id, pos] of entities.positions) {
        const hp = entities.healths.get(id);
        if (!hp || hp.current <= 0) continue;

        const dx = pos.x - cx;
        const dy = pos.y - cy;
        const distSq = dx * dx + dy * dy;

        if (distSq <= rSq) {
            const damage = EXPLOSION_MAX_DAMAGE * (1 - distSq / rSq);
            hp.current -= damage;
        }
    }
}

// ─── Cloud System (Thunderstorm / Lightning) ────────────
export function cloudSystem(entities, world) {
    for (const [id, cloud] of entities.clouds) {
        const pos = entities.positions.get(id);
        if (!pos) continue;

        cloud.timer--;

        // Lightning strike logic
        if (cloud.timer <= 0) {
            // Randomize timer: 2-3 seconds -> 40 to 60 ticks (at 20 TPS)
            cloud.timer = 40 + Math.floor(Math.random() * 21);
            cloud.lightningDuration = 5;

            // Strike EXACTLY at the cloud's center
            const strikeX = Math.floor(pos.x);
            const strikeY = Math.floor(pos.y);
            const tile = world.get(strikeX, strikeY);

            // 1. Terrain Effects: Lightning sets flammable tiles on fire
            if (tile === TILE.GRASS || tile === TILE.FOREST) {
                world.set(strikeX, strikeY, TILE.FIRE);
            }

            // 2. Entity Damage: 50% Max HP to entities near strike
            const damageRadiusSq = 2.5 * 2.5; // Damage radius ~2.5 tiles

            for (const [eid, ePos] of entities.positions) {
                const hp = entities.healths.get(eid);
                // Skip self (cloud), dead entities, or entities without health
                if (eid === id || !hp || hp.current <= 0) continue;

                const dx = ePos.x - strikeX;
                const dy = ePos.y - strikeY;
                const distSq = dx * dx + dy * dy;

                if (distSq <= damageRadiusSq) {
                    // Deal exactly 50% of MAX health as damage
                    const damage = hp.max * 0.50;
                    hp.current -= damage;

                    // Visual feedback (flash red if we had that system, but hp bar will show it)
                }
            }
        }

        // Decrement lightning visual duration
        if (cloud.lightningDuration > 0) {
            cloud.lightningDuration--;
        }

        // 3. Cloud Movement & Despawn Logic
        // Despawn
        cloud.despawnTimer--;
        if (cloud.despawnTimer <= 0) {
            entities.destroy(id);
            continue;
        }

        // Movement
        cloud.moveTimer--;
        if (cloud.moveTimer <= 0) {
            // Pick new random direction every 2-4 seconds
            cloud.moveTimer = 40 + Math.floor(Math.random() * 41);
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.05; // Slow drift
            cloud.dx = Math.cos(angle) * speed;
            cloud.dy = Math.sin(angle) * speed;
        }

        // Apply movement (ignore terrain, bounce off world edges)
        pos.x += cloud.dx;
        pos.y += cloud.dy;

        // Bounce / Clamp
        if (pos.x < 0 || pos.x >= world.w) {
            cloud.dx = -cloud.dx;
            pos.x = Math.max(0, Math.min(world.w - 0.1, pos.x));
        }
        if (pos.y < 0 || pos.y >= world.h) {
            cloud.dy = -cloud.dy;
            pos.y = Math.max(0, Math.min(world.h - 0.1, pos.y));
        }
    }
}

// ─── Nuke System ────────────────────────────────────────
export function nukeSystem(entities, world) {
    if (!entities.nukes) return;

    for (const [id, nuke] of entities.nukes) {
        nuke.timer--;

        // Blink effect (visual feedback)
        const render = entities.renders.get(id);
        if (render) {
            if (nuke.timer % 10 < 5) {
                render.color = '#00FF00'; // Bright green flash
            } else {
                render.color = '#006400'; // Dark green
            }
        }

        if (nuke.timer <= 0) {
            const pos = entities.positions.get(id);
            if (pos) {
                nukeExplode(world, entities, pos.x, pos.y);
            }
            entities.destroy(id);
        }
    }
}

function nukeExplode(world, entities, cx, cy) {
    const radius = 30;
    const rSq = radius * radius;
    const startX = Math.floor(Math.max(0, cx - radius));
    const endX = Math.floor(Math.min(world.w - 1, cx + radius));
    const startY = Math.floor(Math.max(0, cy - radius));
    const endY = Math.floor(Math.min(world.h - 1, cy + radius));

    // 1. Terrain Damage
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy <= rSq) {
                // Massive destruction: Center turns to lava/fire, edges to sand
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 15) {
                    world.set(x, y, TILE.LAVA);
                } else if (dist < 30) {
                    world.set(x, y, TILE.FIRE);
                } else {
                    world.set(x, y, TILE.SAND);
                }
            }
        }
    }

    // 2. Entity Damage
    for (const [id, pos] of entities.positions) {
        const hp = entities.healths.get(id);
        if (!hp || hp.current <= 0) continue;

        const dx = pos.x - cx;
        const dy = pos.y - cy;
        const distSq = dx * dx + dy * dy;

        if (distSq <= rSq) {
            // Deal 75% max HP damage
            const damage = hp.max * 0.75;
            hp.current -= damage;
        }
    }
}
