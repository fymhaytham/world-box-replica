import { TILE, TILE_WALKABLE } from '../../js/constants.js';

/**
 * MockWorld — lightweight world substitute for unit tests.
 * Provides get(), set(), isWalkable() without needing ChunkManager or noise.
 */
export class MockWorld {
    /**
     * @param {number} w — width (default 32)
     * @param {number} h — height (default 32)
     * @param {number} fillTile — default tile to fill with (default TILE.GRASS)
     */
    constructor(w = 32, h = 32, fillTile = TILE.GRASS) {
        this.w = w;
        this.h = h;
        this.data = new Uint8Array(w * h).fill(fillTile);
    }

    inBounds(x, y) {
        return x >= 0 && x < this.w && y >= 0 && y < this.h;
    }

    get(x, y) {
        if (!this.inBounds(x, y)) return TILE.WATER_DEEP;
        return this.data[y * this.w + x];
    }

    set(x, y, tileId) {
        if (!this.inBounds(x, y)) return;
        this.data[y * this.w + x] = tileId;
    }

    isWalkable(x, y) {
        return TILE_WALKABLE[this.get(x, y)] ?? false;
    }
}
