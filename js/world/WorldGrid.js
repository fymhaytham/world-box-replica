import { WORLD_W, WORLD_H, TILE, TILE_WALKABLE, TILE_DYNAMIC, CHUNK_SIZE } from '../constants.js';

/**
 * Top-down tile map — flat Uint8Array.
 * Each cell stores a terrain TILE id.
 */
export class WorldGrid {
    constructor(chunkManager) {
        this.w = WORLD_W;
        this.h = WORLD_H;
        this.data = new Uint8Array(WORLD_W * WORLD_H);
        this.chunkManager = chunkManager;

        // Procedural noise seed per tile for visual variation
        this.noise = new Uint8Array(WORLD_W * WORLD_H);
        for (let i = 0; i < this.noise.length; i++) {
            this.noise[i] = Math.random() * 255 | 0;
        }

        // Start with empty ocean — user creates their own world
        this.fillWater();
    }

    /** Reset the entire world to deep water */
    fillWater() {
        this.data.fill(TILE.WATER_DEEP);
        this._markAllChunksDirty();
    }

    // ─── Procedural generation ────────────────────────────

    /** Generate the default procedural island */
    generateIsland() {
        const cx = this.w / 2;
        const cy = this.h / 2;

        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                const dx = (x - cx) / cx;
                const dy = (y - cy) / cy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const n = this._simplex(x * 0.05, y * 0.05);
                const elevation = 1.0 - dist * 1.1 + n * 0.3;

                let tile;
                if (elevation < 0.15) tile = TILE.WATER_DEEP;
                else if (elevation < 0.28) tile = TILE.WATER;
                else if (elevation < 0.35) tile = TILE.SAND;
                else if (elevation < 0.55) tile = TILE.GRASS;
                else if (elevation < 0.72) tile = TILE.FOREST;
                else if (elevation < 0.85) tile = TILE.STONE;
                else tile = TILE.SNOW;

                this.data[y * this.w + x] = tile;
            }
        }
        this._markAllChunksDirty();
    }

    _markAllChunksDirty() {
        if (this.chunkManager) {
            for (let cy = 0; cy < this.h / CHUNK_SIZE; cy++) {
                for (let cx = 0; cx < this.w / CHUNK_SIZE; cx++) {
                    this.chunkManager.markDirty(cx, cy);
                }
            }
        }
    }

    /**
     * Very simple value-noise (not true simplex, but good enough for terrain shape).
     */
    _simplex(x, y) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;
        const a = this._hash(ix, iy);
        const b = this._hash(ix + 1, iy);
        const c = this._hash(ix, iy + 1);
        const d = this._hash(ix + 1, iy + 1);
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
    }

    _hash(x, y) {
        let h = (x * 374761393 + y * 668265263 + 1013904223) | 0;
        h = ((h >> 13) ^ h) * 1274126177;
        h = ((h >> 16) ^ h);
        return (h & 0x7fffffff) / 0x7fffffff;
    }

    // ─── Helpers ────────────────────────────────────────────

    inBounds(x, y) {
        return x >= 0 && x < this.w && y >= 0 && y < this.h;
    }

    idx(x, y) {
        return y * this.w + x;
    }

    // ─── Read / Write ──────────────────────────────────────

    get(x, y) {
        if (!this.inBounds(x, y)) return TILE.WATER_DEEP; // out-of-bounds = ocean
        return this.data[this.idx(x, y)];
    }

    set(x, y, tileId) {
        if (!this.inBounds(x, y)) return;
        this.data[this.idx(x, y)] = tileId;

        if (this.chunkManager) {
            const cx = (x / CHUNK_SIZE) | 0;
            const cy = (y / CHUNK_SIZE) | 0;
            this.chunkManager.markDirty(cx, cy);
            if (TILE_DYNAMIC[tileId]) {
                this.chunkManager.markActive(cx, cy);
            }
        }
    }

    isWalkable(x, y) {
        return TILE_WALKABLE[this.get(x, y)] ?? false;
    }

    isDynamic(x, y) {
        return TILE_DYNAMIC[this.get(x, y)] ?? false;
    }

    isSailable(x, y) {
        const tile = this.get(x, y);
        return tile === TILE.WATER || tile === TILE.WATER_DEEP;
    }

    /**
     * Get the visual noise value for a tile (0-255) for color variation.
     */
    getNoise(x, y) {
        if (!this.inBounds(x, y)) return 0;
        return this.noise[this.idx(x, y)];
    }
}
