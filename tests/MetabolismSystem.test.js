import { describe, it, expect, beforeEach } from 'vitest';
import { hungerSystem, grazingSystem } from '../js/ecs/systems/MetabolismSystem.js';
import { MockWorld } from './helpers/MockWorld.js';
import { TILE } from '../js/constants.js';
import { STARVATION_DAMAGE, GRAZING_HUNGER_RESTORE } from '../js/balance.js';

describe('MetabolismSystem', () => {

    // ─── hungerSystem ───────────────────────────────────
    describe('hungerSystem()', () => {
        let hungers, healths;

        beforeEach(() => {
            hungers = new Map();
            healths = new Map();
        });

        it('increases hunger by the rate each tick', () => {
            hungers.set(1, { value: 0, rate: 0.05, max: 100 });
            healths.set(1, { current: 100, max: 100 });

            hungerSystem(hungers, healths);

            expect(hungers.get(1).value).toBeCloseTo(0.05, 5);
        });

        it('caps hunger at max', () => {
            hungers.set(1, { value: 99.99, rate: 1.0, max: 100 });
            healths.set(1, { current: 100, max: 100 });

            hungerSystem(hungers, healths);

            expect(hungers.get(1).value).toBe(100);
        });

        it('damages health when hunger reaches max', () => {
            hungers.set(1, { value: 100, rate: 0.05, max: 100 });
            healths.set(1, { current: 100, max: 100 });

            hungerSystem(hungers, healths);

            expect(healths.get(1).current).toBe(100 - STARVATION_DAMAGE);
        });

        it('does NOT damage health when hunger is below max', () => {
            hungers.set(1, { value: 50, rate: 0.05, max: 100 });
            healths.set(1, { current: 100, max: 100 });

            hungerSystem(hungers, healths);

            expect(healths.get(1).current).toBe(100);
        });

        it('health does not go below 0', () => {
            hungers.set(1, { value: 100, rate: 1, max: 100 });
            healths.set(1, { current: 0.1, max: 100 });

            hungerSystem(hungers, healths);

            expect(healths.get(1).current).toBeGreaterThanOrEqual(0);
        });
    });

    // ─── grazingSystem ──────────────────────────────────
    describe('grazingSystem()', () => {
        let positions, hungers, grazers, world;

        beforeEach(() => {
            positions = new Map();
            hungers = new Map();
            grazers = new Map();
            world = new MockWorld(32, 32, TILE.GRASS);
        });

        it('converts grass tile to dirt when sheep grazes', () => {
            positions.set(1, { x: 5.5, y: 5.5 });
            hungers.set(1, { value: 50, rate: 0.08, max: 100 });
            grazers.set(1, { eating: false });

            grazingSystem(positions, hungers, grazers, world);

            expect(world.get(5, 5)).toBe(TILE.DIRT);
        });

        it('reduces hunger by GRAZING_HUNGER_RESTORE', () => {
            positions.set(1, { x: 5.5, y: 5.5 });
            hungers.set(1, { value: 50, rate: 0.08, max: 100 });
            grazers.set(1, { eating: false });

            grazingSystem(positions, hungers, grazers, world);

            expect(hungers.get(1).value).toBe(50 - GRAZING_HUNGER_RESTORE);
        });

        it('hunger does not drop below 0', () => {
            positions.set(1, { x: 5.5, y: 5.5 });
            hungers.set(1, { value: 10, rate: 0.08, max: 100 });
            grazers.set(1, { eating: false });

            grazingSystem(positions, hungers, grazers, world);

            expect(hungers.get(1).value).toBe(0);
        });

        it('does NOT graze on non-grass tiles', () => {
            world.set(5, 5, TILE.SAND);
            positions.set(1, { x: 5.5, y: 5.5 });
            hungers.set(1, { value: 50, rate: 0.08, max: 100 });
            grazers.set(1, { eating: false });

            grazingSystem(positions, hungers, grazers, world);

            expect(world.get(5, 5)).toBe(TILE.SAND); // unchanged
            expect(hungers.get(1).value).toBe(50);    // unchanged
        });

        it('ignores entities without position or hunger', () => {
            grazers.set(1, { eating: false });
            // No position or hunger set

            // Should not throw
            expect(() => grazingSystem(positions, hungers, grazers, world)).not.toThrow();
        });
    });
});
