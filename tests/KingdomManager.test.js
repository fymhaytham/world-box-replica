import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../js/ecs/EntityManager.js';
import { spawnHuman } from '../js/ecs/EntityFactory.js';
import { KingdomManager } from '../js/ecs/KingdomManager.js';
import { MockWorld } from './helpers/MockWorld.js';
import { TILE } from '../js/constants.js';

describe('KingdomManager', () => {
    let em, km, world;

    beforeEach(() => {
        em = new EntityManager();
        km = new KingdomManager();
        world = new MockWorld(64, 64, TILE.GRASS);
    });

    // ─── Kingdom Lifecycle ──────────────────────────────
    describe('createKingdom()', () => {
        it('creates a kingdom with correct properties', () => {
            const id = spawnHuman(em, 10, 10);
            const pos = em.positions.get(id);
            const k = km.createKingdom('TestKingdom', id, pos);

            expect(k.id).toBe(1);
            expect(k.name).toBe('TestKingdom');
            expect(k.color).toBeTruthy();
            expect(k.leaderId).toBe(id);
            expect(k.members.has(id)).toBe(true);
            expect(k.strength).toBe(1);
        });
    });

    describe('joinKingdom()', () => {
        it('adds entity to kingdom and increases strength', () => {
            const leaderId = spawnHuman(em, 10, 10);
            const k = km.createKingdom('TestK', leaderId, em.positions.get(leaderId));

            const memberId = spawnHuman(em, 12, 12);
            km.joinKingdom(memberId, k.id);

            expect(k.members.has(memberId)).toBe(true);
            expect(k.strength).toBe(2);
            expect(km.membership.get(memberId)).toBe(k.id);
        });

        it('leaves old kingdom when joining new one', () => {
            const l1 = spawnHuman(em, 10, 10);
            const k1 = km.createKingdom('K1', l1, em.positions.get(l1));

            const l2 = spawnHuman(em, 20, 20);
            const k2 = km.createKingdom('K2', l2, em.positions.get(l2));

            const memberId = spawnHuman(em, 15, 15);
            km.joinKingdom(memberId, k1.id);
            expect(k1.members.has(memberId)).toBe(true);

            km.joinKingdom(memberId, k2.id);
            expect(k1.members.has(memberId)).toBe(false);
            expect(k2.members.has(memberId)).toBe(true);
        });
    });

    describe('leaveKingdom()', () => {
        it('removes entity from kingdom', () => {
            const leaderId = spawnHuman(em, 10, 10);
            const k = km.createKingdom('TestK', leaderId, em.positions.get(leaderId));

            const memberId = spawnHuman(em, 12, 12);
            km.joinKingdom(memberId, k.id);

            km.leaveKingdom(memberId);

            expect(k.members.has(memberId)).toBe(false);
            expect(k.strength).toBe(1); // only leader remains
            expect(km.membership.has(memberId)).toBe(false);
        });

        it('dissolves kingdom when last member leaves', () => {
            const leaderId = spawnHuman(em, 10, 10);
            const k = km.createKingdom('TestK', leaderId, em.positions.get(leaderId));
            const kId = k.id;

            km.leaveKingdom(leaderId);

            expect(km.kingdoms.has(kId)).toBe(false);
        });
    });

    describe('getKingdom()', () => {
        it('returns kingdom for member', () => {
            const id = spawnHuman(em, 10, 10);
            const k = km.createKingdom('TestK', id, em.positions.get(id));

            expect(km.getKingdom(id)).toBe(k);
        });

        it('returns null for non-member', () => {
            const id = spawnHuman(em, 10, 10);
            expect(km.getKingdom(id)).toBeNull();
        });
    });

    // ─── War System ─────────────────────────────────────
    describe('war declaration and peace', () => {
        it('declares war between two kingdoms', () => {
            const l1 = spawnHuman(em, 10, 10);
            const k1 = km.createKingdom('K1', l1, em.positions.get(l1));

            const l2 = spawnHuman(em, 20, 20);
            const k2 = km.createKingdom('K2', l2, em.positions.get(l2));

            km.declareWar(k1.id, k2.id);

            expect(km.areAtWar(k1.id, k2.id)).toBe(true);
            expect(km.areAtWar(k2.id, k1.id)).toBe(true); // symmetric
        });

        it('kingdom is not at war with itself', () => {
            const l = spawnHuman(em, 10, 10);
            const k = km.createKingdom('K', l, em.positions.get(l));

            expect(km.areAtWar(k.id, k.id)).toBe(false);
        });

        it('makes peace', () => {
            const l1 = spawnHuman(em, 10, 10);
            const k1 = km.createKingdom('K1', l1, em.positions.get(l1));

            const l2 = spawnHuman(em, 20, 20);
            const k2 = km.createKingdom('K2', l2, em.positions.get(l2));

            km.declareWar(k1.id, k2.id);
            km.makePeace(k1.id, k2.id);

            expect(km.areAtWar(k1.id, k2.id)).toBe(false);
        });
    });

    // ─── Kingdom Color ──────────────────────────────────
    describe('getKingdomColor()', () => {
        it('returns color for entity in kingdom', () => {
            const id = spawnHuman(em, 10, 10);
            const k = km.createKingdom('TestK', id, em.positions.get(id));

            expect(km.getKingdomColor(id)).toBe(k.color);
        });

        it('returns null for entity without kingdom', () => {
            const id = spawnHuman(em, 10, 10);
            expect(km.getKingdomColor(id)).toBeNull();
        });
    });

    // ─── Clear ──────────────────────────────────────────
    describe('clear()', () => {
        it('resets all kingdom state', () => {
            const id = spawnHuman(em, 10, 10);
            km.createKingdom('TestK', id, em.positions.get(id));

            km.clear();

            expect(km.kingdoms.size).toBe(0);
            expect(km.membership.size).toBe(0);
            expect(km.wars.size).toBe(0);
        });
    });

    // ─── Name Generation ────────────────────────────────
    describe('_generateName()', () => {
        it('produces unique names', () => {
            const names = new Set();
            for (let i = 0; i < 20; i++) {
                names.add(km._generateName());
            }
            expect(names.size).toBe(20);
        });
    });

    // ─── update() integration ───────────────────────────
    describe('update()', () => {
        it('returns a Set (warTargeting) and doesnt throw', () => {
            // Spawn a few humans
            for (let i = 0; i < 5; i++) {
                spawnHuman(em, 10 + i, 10);
            }

            const result = km.update(em, world, 1);
            // Should return a Set (may be empty)
            expect(result).toBeInstanceOf(Set);
        });
    });
});
