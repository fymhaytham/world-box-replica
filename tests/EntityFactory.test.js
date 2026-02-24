import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../js/ecs/EntityManager.js';
import { spawnHuman, spawnSheep, spawnZombie, spawnCloud } from '../js/ecs/EntityFactory.js';

describe('EntityFactory', () => {
    let em;

    beforeEach(() => {
        em = new EntityManager();
    });

    describe('spawnHuman()', () => {
        it('returns an entity ID', () => {
            const id = spawnHuman(em, 10, 20);
            expect(id).toBeGreaterThan(0);
        });

        it('attaches position offset by +0.5', () => {
            const id = spawnHuman(em, 10, 20);
            const pos = em.positions.get(id);
            expect(pos.x).toBe(10.5);
            expect(pos.y).toBe(20.5);
        });

        it('attaches velocity, health, hunger, render, wander, faction, personality', () => {
            const id = spawnHuman(em, 0, 0);
            expect(em.velocities.has(id)).toBe(true);
            expect(em.healths.get(id).max).toBe(100);
            expect(em.hungers.has(id)).toBe(true);
            expect(em.renders.has(id)).toBe(true);
            expect(em.wanders.has(id)).toBe(true);
            expect(em.factions.get(id).type).toBe('human');
            expect(em.personalities.has(id)).toBe(true);
        });

        it('does NOT have zombie or grazer components', () => {
            const id = spawnHuman(em, 0, 0);
            expect(em.zombies.has(id)).toBe(false);
            expect(em.grazers.has(id)).toBe(false);
        });
    });

    describe('spawnZombie()', () => {
        it('returns an entity ID', () => {
            const id = spawnZombie(em, 5, 5);
            expect(id).toBeGreaterThan(0);
        });

        it('has zombie flag set to true', () => {
            const id = spawnZombie(em, 5, 5);
            expect(em.zombies.get(id)).toBe(true);
        });

        it('has 60 HP', () => {
            const id = spawnZombie(em, 5, 5);
            expect(em.healths.get(id).max).toBe(60);
        });

        it('does NOT have hunger or faction', () => {
            const id = spawnZombie(em, 5, 5);
            expect(em.hungers.has(id)).toBe(false);
            expect(em.factions.has(id)).toBe(false);
        });

        it('has wander component with longer interval', () => {
            const id = spawnZombie(em, 5, 5);
            const w = em.wanders.get(id);
            expect(w.interval).toBe(80);
        });
    });

    describe('spawnSheep()', () => {
        it('returns an entity ID', () => {
            const id = spawnSheep(em, 3, 3);
            expect(id).toBeGreaterThan(0);
        });

        it('has sheep faction and grazer component', () => {
            const id = spawnSheep(em, 3, 3);
            expect(em.factions.get(id).type).toBe('sheep');
            expect(em.grazers.has(id)).toBe(true);
        });

        it('has 60 HP', () => {
            const id = spawnSheep(em, 3, 3);
            expect(em.healths.get(id).max).toBe(60);
        });

        it('has faster hunger rate than humans', () => {
            const humanId = spawnHuman(em, 0, 0);
            const sheepId = spawnSheep(em, 1, 1);
            expect(em.hungers.get(sheepId).rate).toBeGreaterThan(em.hungers.get(humanId).rate);
        });
    });

    describe('spawnCloud()', () => {
        it('returns an entity ID', () => {
            const id = spawnCloud(em, 8, 8);
            expect(id).toBeGreaterThan(0);
        });

        it('has cloud component', () => {
            const id = spawnCloud(em, 8, 8);
            expect(em.clouds.has(id)).toBe(true);
        });

        it('has slow rightward drift velocity', () => {
            const id = spawnCloud(em, 8, 8);
            const vel = em.velocities.get(id);
            expect(vel.vx).toBe(0.02);
            expect(vel.vy).toBe(0);
        });

        it('has large render size', () => {
            const id = spawnCloud(em, 8, 8);
            expect(em.renders.get(id).size).toBe(1.2);
        });
    });

    describe('multiple spawns produce unique IDs', () => {
        it('spawning different types generates unique IDs', () => {
            const ids = new Set();
            ids.add(spawnHuman(em, 0, 0));
            ids.add(spawnSheep(em, 1, 1));
            ids.add(spawnZombie(em, 2, 2));
            ids.add(spawnCloud(em, 3, 3));
            expect(ids.size).toBe(4);
        });
    });
});
