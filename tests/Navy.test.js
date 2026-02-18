import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../js/ecs/EntityManager.js';
import { KingdomManager } from '../js/ecs/KingdomManager.js';
import { WorldGrid } from '../js/world/WorldGrid.js';
import { spawnHuman, spawnBoat } from '../js/ecs/EntityFactory.js';
import { boatSystem, boardingSystem } from '../js/ecs/systems/MovementSystem.js';

describe('Navy System', () => {
    let entities, kingdoms, world;

    beforeEach(() => {
        entities = new EntityManager();
        kingdoms = new KingdomManager();
        world = new WorldGrid();
        world.generateIsland();
    });

    it('should calculate kingdom level correctly', () => {
        const k = kingdoms.createKingdom('Test', 1, { x: 0, y: 0 });
        expect(kingdoms.getLevel(k)).toBe(1);

        k.techs.add('tech1');
        k.techs.add('tech2');
        expect(kingdoms.getLevel(k)).toBe(2);

        k.techs.add('tech3');
        k.techs.add('tech4');
        k.techs.add('tech5');
        k.techs.add('tech6');
        expect(kingdoms.getLevel(k)).toBe(4);
    });

    it('should spawn boats when level 4 is reached and sailing is researched', () => {
        // Clear world and set a specific coast
        world.data.fill(0); // WATER_DEEP
        world.set(10, 10, 4); // GRASS at 10,10
        world.set(11, 10, 1); // WATER at 11,10 - this is a coast

        const hId = spawnHuman(entities, 10, 10);
        const k = kingdoms.createKingdom('NavyNation', hId, { x: 10, y: 10 });

        k.modifiers.canSail = true;
        for (let i = 0; i < 6; i++) k.techs.add(`tech${i}`);
        k.resources.wood = 1000;
        k.navyTimer = 0;

        // Run navy system multiple times
        for (let i = 0; i < 200; i++) {
            kingdoms._navySystem(entities, world);
            if (entities.boats.size > 0) break;
        }

        expect(entities.boats.size).toBeGreaterThan(0);
    });

    it('should allow units to board boats of the same kingdom', () => {
        const boatId = spawnBoat(entities, 20, 20, 'medium', 'travel', 1);
        const hId = spawnHuman(entities, 20.5, 20.5);
        const membership = new Map([[hId, 1]]);

        boardingSystem(entities, membership);

        const boat = entities.boats.get(boatId);
        expect(boat.passengers.has(hId)).toBe(true);
        expect(entities.passengerOf.get(hId)).toBe(boatId);
    });

    it('should sync passenger positions with the boat', () => {
        const boatId = spawnBoat(entities, 20, 20, 'medium', 'travel', 1);
        const hId = spawnHuman(entities, 20, 20);
        const boat = entities.boats.get(boatId);
        boat.passengers.add(hId);
        entities.passengerOf.set(hId, boatId);

        // Move boat
        entities.positions.get(boatId).x = 25;
        entities.positions.get(boatId).y = 25;

        boatSystem(entities);

        const pPos = entities.positions.get(hId);
        expect(pPos.x).toBe(25);
        expect(pPos.y).toBe(25);
    });
});
