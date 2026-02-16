import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../js/ecs/EntityManager.js';
import { KingdomManager } from '../js/ecs/KingdomManager.js';
import { spawnHuman } from '../js/ecs/EntityFactory.js';
import { MockWorld } from './helpers/MockWorld.js';
import { TILE } from '../js/constants.js';

describe('KingdomManager - Resources & Development', () => {
    let em, km, world;

    beforeEach(() => {
        em = new EntityManager();
        km = new KingdomManager();
        world = new MockWorld(64, 64, TILE.GRASS);
    });

    it('initializes kingdom with resources and basic modifiers', () => {
        const id = spawnHuman(em, 10, 10);
        const k = km.createKingdom('TestKingdom', id, em.positions.get(id));

        expect(k.resources).toEqual({
            food: 0,
            wood: 0,
            stone: 0,
            science: 0,
        });
        expect(k.techs.size).toBe(0);
        expect(k.modifiers.farmingRate).toBe(1);
        expect(k.modifiers.miningRate).toBe(0);
    });

    it('gathers resources based on terrain', () => {
        const id = spawnHuman(em, 10, 10);
        const k = km.createKingdom('TestKingdom', id, em.positions.get(id));

        // Set tile to Forest (Wood + Food)
        world.set(10, 10, TILE.FOREST);

        // Run gathering system directly or via update
        // We can access private method if we want, or run update 20 times.
        // Let's run update 20 times to trigger the timer (starts at 0, triggers at >= 20)
        for (let i = 0; i < 20; i++) {
            km.update(em, world, i);
        }

        // Expected: 
        // Wood: 1 per tick * 1 tick = 1
        // Science: 0.5 + (1 member * 0.1) = 0.6
        // Food: 0.2 gathered. BUT distribution consumes 1.0. 0.2 < 1.0 => 0.
        expect(k.resources.wood).toBe(1);
        expect(k.resources.food).toBe(0);
        expect(k.resources.science).toBeCloseTo(0.6);
    });

    it('gathers food from grass (farming)', () => {
        const id = spawnHuman(em, 10, 10);
        const k = km.createKingdom('FarmingKingdom', id, em.positions.get(id));

        // Give initial food to prevent starvation resetting to 0
        k.resources.food = 10;

        // Tile is Grass by default in MockWorld constructor
        // Run update 20 times
        for (let i = 0; i < 20; i++) {
            km.update(em, world, i);
        }

        // Expected:
        // Start: 10
        // Gather: +0.5 * farmingRate(1) = 0.5 -> 10.5
        // Consume: -1.0 -> 9.5
        expect(k.resources.food).toBeCloseTo(9.5);
    });

    it('distributes food and reduces hunger', () => {
        const id = spawnHuman(em, 10, 10);
        const k = km.createKingdom('RichKingdom', id, em.positions.get(id));

        // Give food
        k.resources.food = 100;

        // Make unit hungry
        const hunger = em.hungers.get(id);
        hunger.value = 50; // moderately hungry

        // Run update to trigger distribution (tick 20)
        for (let i = 0; i < 20; i++) {
            km.update(em, world, i);
        }

        // Gather (Grass): +0.5 -> 100.5
        // Consumption: -1.0 -> 99.5
        expect(k.resources.food).toBeCloseTo(99.5);
        // Hunger reduction: -2
        expect(hunger.value).toBe(48);
    });

    it('unlocks technology when resources are sufficient', () => {
        const id = spawnHuman(em, 10, 10);
        const k = km.createKingdom('TechKingdom', id, em.positions.get(id));

        // Cost for Stone Tools: science: 50
        k.resources.science = 60;

        // Run update to trigger progression
        for (let i = 0; i < 20; i++) {
            km.update(em, world, i);
        }

        // Passive science gain: +0.6 -> 60.6
        // Cost: -50 -> 10.6

        expect(k.techs.has('stone_tools')).toBe(true);
        expect(k.resources.science).toBeCloseTo(10.6);
        expect(k.modifiers.miningRate).toBeGreaterThan(0);
    });

    it('applies unlocked tech bonuses (e.g. mining)', () => {
        const id = spawnHuman(em, 10, 10);
        const k = km.createKingdom('MinerKingdom', id, em.positions.get(id));

        // Manually unlock stone_tools
        k.modifiers.miningRate = 1;
        k.techs.add('stone_tools');

        // Place on Stone
        world.set(10, 10, TILE.STONE);

        // Run update
        for (let i = 0; i < 20; i++) {
            km.update(em, world, i);
        }

        // Mining rate 1 -> 1 stone per tick
        expect(k.resources.stone).toBe(1);
    });
});
