import { TILE } from '../../constants.js';
import {
    STARVATION_DAMAGE,
    GRAZING_HUNGER_RESTORE,
} from '../../balance.js';

/**
 * MetabolismSystem — hunger accumulation, starvation, and grazing.
 */

// ─── Hunger System ──────────────────────────────────────
export function hungerSystem(hungers, healths) {
    for (const [id, h] of hungers) {
        h.value = Math.min(h.max, h.value + h.rate);
        if (h.value >= h.max) {
            const hp = healths.get(id);
            if (hp) hp.current = Math.max(0, hp.current - STARVATION_DAMAGE);
        }
    }
}

// ─── Grazing System (Sheep eat grass → dirt) ────────────
export function grazingSystem(positions, hungers, grazers, world) {
    for (const [id, _grazer] of grazers) {
        const pos = positions.get(id);
        const hunger = hungers.get(id);
        if (!pos || !hunger) continue;

        const tx = Math.floor(pos.x);
        const ty = Math.floor(pos.y);
        if (world.get(tx, ty) === TILE.GRASS) {
            world.set(tx, ty, TILE.DIRT);
            hunger.value = Math.max(0, hunger.value - GRAZING_HUNGER_RESTORE);
        }
    }
}
