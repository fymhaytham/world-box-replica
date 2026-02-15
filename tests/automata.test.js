import { describe, it, expect, beforeEach } from 'vitest';
import { MockWorld } from './helpers/MockWorld.js';
import { TILE, CHUNK_SIZE, CHUNKS_X, CHUNKS_Y } from '../js/constants.js';

/**
 * We test the automata logic by importing stepAutomata and stepGrassGrowth.
 * Both need a chunkManager that implements isActive(), refreshActive(), markDirty().
 */

// Minimal ChunkManager mock — all chunks active
class MockChunkManager {
    isActive() { return true; }
    refreshActive() { }
    markDirty() { }
    markActive() { }
}

// Import after mocks are defined
import { stepAutomata, stepGrassGrowth } from '../js/world/automata.js';

describe('Automata', () => {
    let world, cm;

    beforeEach(() => {
        world = new MockWorld(32, 32, TILE.DIRT); // start all dirt
        cm = new MockChunkManager();
    });

    // ─── Fire Spread ────────────────────────────────────
    describe('Fire Spread', () => {
        it('fire can spread to adjacent grass', () => {
            // Create a fire tile surrounded by grass
            world.set(16, 16, TILE.FIRE);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    world.set(16 + dx, 16 + dy, TILE.GRASS);
                }
            }

            // Run many ticks — fire should spread at least once (stochastic)
            let spreadFound = false;
            for (let tick = 0; tick < 200 && !spreadFound; tick++) {
                // Reset grass around each tick to test each independently
                // Actually, let it accumulate
                stepAutomata(world, cm);

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        if (world.get(16 + dx, 16 + dy) === TILE.FIRE) {
                            spreadFound = true;
                        }
                    }
                }
            }

            expect(spreadFound).toBe(true);
        });

        it('fire can spread to adjacent forest', () => {
            world.set(16, 16, TILE.FIRE);
            world.set(17, 16, TILE.FOREST);

            let spreadFound = false;
            for (let tick = 0; tick < 500 && !spreadFound; tick++) {
                // Re-seed fire if it decayed before spreading
                if (world.get(16, 16) !== TILE.FIRE) {
                    world.set(16, 16, TILE.FIRE);
                }
                // Re-seed forest if it already caught fire from a previous spread
                // (we just need to detect at least one spread event)
                stepAutomata(world, cm);
                if (world.get(17, 16) === TILE.FIRE) spreadFound = true;
            }

            expect(spreadFound).toBe(true);
        });

        it('fire does NOT spread to water', () => {
            world.set(16, 16, TILE.FIRE);
            world.set(17, 16, TILE.WATER);

            for (let tick = 0; tick < 100; tick++) {
                stepAutomata(world, cm);
            }

            // Water should never become fire
            expect(world.get(17, 16)).toBe(TILE.WATER);
        });
    });

    // ─── Fire Decay ─────────────────────────────────────
    describe('Fire Decay', () => {
        it('fire decays to dirt over time', () => {
            world.set(16, 16, TILE.FIRE);
            // Surround with non-flammable so it can't re-ignite
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    world.set(16 + dx, 16 + dy, TILE.SAND);
                }
            }

            let decayed = false;
            for (let tick = 0; tick < 200 && !decayed; tick++) {
                stepAutomata(world, cm);
                if (world.get(16, 16) === TILE.DIRT) decayed = true;
            }

            expect(decayed).toBe(true);
        });
    });

    // ─── Grass Growth ───────────────────────────────────
    describe('Grass Growth', () => {
        it('dirt adjacent to grass can grow into grass', () => {
            // Use a small world so random ticks hit our target tile often
            const smallWorld = new MockWorld(16, 16, TILE.SAND);
            smallWorld.set(8, 8, TILE.GRASS);
            smallWorld.set(9, 8, TILE.DIRT);

            let grew = false;
            for (let tick = 0; tick < 2000 && !grew; tick++) {
                stepGrassGrowth(smallWorld, cm);
                if (smallWorld.get(9, 8) === TILE.GRASS) grew = true;
            }

            expect(grew).toBe(true);
        });

        it('dirt NOT adjacent to grass/forest stays dirt', () => {
            // Isolated dirt patch surrounded by sand
            world.set(16, 16, TILE.DIRT);
            world.set(15, 16, TILE.SAND);
            world.set(17, 16, TILE.SAND);
            world.set(16, 15, TILE.SAND);
            world.set(16, 17, TILE.SAND);

            for (let tick = 0; tick < 100; tick++) {
                stepGrassGrowth(world, cm);
            }

            expect(world.get(16, 16)).toBe(TILE.DIRT);
        });

        it('dirt adjacent to forest can also grow', () => {
            // Use a small world so random ticks in stepGrassGrowth hit our target tile often
            const smallWorld = new MockWorld(16, 16, TILE.SAND);
            smallWorld.set(8, 8, TILE.FOREST);
            smallWorld.set(9, 8, TILE.DIRT);

            let grew = false;
            for (let tick = 0; tick < 2000 && !grew; tick++) {
                stepGrassGrowth(smallWorld, cm);
                if (smallWorld.get(9, 8) === TILE.GRASS) grew = true;
            }

            expect(grew).toBe(true);
        });
    });
});
