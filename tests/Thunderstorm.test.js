import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../js/ecs/EntityManager.js';
import { spawnCloud, spawnHuman } from '../js/ecs/EntityFactory.js';
import { cloudSystem } from '../js/ecs/systems/EnvironmentSystem.js';
import { MockWorld } from './helpers/MockWorld.js';
import { TILE } from '../js/constants.js';

describe('Thunderstorm Power', () => {
    let em, world;

    beforeEach(() => {
        em = new EntityManager();
        world = new MockWorld(64, 64, TILE.GRASS);
    });

    it('should spawn cloud with correct components', () => {
        const id = spawnCloud(em, 10, 10);

        expect(em.clouds.has(id)).toBe(true);
        expect(em.positions.has(id)).toBe(true);
        expect(em.renders.has(id)).toBe(true);
        expect(em.velocities.has(id)).toBe(true);

        // Check size (should be small now)
        expect(em.renders.get(id).size).toBe(1.2);
    });

    it('should strike lightning at exact cloud position', () => {
        const id = spawnCloud(em, 20, 20);
        const cloud = em.clouds.get(id);

        // Fast forward timer to 1
        cloud.timer = 1;

        cloudSystem(em, world);

        // Check that the tile AT 20,20 is now FIRE (since world is GRASS)
        expect(world.get(20, 20)).toBe(TILE.FIRE);

        // Neighboring tiles should NOT be fire (exact targeting)
        expect(world.get(21, 20)).toBe(TILE.GRASS);
    });

    it('should damage entities by 50% max HP', () => {
        const cloudId = spawnCloud(em, 15, 15);
        const humanId = spawnHuman(em, 15, 15); // Human at exact same spot
        const cloud = em.clouds.get(cloudId);

        const initialHp = em.healths.get(humanId).max;
        expect(em.healths.get(humanId).current).toBe(initialHp);

        // Trigger lightning
        cloud.timer = 1;
        cloudSystem(em, world);

        const afterHp = em.healths.get(humanId).current;
        expect(afterHp).toBe(initialHp * 0.5);
    });

    it('should kill entity after two strikes', () => {
        const cloudId = spawnCloud(em, 15, 15);
        const humanId = spawnHuman(em, 15, 15);
        const cloud = em.clouds.get(cloudId);

        // 1st Strike
        cloud.timer = 1;
        cloudSystem(em, world);
        expect(em.healths.get(humanId).current).toBe(50);

        // 2nd Strike
        cloud.timer = 1;
        cloudSystem(em, world);
        expect(em.healths.get(humanId).current).toBe(0);
    });

    it('should reset timer after strike', () => {
        const id = spawnCloud(em, 10, 10);
        const cloud = em.clouds.get(id);

        cloud.timer = 1;
        cloudSystem(em, world);

        expect(cloud.timer).toBeGreaterThan(39);
        expect(cloud.timer).toBeLessThan(62);
    });

    it('should despawn after 30 seconds (600 ticks)', () => {
        const id = spawnCloud(em, 10, 10);
        const cloud = em.clouds.get(id);

        // Fast forward to near death
        cloud.despawnTimer = 1;

        cloudSystem(em, world);

        // Entity should be gone
        expect(em.positions.has(id)).toBe(false);
        expect(em.clouds.has(id)).toBe(false);
    });

    it('should move randomly over time', () => {
        const id = spawnCloud(em, 10, 10);
        const cloud = em.clouds.get(id);
        const pos = em.positions.get(id);

        // Force a movement update
        cloud.moveTimer = 0;

        cloudSystem(em, world);

        // Should have picked a direction and moved
        expect(cloud.dx).not.toBe(0);
        expect(cloud.dy).not.toBe(0);
        expect(pos.x).not.toBe(10 + 0.5); // Initial pos was 10.5
        expect(pos.y).not.toBe(10 + 0.5);
    });
});
