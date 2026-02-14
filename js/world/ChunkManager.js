import { CHUNKS_X, CHUNKS_Y, CHUNK_SIZE, TILE_SIZE, TILE_COLOR, TILE_COLOR_ALT, TILE_DYNAMIC } from '../constants.js';

/**
 * Manages 16×16 tile chunks for dirty-rect rendering
 * and active-pixel simulation culling. (Top-down view)
 */
export class ChunkManager {
    constructor() {
        this.chunksX = CHUNKS_X;
        this.chunksY = CHUNKS_Y;

        this.dirty = new Uint8Array(CHUNKS_X * CHUNKS_Y);
        this.active = new Uint8Array(CHUNKS_X * CHUNKS_Y);

        // Per-chunk offscreen canvases
        this.buffers = new Array(CHUNKS_X * CHUNKS_Y).fill(null);

        // All dirty on first frame
        this.dirty.fill(1);
    }

    idx(cx, cy) {
        return cy * this.chunksX + cx;
    }

    markDirty(cx, cy) {
        if (cx >= 0 && cx < this.chunksX && cy >= 0 && cy < this.chunksY) {
            this.dirty[this.idx(cx, cy)] = 1;
        }
    }

    markActive(cx, cy) {
        if (cx >= 0 && cx < this.chunksX && cy >= 0 && cy < this.chunksY) {
            this.active[this.idx(cx, cy)] = 1;
        }
    }

    isActive(cx, cy) {
        return this.active[this.idx(cx, cy)] === 1;
    }

    isDirty(cx, cy) {
        return this.dirty[this.idx(cx, cy)] === 1;
    }

    refreshActive(cx, cy, world) {
        const x0 = cx * CHUNK_SIZE;
        const y0 = cy * CHUNK_SIZE;
        let found = false;
        for (let dy = 0; dy < CHUNK_SIZE && !found; dy++) {
            for (let dx = 0; dx < CHUNK_SIZE && !found; dx++) {
                if (world.isDynamic(x0 + dx, y0 + dy)) found = true;
            }
        }
        this.active[this.idx(cx, cy)] = found ? 1 : 0;
    }

    /**
     * Render a chunk to its offscreen buffer with per-tile color variation.
     */
    renderChunkBuffer(cx, cy, world) {
        const i = this.idx(cx, cy);
        let canvas = this.buffers[i];
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.width = CHUNK_SIZE * TILE_SIZE;
            canvas.height = CHUNK_SIZE * TILE_SIZE;
            this.buffers[i] = canvas;
        }

        const ctx = canvas.getContext('2d');
        const x0 = cx * CHUNK_SIZE;
        const y0 = cy * CHUNK_SIZE;

        for (let dy = 0; dy < CHUNK_SIZE; dy++) {
            for (let dx = 0; dx < CHUNK_SIZE; dx++) {
                const wx = x0 + dx;
                const wy = y0 + dy;
                const tile = world.get(wx, wy);
                const noise = world.getNoise(wx, wy);

                // Alternate color based on noise for natural look
                ctx.fillStyle = (noise & 1) ? TILE_COLOR[tile] : (TILE_COLOR_ALT[tile] || TILE_COLOR[tile]);
                ctx.fillRect(dx * TILE_SIZE, dy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }

        this.dirty[i] = 0;
    }

    /**
     * Draw all visible chunks onto the main canvas.
     */
    draw(mainCtx, camera, world) {
        const canvasW = mainCtx.canvas.width;
        const canvasH = mainCtx.canvas.height;

        // Visible world-space rect (camera.x/y can be negative when centered)
        const viewX = camera.x;
        const viewY = camera.y;
        const viewW = canvasW / camera.zoom;
        const viewH = canvasH / camera.zoom;

        const startCX = Math.max(0, Math.floor(viewX / (CHUNK_SIZE * TILE_SIZE)));
        const startCY = Math.max(0, Math.floor(viewY / (CHUNK_SIZE * TILE_SIZE)));
        const endCX = Math.min(this.chunksX - 1, Math.floor((viewX + viewW) / (CHUNK_SIZE * TILE_SIZE)));
        const endCY = Math.min(this.chunksY - 1, Math.floor((viewY + viewH) / (CHUNK_SIZE * TILE_SIZE)));

        for (let cy = startCY; cy <= endCY; cy++) {
            for (let cx = startCX; cx <= endCX; cx++) {
                if (this.isDirty(cx, cy)) {
                    this.renderChunkBuffer(cx, cy, world);
                }

                const buf = this.buffers[this.idx(cx, cy)];
                if (!buf) continue;

                // Draw at world position — camera transform is already applied
                const sx = cx * CHUNK_SIZE * TILE_SIZE;
                const sy = cy * CHUNK_SIZE * TILE_SIZE;

                mainCtx.drawImage(buf, sx, sy);
            }
        }
    }
}
