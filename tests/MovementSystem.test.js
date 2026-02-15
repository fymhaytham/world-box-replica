import { describe, it, expect, beforeEach } from 'vitest';
import { wanderSystem, movementSystem } from '../js/ecs/systems/MovementSystem.js';
import { MockWorld } from './helpers/MockWorld.js';
import { TILE } from '../js/constants.js';
import { VELOCITY_DAMPING } from '../js/balance.js';

describe('MovementSystem', () => {
    let positions, velocities, wanders, world;

    beforeEach(() => {
        positions = new Map();
        velocities = new Map();
        wanders = new Map();
        world = new MockWorld(32, 32, TILE.GRASS); // all walkable
    });

    // ─── wanderSystem ───────────────────────────────────
    describe('wanderSystem()', () => {
        it('sets velocity when wander timer expires', () => {
            positions.set(1, { x: 10, y: 10 });
            velocities.set(1, { vx: 0, vy: 0 });
            wanders.set(1, { timer: 0, interval: 30, dirX: 0, dirY: 0 });

            wanderSystem(positions, velocities, wanders, null);

            const vel = velocities.get(1);
            // After timer expires, velocity should be non-zero (direction is random)
            expect(vel.vx !== 0 || vel.vy !== 0).toBe(true);
        });

        it('decrements wander timer each tick', () => {
            wanders.set(1, { timer: 5, interval: 30, dirX: 1, dirY: 0 });
            velocities.set(1, { vx: 0, vy: 0 });

            wanderSystem(positions, velocities, wanders, null);

            expect(wanders.get(1).timer).toBe(4);
        });

        it('skips entities in the warTargeting set', () => {
            positions.set(1, { x: 10, y: 10 });
            velocities.set(1, { vx: 0, vy: 0 });
            wanders.set(1, { timer: 0, interval: 30, dirX: 0, dirY: 0 });

            const warTargeting = new Set([1]);
            wanderSystem(positions, velocities, wanders, warTargeting);

            // Velocity should remain 0 — wander was skipped
            const vel = velocities.get(1);
            expect(vel.vx).toBe(0);
            expect(vel.vy).toBe(0);
        });
    });

    // ─── movementSystem ─────────────────────────────────
    describe('movementSystem()', () => {
        it('applies velocity to position on walkable tiles', () => {
            positions.set(1, { x: 10, y: 10 });
            velocities.set(1, { vx: 1, vy: 0.5 });

            movementSystem(positions, velocities, world);

            const pos = positions.get(1);
            // Position should have moved (approximately, due to damping)
            expect(pos.x).toBeGreaterThan(10);
            expect(pos.y).toBeGreaterThan(10);
        });

        it('stops entity at unwalkable tiles (water)', () => {
            // Place entity next to water
            positions.set(1, { x: 1.5, y: 1.5 });
            velocities.set(1, { vx: -5, vy: 0 }); // moving left into water

            // Set tile (0, 1) to water (unwalkable)
            world.set(0, 1, TILE.WATER);

            movementSystem(positions, velocities, world);

            const pos = positions.get(1);
            const vel = velocities.get(1);
            // X should not have moved past the water tile
            expect(pos.x).toBeGreaterThanOrEqual(1);
            expect(vel.vx).toBe(0); // velocity zeroed on collision
        });

        it('clamps position to world bounds', () => {
            positions.set(1, { x: 0.5, y: 0.5 });
            velocities.set(1, { vx: -10, vy: -10 }); // large negative velocity

            movementSystem(positions, velocities, world);

            const pos = positions.get(1);
            expect(pos.x).toBeGreaterThanOrEqual(0);
            expect(pos.y).toBeGreaterThanOrEqual(0);
        });

        it('applies velocity damping each tick', () => {
            positions.set(1, { x: 15, y: 15 });
            velocities.set(1, { vx: 1.0, vy: 1.0 });

            movementSystem(positions, velocities, world);

            const vel = velocities.get(1);
            expect(vel.vx).toBeCloseTo(1.0 * VELOCITY_DAMPING, 5);
            expect(vel.vy).toBeCloseTo(1.0 * VELOCITY_DAMPING, 5);
        });

        it('applies boids separation when two entities overlap', () => {
            positions.set(1, { x: 10.0, y: 10.0 });
            positions.set(2, { x: 10.1, y: 10.0 }); // very close
            velocities.set(1, { vx: 0, vy: 0 });
            velocities.set(2, { vx: 0, vy: 0 });

            movementSystem(positions, velocities, world);

            const vel1 = velocities.get(1);
            const vel2 = velocities.get(2);
            // They should be pushed apart — entity 1 pushed left, entity 2 pushed right
            expect(vel1.vx).toBeLessThan(0);
            expect(vel2.vx).toBeGreaterThan(0);
        });
    });
});
