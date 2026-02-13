import { TILE_SIZE, WORLD_W, WORLD_H } from './constants.js';

/**
 * Camera: viewport pan & zoom, clamped to world bounds.
 * "1×" zoom = the world exactly fills the viewport (fit-zoom).
 * Zoom values > 1× zoom in closer.
 */
export class Camera {
    constructor(canvasEl) {
        this.canvas = canvasEl;
        this.x = 0;
        this.y = 0;

        // World bounds in pixel space
        this.worldPxW = WORLD_W * TILE_SIZE;
        this.worldPxH = WORLD_H * TILE_SIZE;

        // The base zoom where world fits = 1× display
        this._baseZoom = 1;
        this._computeBaseZoom();

        // Internal zoom = _baseZoom * displayZoom
        this.zoom = this._baseZoom; // start at 1× (full world)
        this.maxDisplayZoom = 6;    // max zoom-in in display units

        this._dragging = false;
        this._lastMX = 0;
        this._lastMY = 0;

        this._bindEvents();
        this._clamp();

        window.addEventListener('resize', () => {
            this._computeBaseZoom();
            this._clamp();
        });
    }

    _computeBaseZoom() {
        const zx = this.canvas.width / this.worldPxW;
        const zy = this.canvas.height / this.worldPxH;
        this._baseZoom = Math.max(zx, zy);
    }

    /** Display zoom: 1× = world fits viewport */
    get displayZoom() {
        return this.zoom / this._baseZoom;
    }

    _clamp() {
        // Min zoom = base zoom (1× display = full world view)
        const minZoom = this._baseZoom;
        const maxZoom = this._baseZoom * this.maxDisplayZoom;
        this.zoom = Math.max(minZoom, Math.min(maxZoom, this.zoom));

        const viewW = this.canvas.width / this.zoom;
        const viewH = this.canvas.height / this.zoom;

        this.x = Math.max(0, Math.min(this.worldPxW - viewW, this.x));
        this.y = Math.max(0, Math.min(this.worldPxH - viewH, this.y));
    }

    _bindEvents() {
        // Middle-mouse OR right-mouse drag to pan
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || e.button === 2) {
                this._dragging = true;
                this._lastMX = e.clientX;
                this._lastMY = e.clientY;
                e.preventDefault();
            }
        });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('mousemove', (e) => {
            if (!this._dragging) return;
            const dx = e.clientX - this._lastMX;
            const dy = e.clientY - this._lastMY;
            this.x -= dx / this.zoom;
            this.y -= dy / this.zoom;
            this._clamp();
            this._lastMX = e.clientX;
            this._lastMY = e.clientY;
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 1 || e.button === 2) this._dragging = false;
        });

        // Scroll to zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.12 : 0.89;

            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            const worldXBefore = mx / this.zoom + this.x;
            const worldYBefore = my / this.zoom + this.y;

            this.zoom *= factor;

            this.x = worldXBefore - mx / this.zoom;
            this.y = worldYBefore - my / this.zoom;
            this._clamp();
        }, { passive: false });
    }

    screenToTile(sx, sy) {
        const wx = sx / this.zoom + this.x;
        const wy = sy / this.zoom + this.y;
        return {
            tx: Math.floor(wx / TILE_SIZE),
            ty: Math.floor(wy / TILE_SIZE),
        };
    }

    applyTransform(ctx) {
        ctx.setTransform(this.zoom, 0, 0, this.zoom, -this.x * this.zoom, -this.y * this.zoom);
    }

    resetTransform(ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}
