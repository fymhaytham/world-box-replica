import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../js/ecs/EntityManager.js';
import { spawnHuman, spawnZombie } from '../js/ecs/EntityFactory.js';
import { zombieBehaviorSystem, humanZombieResponseSystem } from '../js/ecs/systems/CombatSystem.js';
import { pathfollowingSystem } from '../js/ecs/systems/PathfollowingSystem.js';
import { MockWorld } from './helpers/MockWorld.js';
import { TILE } from '../js/constants.js';

describe('CombatSystem', () => {
    let em, world;

    beforeEach(() => {
        em = new EntityManager();
        world = new MockWorld(64, 64, TILE.GRASS);
    });

    // ─── zombieBehaviorSystem ───────────────────────────
    describe('zombieBehaviorSystem()', () => {
        it('zombie moves toward nearest human', () => {
            const zId = spawnZombie(em, 10, 10);
            const hId = spawnHuman(em, 15, 10);
            // Set faction name for human (EntityFactory uses 'type' but combat uses 'name')
            em.factions.get(hId).name = 'human';

            const zPosBefore = { ...em.positions.get(zId) };

            zombieBehaviorSystem(em, world);
            pathfollowingSystem(em, world);

            const zVel = em.velocities.get(zId);
            // Zombie should move rightward (toward human at x=15)
            expect(zVel.vx).toBeGreaterThan(0);
        });

        it('zombie attacks human when in range', () => {
            const zId = spawnZombie(em, 10, 10);
            const hId = spawnHuman(em, 10.5, 10); // Very close
            em.factions.get(hId).name = 'human';

            const hpBefore = em.healths.get(hId).current;

            zombieBehaviorSystem(em, world);

            expect(em.healths.get(hId).current).toBeLessThan(hpBefore);
        });

        it('zombie ignores sheep (non-human)', () => {
            const zId = spawnZombie(em, 10, 10);
            // Create entity with sheep faction
            const sId = em._create();
            em.positions.set(sId, { x: 11, y: 10 });
            em.factions.set(sId, { name: 'sheep' });
            em.healths.set(sId, { current: 60, max: 60 });

            zombieBehaviorSystem(em, world);

            // Sheep should not take damage
            expect(em.healths.get(sId).current).toBe(60);
        });

        it('zombie idles when no humans exist', () => {
            const zId = spawnZombie(em, 10, 10);

            // Should not throw
            expect(() => zombieBehaviorSystem(em, world)).not.toThrow();
        });
    });

    // ─── humanZombieResponseSystem ──────────────────────
    describe('humanZombieResponseSystem()', () => {
        it('aggressive human moves toward zombie', () => {
            const hId = spawnHuman(em, 10, 10);
            em.factions.get(hId).name = 'human';
            // Set aggressive personality (value <= 2)
            em.personalities.set(hId, { value: 1 });

            const zId = spawnZombie(em, 15, 10);

            humanZombieResponseSystem(em, world);
            pathfollowingSystem(em, world);

            const hVel = em.velocities.get(hId);
            // Should move rightward toward zombie
            expect(hVel.vx).toBeGreaterThan(0);
        });

        it('peaceful human flees from zombie', () => {
            const hId = spawnHuman(em, 10, 10);
            em.factions.get(hId).name = 'human';
            // Set peaceful personality (value >= 4)
            em.personalities.set(hId, { value: 5 });

            const zId = spawnZombie(em, 12, 10);

            humanZombieResponseSystem(em, world);

            const hVel = em.velocities.get(hId);
            // Should move leftward away from zombie
            expect(hVel.vx).toBeLessThan(0);
        });

        it('aggressive human attacks zombie in melee range', () => {
            const hId = spawnHuman(em, 10, 10);
            em.factions.get(hId).name = 'human';
            em.personalities.set(hId, { value: 1 });

            const zId = spawnZombie(em, 10.3, 10); // Very close

            const zHpBefore = em.healths.get(zId).current;

            humanZombieResponseSystem(em, world);

            expect(em.healths.get(zId).current).toBeLessThan(zHpBefore);
        });

        it('human without personality is skipped', () => {
            const hId = spawnHuman(em, 10, 10);
            em.factions.get(hId).name = 'human';
            em.personalities.delete(hId); // remove personality

            const zId = spawnZombie(em, 12, 10);

            // Should not throw
            expect(() => humanZombieResponseSystem(em, world)).not.toThrow();
        });
    });
});
