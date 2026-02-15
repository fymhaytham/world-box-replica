import { describe, it, expect, beforeEach } from 'vitest';
import { MockWorld } from './helpers/MockWorld.js';
import { TILE, CHUNK_SIZE, CHUNKS_X, CHUNKS_Y } from '../js/constants.js';

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
            world.set(16, 16, TILE.FIRE);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    world.set(16 + dx, 16 + dy, TILE.GRASS);
                }
            }

            let spreadFound = false;
            for (let tick = 0; tick < 1000 && !spreadFound; tick++) {
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
                if (world.get(16, 16) !== TILE.FIRE) {
                    world.set(16, 16, TILE.FIRE);
                }
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
            expect(world.get(17, 16)).toBe(TILE.WATER);
        });
    });

    // ─── Fire Decay ─────────────────────────────────────
    describe('Fire Decay', () => {
        it('fire decays to dirt over time', () => {
            world.set(16, 16, TILE.FIRE);
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

        it('should NOT spread infinitely (regression test)', () => {
            // Create a large grassy world
            const largeWorld = new MockWorld(64, 64, TILE.GRASS);
            // Start a small fire in the center
            largeWorld.set(32, 32, TILE.FIRE);

            let maxFireCount = 0;
            let finalFireCount = 0;

            // Run simulation for a significant time
            for (let tick = 0; tick < 500; tick++) {
                stepAutomata(largeWorld, cm);

                // Count fires
                let currentFires = 0;
                for (let i = 0; i < 64 * 64; i++) {
                    if (largeWorld.data[i] === TILE.FIRE) currentFires++;
                }
                if (currentFires > maxFireCount) maxFireCount = currentFires;
                finalFireCount = currentFires;
            }
            // With new constants, fire should be contained
            expect(finalFireCount).toBeLessThan(100);
            expect(finalFireCount).toBeLessThan(maxFireCount * 0.8 || 10);
        });
    });

    // ─── Grass Growth ───────────────────────────────────
    describe('Grass Growth', () => {
        it('dirt adjacent to grass can grow grass', () => {
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
