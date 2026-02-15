import { describe, it, expect } from 'vitest';
import {
    Position, Velocity, Health, Hunger, Render,
    Wander, Faction, Grazer, Personality, Cloud,
} from '../js/ecs/components/index.js';

describe('Component Factories', () => {

    // ─── Position ───────────────────────────────────────
    describe('Position', () => {
        it('returns default (0, 0)', () => {
            const p = Position();
            expect(p).toEqual({ x: 0, y: 0 });
        });

        it('accepts custom values', () => {
            const p = Position(5.5, 10.3);
            expect(p.x).toBe(5.5);
            expect(p.y).toBe(10.3);
        });
    });

    // ─── Velocity ───────────────────────────────────────
    describe('Velocity', () => {
        it('returns default (0, 0)', () => {
            const v = Velocity();
            expect(v).toEqual({ vx: 0, vy: 0 });
        });

        it('accepts custom values', () => {
            const v = Velocity(1.5, -2.0);
            expect(v.vx).toBe(1.5);
            expect(v.vy).toBe(-2.0);
        });
    });

    // ─── Health ─────────────────────────────────────────
    describe('Health', () => {
        it('defaults to 100 HP', () => {
            const h = Health();
            expect(h.current).toBe(100);
            expect(h.max).toBe(100);
        });

        it('sets current = max', () => {
            const h = Health(60);
            expect(h.current).toBe(60);
            expect(h.max).toBe(60);
        });
    });

    // ─── Hunger ─────────────────────────────────────────
    describe('Hunger', () => {
        it('starts at 0 value with default rate', () => {
            const h = Hunger();
            expect(h.value).toBe(0);
            expect(h.rate).toBe(0.05);
            expect(h.max).toBe(100);
        });

        it('accepts custom rate', () => {
            const h = Hunger(0.1);
            expect(h.rate).toBe(0.1);
        });
    });

    // ─── Render ─────────────────────────────────────────
    describe('Render', () => {
        it('has default gold color and size 0.8', () => {
            const r = Render();
            expect(r.color).toBe('#FFD700');
            expect(r.size).toBe(0.8);
        });

        it('accepts custom color and size', () => {
            const r = Render('🧟', 1.2);
            expect(r.color).toBe('🧟');
            expect(r.size).toBe(1.2);
        });
    });

    // ─── Wander ─────────────────────────────────────────
    describe('Wander', () => {
        it('initializes with timer 0 and direction 0,0', () => {
            const w = Wander();
            expect(w.timer).toBe(0);
            expect(w.interval).toBe(30);
            expect(w.dirX).toBe(0);
            expect(w.dirY).toBe(0);
        });

        it('accepts custom interval', () => {
            const w = Wander(60);
            expect(w.interval).toBe(60);
        });
    });

    // ─── Faction ────────────────────────────────────────
    describe('Faction', () => {
        it('defaults to human', () => {
            const f = Faction();
            expect(f.type).toBe('human');
        });

        it('accepts custom type', () => {
            const f = Faction('sheep');
            expect(f.type).toBe('sheep');
        });
    });

    // ─── Grazer ─────────────────────────────────────────
    describe('Grazer', () => {
        it('starts not eating', () => {
            const g = Grazer();
            expect(g.eating).toBe(false);
        });
    });

    // ─── Personality ────────────────────────────────────
    describe('Personality', () => {
        it('produces value between 1 and 5', () => {
            for (let i = 0; i < 100; i++) {
                const p = Personality();
                expect(p.value).toBeGreaterThanOrEqual(1);
                expect(p.value).toBeLessThanOrEqual(5);
            }
        });

        it('always has integer value', () => {
            for (let i = 0; i < 50; i++) {
                const p = Personality();
                expect(Number.isInteger(p.value)).toBe(true);
            }
        });
    });

    // ─── Cloud ──────────────────────────────────────────
    describe('Cloud', () => {
        it('starts with timer 0 and no lightning', () => {
            const c = Cloud();
            expect(c.timer).toBe(0);
            expect(c.lightningDuration).toBe(0);
        });
    });
});
