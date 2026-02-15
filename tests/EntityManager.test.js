import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../js/ecs/EntityManager.js';

describe('EntityManager', () => {
    let em;

    beforeEach(() => {
        em = new EntityManager();
    });

    describe('_create()', () => {
        it('returns incrementing IDs starting from 1', () => {
            expect(em._create()).toBe(1);
            expect(em._create()).toBe(2);
            expect(em._create()).toBe(3);
        });
    });

    describe('destroy()', () => {
        it('removes entity from all component maps', () => {
            const id = em._create();
            em.positions.set(id, { x: 5, y: 5 });
            em.velocities.set(id, { vx: 1, vy: 0 });
            em.healths.set(id, { current: 100, max: 100 });
            em.hungers.set(id, { value: 0, rate: 0.05, max: 100 });
            em.renders.set(id, { color: '#FFD700', size: 0.8 });
            em.wanders.set(id, { timer: 0, interval: 30 });
            em.factions.set(id, { type: 'human' });
            em.grazers.set(id, { eating: false });
            em.personalities.set(id, { value: 3 });
            em.zombies.set(id, true);
            em.clouds.set(id, { timer: 0 });

            em.destroy(id);

            expect(em.positions.has(id)).toBe(false);
            expect(em.velocities.has(id)).toBe(false);
            expect(em.healths.has(id)).toBe(false);
            expect(em.hungers.has(id)).toBe(false);
            expect(em.renders.has(id)).toBe(false);
            expect(em.wanders.has(id)).toBe(false);
            expect(em.factions.has(id)).toBe(false);
            expect(em.grazers.has(id)).toBe(false);
            expect(em.personalities.has(id)).toBe(false);
            expect(em.zombies.has(id)).toBe(false);
            expect(em.clouds.has(id)).toBe(false);
        });

        it('does not affect other entities', () => {
            const id1 = em._create();
            const id2 = em._create();
            em.positions.set(id1, { x: 0, y: 0 });
            em.positions.set(id2, { x: 5, y: 5 });

            em.destroy(id1);

            expect(em.positions.has(id1)).toBe(false);
            expect(em.positions.has(id2)).toBe(true);
        });
    });

    describe('clear()', () => {
        it('empties all component maps and resets ID counter', () => {
            const id = em._create();
            em.positions.set(id, { x: 1, y: 1 });
            em.healths.set(id, { current: 50, max: 50 });

            em.clear();

            expect(em.positions.size).toBe(0);
            expect(em.healths.size).toBe(0);
            // After clear, IDs restart from 1
            expect(em._create()).toBe(1);
        });
    });

    describe('component pools', () => {
        it('has all expected component maps initialized as empty', () => {
            const pools = [
                'positions', 'velocities', 'healths', 'hungers',
                'renders', 'wanders', 'factions', 'grazers',
                'personalities', 'zombies', 'clouds',
            ];
            for (const pool of pools) {
                expect(em[pool]).toBeInstanceOf(Map);
                expect(em[pool].size).toBe(0);
            }
        });
    });
});
