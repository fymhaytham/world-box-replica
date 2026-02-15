import { LOGIC_STEP } from './constants.js';
import { ChunkManager } from './world/ChunkManager.js';
import { WorldGrid } from './world/WorldGrid.js';
import { stepAutomata, stepGrassGrowth } from './world/automata.js';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { InputManager } from './input.js';
import { EntityManager } from './ecs/EntityManager.js';
import { KingdomManager } from './ecs/KingdomManager.js';
import { runAllSystems } from './ecs/systems/SystemManager.js';
import { spawnZombie } from './ecs/EntityFactory.js';

// ─── Bootstrap ──────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const chunkManager = new ChunkManager();
const world = new WorldGrid(chunkManager);
const renderer = new Renderer(canvas);
const camera = new Camera(canvas);
const entities = new EntityManager();
const kingdoms = new KingdomManager();
const input = new InputManager(canvas, camera, world, entities);

// Wire up toolbar buttons
document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
        input.setTool(btn.dataset.tool);
    });
});

// Generate Island button
document.getElementById('btn-generate-island').addEventListener('click', () => {
    world.generateIsland();
});

// Reset World button
document.getElementById('btn-reset-world').addEventListener('click', () => {
    world.fillWater();
    entities.clear();
    kingdoms.clear();
});

// Return to Menu
document.getElementById('btn-return-menu').addEventListener('click', () => {
    isGameRunning = false;
    document.body.classList.remove('game-active');
});

// ─── Game Loop ──────────────────────────────────────────
let lastTime = performance.now();
let accumulator = 0;
let logicTicks = 0;

function frame(now) {
    const dt = Math.min(now - lastTime, 100);
    lastTime = now;
    accumulator += dt;

    let updates = 0;
    const MAX_UPDATES = 5;

    while (accumulator >= LOGIC_STEP) {
        logicTick();
        accumulator -= LOGIC_STEP;
        updates++;
        if (updates >= MAX_UPDATES) {
            accumulator = 0;
            break;
        }
    }

    renderer.render(camera, chunkManager, world, entities, kingdoms);
    requestAnimationFrame(frame);
}

function logicTick() {
    logicTicks++;

    // Cellular automata
    stepAutomata(world, chunkManager);
    stepGrassGrowth(world, chunkManager);

    // Kingdom system (runs first to build warTargeting set)
    const warTargeting = kingdoms.update(entities, world, logicTicks);

    // All ECS systems via SystemManager
    runAllSystems(entities, world, warTargeting);

    // Remove dead entities (clean up kingdom membership too)
    for (const [id, hp] of entities.healths) {
        if (hp.current <= 0) {
            // INFECTION LOGIC:
            // If human dies, check if near a zombie to reanimate
            const pos = entities.positions.get(id);
            const isHuman = entities.factions.has(id) && entities.factions.get(id).name === 'human';

            if (isHuman && pos) {
                let nearbyZombie = false;
                for (const [zId, _] of entities.zombies) {
                    const zPos = entities.positions.get(zId);
                    if (zPos) {
                        const dist = Math.hypot(pos.x - zPos.x, pos.y - zPos.y);
                        if (dist < 2.5) {
                            nearbyZombie = true;
                            break;
                        }
                    }
                }

                if (nearbyZombie) {
                    spawnZombie(entities, pos.x, pos.y);
                }
            }

            killEntity(id);
        }
    }
}

// Centralized Death Logic (Referential Integrity)
function killEntity(id) {
    kingdoms.leaveKingdom(id);
    entities.destroy(id);
}

// ─── Main Menu Logic ────────────────────────────────────
let isGameRunning = false;

function startGame() {
    if (isGameRunning) return;
    isGameRunning = true;

    document.body.classList.add('game-active');

    lastTime = performance.now();
    requestAnimationFrame(frame);
}

// Event Listeners
document.getElementById('btn-new-game').addEventListener('click', () => {
    world.generateIsland();
    startGame();
});

document.getElementById('btn-load-game').addEventListener('click', () => {
    alert("Save/Load system coming soon!");
});

// Initial Render
renderer.render(camera, chunkManager, world, entities, kingdoms);
