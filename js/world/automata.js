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

// ─── Grass Growth (Random Tick Optimization) ────────────
// Instead of scanning the whole world, we pick N random tiles per chunk.
// This scales O(Chunks * N) instead of O(WorldWidth * WorldHeight).
const TICKS_PER_CHUNK = 3;

export function stepGrassGrowth(world, chunkManager) {
    // Only process active chunks (visible or near player)
    // If you want global growth, iterate all chunks. For now, let's do all chunks
    // as it's much cheaper than full scan.
    for (let cy = 0; cy < CHUNKS_Y; cy++) {
        for (let cx = 0; cx < CHUNKS_X; cx++) {
            // Optimization: Skip chunks that are insanely far or totally empty if we had that flag
            // For now, simple random tick per chunk.

            const x0 = cx * CHUNK_SIZE;
            const y0 = cy * CHUNK_SIZE;

            for (let i = 0; i < TICKS_PER_CHUNK; i++) {
                // Pick random tile in chunk
                const dx = (Math.random() * CHUNK_SIZE) | 0;
                const dy = (Math.random() * CHUNK_SIZE) | 0;
                const x = x0 + dx;
                const y = y0 + dy;

                if (world.get(x, y) !== TILE.DIRT) continue;

                // Check 4 neighbours for Grass/Forest
                // If found, small chance to grow
                const n1 = world.get(x - 1, y);
                const n2 = world.get(x + 1, y);
                const n3 = world.get(x, y - 1);
                const n4 = world.get(x, y + 1);

                if (isSpreader(n1) || isSpreader(n2) || isSpreader(n3) || isSpreader(n4)) {
                    // Higher chance because we check fewer tiles
                    if (Math.random() < 0.3) {
                        world.set(x, y, TILE.GRASS);
                    }
                }
            }
        }
    }
}

function isSpreader(t) {
    return t === TILE.GRASS || t === TILE.FOREST;
}
