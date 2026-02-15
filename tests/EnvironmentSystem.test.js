import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../js/ecs/EntityManager.js';
import { spawnHuman, spawnSheep } from '../js/ecs/EntityFactory.js';
import { fireDamageSystem, explode, cloudSystem } from '../js/ecs/systems/EnvironmentSystem.js';
import { MockWorld } from './helpers/MockWorld.js';
import { TILE } from '../js/constants.js';
import { FIRE_DAMAGE_PER_TICK, EXPLOSION_MAX_DAMAGE } from '../js/balance.js';

describe('EnvironmentSystem', () => {
    let em, world;

    beforeEach(() => {
        em = new EntityManager();
        world = new MockWorld(64, 64, TILE.GRASS);
    });

    // ─── fireDamageSystem ───────────────────────────────
    describe('fireDamageSystem()', () => {
        it('damages entity standing on fire tile', () => {
            const id = spawnHuman(em, 10, 10);
            world.set(10, 10, TILE.FIRE);

            const hpBefore = em.healths.get(id).current;
            fireDamageSystem(em, world);

            expect(em.healths.get(id).current).toBe(hpBefore - FIRE_DAMAGE_PER_TICK);
        });

        it('damages entity standing on lava tile', () => {
            const id = spawnHuman(em, 10, 10);
            world.set(10, 10, TILE.LAVA);

            const hpBefore = em.healths.get(id).current;
            fireDamageSystem(em, world);

            expect(em.healths.get(id).current).toBe(hpBefore - FIRE_DAMAGE_PER_TICK);
        });

        it('does NOT damage entity on grass tile', () => {
            const id = spawnHuman(em, 10, 10);
            // world is already grass

            const hpBefore = em.healths.get(id).current;
            fireDamageSystem(em, world);

            expect(em.healths.get(id).current).toBe(hpBefore);
        });

        it('sheep explodes on fire (HP set to 0)', () => {
            const id = spawnSheep(em, 10, 10);
            world.set(10, 10, TILE.FIRE);

            fireDamageSystem(em, world);

            expect(em.healths.get(id).current).toBe(0);
        });

        it('sheep explosion creates fire crater', () => {
            const id = spawnSheep(em, 10, 10);
            world.set(10, 10, TILE.FIRE);

            fireDamageSystem(em, world);

            // Check that nearby tiles have been modified (fire or sand)
            let changed = 0;
            for (let dy = -4; dy <= 4; dy++) {
                for (let dx = -4; dx <= 4; dx++) {
                    const tile = world.get(10 + dx, 10 + dy);
                    if (tile === TILE.FIRE || tile === TILE.SAND) changed++;
                }
            }
            expect(changed).toBeGreaterThan(5); // significant crater
        });

        it('skips dead entities (HP <= 0)', () => {
            const id = spawnHuman(em, 10, 10);
            em.healths.get(id).current = 0; // already dead
            world.set(10, 10, TILE.FIRE);

            // Should not throw or process further
            expect(() => fireDamageSystem(em, world)).not.toThrow();
        });
    });

    // ─── explode ────────────────────────────────────────
    describe('explode()', () => {
        it('creates fire and sand tiles in radius', () => {
            explode(world, em, 16, 16, 3);

            let fireCount = 0, sandCount = 0;
            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const tile = world.get(16 + dx, 16 + dy);
                    if (tile === TILE.FIRE) fireCount++;
                    if (tile === TILE.SAND) sandCount++;
                }
            }
            expect(fireCount + sandCount).toBeGreaterThan(0);
        });

        it('damages entities within radius', () => {
            const id = spawnHuman(em, 16, 16); // At center
            const hpBefore = em.healths.get(id).current;

            explode(world, em, 16, 16, 5);

            expect(em.healths.get(id).current).toBeLessThan(hpBefore);
        });

        it('damage falls off with distance from center', () => {
            const centerId = spawnHuman(em, 16, 16);    // at center
            const edgeId = spawnHuman(em, 19, 16);      // at edge (3 tiles away)

            explode(world, em, 16, 16, 5);

            const centerDamage = 100 - em.healths.get(centerId).current;
            const edgeDamage = 100 - em.healths.get(edgeId).current;
            expect(centerDamage).toBeGreaterThan(edgeDamage);
        });

        it('does NOT damage entities outside radius', () => {
            const id = spawnHuman(em, 30, 30); // far away

            explode(world, em, 10, 10, 3);

            expect(em.healths.get(id).current).toBe(100);
        });
    });

    // ─── cloudSystem ────────────────────────────────────
    describe('cloudSystem()', () => {
        it('decrements cloud timer', () => {
            const id = em._create();
            em.positions.set(id, { x: 16.5, y: 16.5 });
            em.clouds.set(id, { timer: 10, lightningDuration: 0 });

            cloudSystem(em, world);

            expect(em.clouds.get(id).timer).toBe(9);
        });

        it('strikes lightning when timer reaches 0', () => {
            const id = em._create();
            em.positions.set(id, { x: 16.5, y: 16.5 });
            em.clouds.set(id, { timer: 1, lightningDuration: 0 });

            cloudSystem(em, world);

            const cloud = em.clouds.get(id);
            // Timer should be reset to a positive value
            expect(cloud.timer).toBeGreaterThan(0);
            // Lightning visual should be active (set to 5 then decremented to 4 in same tick)
            expect(cloud.lightningDuration).toBe(4);
        });

        it('decrements lightningDuration', () => {
            const id = em._create();
            em.positions.set(id, { x: 16.5, y: 16.5 });
            em.clouds.set(id, { timer: 50, lightningDuration: 3 });

            cloudSystem(em, world);

            expect(em.clouds.get(id).lightningDuration).toBe(2);
        });

        it('lightning can set grass/forest tiles on fire', () => {
            // Run many times to get at least one fire (random position)
            let foundFire = false;
            for (let attempt = 0; attempt < 100 && !foundFire; attempt++) {
                const testWorld = new MockWorld(32, 32, TILE.GRASS);
                const testEm = new EntityManager();
                const id = testEm._create();
                testEm.positions.set(id, { x: 16.5, y: 16.5 });
                testEm.clouds.set(id, { timer: 1, lightningDuration: 0 });

                cloudSystem(testEm, testWorld);

                // Check area around cloud for fire
                for (let dy = -3; dy <= 3; dy++) {
                    for (let dx = -3; dx <= 3; dx++) {
                        if (testWorld.get(16 + dx, 16 + dy) === TILE.FIRE) {
                            foundFire = true;
                        }
                    }
                }
            }
            expect(foundFire).toBe(true);
        });
    });
});
