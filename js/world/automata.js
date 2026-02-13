import { TILE, CHUNK_SIZE, CHUNKS_X, CHUNKS_Y } from '../constants.js';

/**
 * Top-down cellular automata — no gravity.
 * Fire spreads, grass grows, forest regrows.
 */
export function stepAutomata(world, chunkManager) {
    for (let cy = 0; cy < CHUNKS_Y; cy++) {
        for (let cx = 0; cx < CHUNKS_X; cx++) {
            if (!chunkManager.isActive(cx, cy)) continue;
            processChunk(world, chunkManager, cx, cy);
            chunkManager.refreshActive(cx, cy, world);
        }
    }
}

function processChunk(world, chunkManager, cx, cy) {
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;

    for (let dy = 0; dy < CHUNK_SIZE; dy++) {
        for (let dx = 0; dx < CHUNK_SIZE; dx++) {
            const x = x0 + dx;
            const y = y0 + dy;
            const tile = world.get(x, y);

            if (tile === TILE.FIRE) {
                stepFire(world, x, y);
            }
        }
    }
}

// ─── Fire (spreads to grass/forest, decays to dirt) ─────
const FIRE_SPREAD_CHANCE = 0.04;
const FIRE_DECAY_CHANCE = 0.06;

function stepFire(world, x, y) {
    const neighbours = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [dx, dy] of neighbours) {
        const n = world.get(x + dx, y + dy);
        if ((n === TILE.GRASS || n === TILE.FOREST) && Math.random() < FIRE_SPREAD_CHANCE) {
            world.set(x + dx, y + dy, TILE.FIRE);
        }
    }
    if (Math.random() < FIRE_DECAY_CHANCE) {
        world.set(x, y, TILE.DIRT);
    }
}

// ─── Grass Growth (spreads from grass onto adjacent dirt) ───
let grassTimer = 0;
const GRASS_INTERVAL = 5; // every 5 logic ticks

export function stepGrassGrowth(world, chunkManager) {
    grassTimer++;
    if (grassTimer < GRASS_INTERVAL) return;
    grassTimer = 0;

    for (let cy = 0; cy < CHUNKS_Y; cy++) {
        for (let cx = 0; cx < CHUNKS_X; cx++) {
            const x0 = cx * CHUNK_SIZE;
            const y0 = cy * CHUNK_SIZE;

            for (let dy = 0; dy < CHUNK_SIZE; dy++) {
                for (let dx = 0; dx < CHUNK_SIZE; dx++) {
                    const x = x0 + dx;
                    const y = y0 + dy;
                    if (world.get(x, y) !== TILE.DIRT) continue;

                    // Check if any neighbour is GRASS or FOREST
                    if (
                        world.get(x - 1, y) === TILE.GRASS ||
                        world.get(x + 1, y) === TILE.GRASS ||
                        world.get(x, y - 1) === TILE.GRASS ||
                        world.get(x, y + 1) === TILE.GRASS ||
                        world.get(x - 1, y) === TILE.FOREST ||
                        world.get(x + 1, y) === TILE.FOREST ||
                        world.get(x, y - 1) === TILE.FOREST ||
                        world.get(x, y + 1) === TILE.FOREST
                    ) {
                        if (Math.random() < 0.08) {
                            world.set(x, y, TILE.GRASS);
                        }
                    }
                }
            }
        }
    }
}
