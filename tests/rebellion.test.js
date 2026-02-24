import { describe, it, expect, vi } from 'vitest';
import { KingdomManager } from '../js/ecs/KingdomManager.js';
import { EntityManager } from '../js/ecs/EntityManager.js';

describe('Kingdom Rebellion', () => {
    it('should split a kingdom when a peaceful king has an aggressive majority', () => {
        const mockNotifications = { show: vi.fn() };
        const km = new KingdomManager(mockNotifications);
        const em = new EntityManager();

        // 1. Create a peaceful king (personality 5)
        const kingId = em._create();
        em.positions.set(kingId, { x: 50, y: 50 });
        em.personalities.set(kingId, { value: 5 });
        em.factions.set(kingId, { type: 'human' });

        const k = km.createKingdom("Peaceful Realm", kingId, { x: 50, y: 50 });

        // 2. Add 6 aggressive citizens (personality 1)
        for (let i = 0; i < 6; i++) {
            const id = em._create();
            em.positions.set(id, { x: 51 + i, y: 50 });
            em.personalities.set(id, { value: 1 });
            em.factions.set(id, { type: 'human' });
            km.joinKingdom(id, k.id);
        }

        // Total pop: 7. Aggressive: 6 (85%). King: 5 (Peaceful).
        // Trigger rebellion
        km._rebellionSystem(em);

        // Check if a new kingdom was created
        expect(km.kingdoms.size).toBe(2);

        // Find the new kingdom
        const newKid = [...km.kingdoms.keys()].find(id => id !== k.id);
        const newK = km.kingdoms.get(newKid);

        expect(newK).toBeDefined();
        expect(newK.members.size).toBe(6);
        expect(k.members.size).toBe(1); // Only the king left
        expect(mockNotifications.show).toHaveBeenCalledWith(expect.stringContaining('REBELLION'), 'warning');
    });

    it('should split a kingdom when an aggressive king has a peaceful majority', () => {
        const mockNotifications = { show: vi.fn() };
        const km = new KingdomManager(mockNotifications);
        const em = new EntityManager();

        // 1. Create an aggressive king (personality 1)
        const kingId = em._create();
        em.positions.set(kingId, { x: 50, y: 50 });
        em.personalities.set(kingId, { value: 1 });
        em.factions.set(kingId, { type: 'human' });

        const k = km.createKingdom("Warrior Realm", kingId, { x: 50, y: 50 });

        // 2. Add 6 peaceful citizens (personality 5)
        for (let i = 0; i < 6; i++) {
            const id = em._create();
            em.positions.set(id, { x: 51 + i, y: 50 });
            em.personalities.set(id, { value: 5 });
            em.factions.set(id, { type: 'human' });
            km.joinKingdom(id, k.id);
        }

        // Total pop: 7. Peaceful: 6. King: 1 (Aggressive).
        km._rebellionSystem(em);

        expect(km.kingdoms.size).toBe(2);
        const newKid = [...km.kingdoms.keys()].find(id => id !== k.id);
        expect(km.kingdoms.get(newKid).members.size).toBe(6);
    });

    it('should NOT split when personalities match', () => {
        const mockNotifications = { show: vi.fn() };
        const km = new KingdomManager(mockNotifications);
        const em = new EntityManager();

        // 1. Aggressive king (1)
        const kingId = em._create();
        em.positions.set(kingId, { x: 50, y: 50 });
        em.personalities.set(kingId, { value: 1 });
        em.factions.set(kingId, { type: 'human' });

        const k = km.createKingdom("Warrior Realm", kingId, { x: 50, y: 50 });

        // 2. Aggressive citizens (2)
        for (let i = 0; i < 6; i++) {
            const id = em._create();
            em.positions.set(id, { x: 51 + i, y: 50 });
            em.personalities.set(id, { value: 2 });
            em.factions.set(id, { type: 'human' });
            km.joinKingdom(id, k.id);
        }

        km._rebellionSystem(em);

        // Should still be only 1 kingdom
        expect(km.kingdoms.size).toBe(1);
    });
});
