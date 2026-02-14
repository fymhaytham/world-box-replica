import { TOOL, TILE, BRUSH_RADIUS } from './constants.js';

/**
 * Handles mouse/keyboard input and current tool selection.
 * Top-down terrain painting.
 */
export class InputManager {
    constructor(canvas, camera, world, entityManager) {
        this.canvas = canvas;
        this.camera = camera;
        this.world = world;
        this.entities = entityManager;

        this.currentTool = TOOL.GRASS;
        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;

        this._bindEvents();
        this._updateToolbarUI();
    }

    _bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouseDown = true;
                this._updateMouse(e);
                this._applyTool();
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this._updateMouse(e);
            if (this.mouseDown) this._applyTool();
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouseDown = false;
        });

        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case '1': this.currentTool = TOOL.GRASS; break;
                case '2': this.currentTool = TOOL.FOREST; break;
                case '3': this.currentTool = TOOL.SAND; break;
                case '4': this.currentTool = TOOL.DIRT; break;
                case '5': this.currentTool = TOOL.WATER; break;
                case '6': this.currentTool = TOOL.STONE; break;
                case '7': this.currentTool = TOOL.FIRE; break;
                case '8': this.currentTool = TOOL.ERASE; break;
                case '9': this.currentTool = TOOL.SPAWN_HUMAN; break;
                case '0': this.currentTool = TOOL.SPAWN_SHEEP; break;
                case 'z': this.currentTool = TOOL.SPAWN_ZOMBIE; break;
            }
            this._updateToolbarUI();
        });
    }

    _updateMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
    }

    _applyTool() {
        const { tx, ty } = this.camera.screenToTile(this.mouseX, this.mouseY);

        const tileMap = {
            [TOOL.GRASS]: TILE.GRASS,
            [TOOL.FOREST]: TILE.FOREST,
            [TOOL.SAND]: TILE.SAND,
            [TOOL.DIRT]: TILE.DIRT,
            [TOOL.WATER]: TILE.WATER,
            [TOOL.STONE]: TILE.STONE,
            [TOOL.FIRE]: TILE.FIRE,
            [TOOL.ERASE]: TILE.DIRT, // erase paints dirt
        };

        if (tileMap[this.currentTool] !== undefined) {
            this._paintTiles(tx, ty, tileMap[this.currentTool]);
        } else if (this.currentTool === TOOL.SPAWN_HUMAN) {
            if (this.entities) this.entities.spawnHuman(tx, ty);
            this.mouseDown = false;
        } else if (this.currentTool === TOOL.SPAWN_SHEEP) {
            if (this.entities) this.entities.spawnSheep(tx, ty);
            this.mouseDown = false;
        } else if (this.currentTool === TOOL.SPAWN_ZOMBIE) {
            if (this.entities) this.entities.spawnZombie(tx, ty);
            this.mouseDown = false;
        }
    }

    _paintTiles(cx, cy, tileId) {
        const r = BRUSH_RADIUS;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= r * r) {
                    this.world.set(cx + dx, cy + dy, tileId);
                }
            }
        }
    }

    setTool(toolName) {
        this.currentTool = toolName;
        this._updateToolbarUI();
    }

    _updateToolbarUI() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.currentTool);
        });
        const label = document.getElementById('current-tool');
        if (label) label.textContent = this.currentTool.replace('_', ' ');
    }
}
