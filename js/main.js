import { LOGIC_STEP } from './constants.js';
import { ChunkManager } from './world/ChunkManager.js?v=2';
import { WorldGrid } from './world/WorldGrid.js?v=2';
import { stepAutomata, stepGrassGrowth } from './world/automata.js';
import { Camera } from './camera.js?v=5';
import { Renderer } from './renderer.js?v=4';
import { InputManager } from './input.js';
import { EntityManager } from './ecs/EntityManager.js?v=reset';
import { KingdomManager } from './ecs/KingdomManager.js?v=reset';
import { wanderSystem, movementSystem, hungerSystem, grazingSystem } from './ecs/systems.js?v=2';

// ─── Bootstrap ──────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const chunkManager = new ChunkManager();
const world = new WorldGrid(chunkManager);
const renderer = new Renderer(canvas);  // resize canvas first
const camera = new Camera(canvas);      // computes zoom + centers world
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

    // Safety Cap: Don't spiral if lag occurs
    let updates = 0;
    const MAX_UPDATES = 5;

    while (accumulator >= LOGIC_STEP) {
        logicTick();
        accumulator -= LOGIC_STEP;
        updates++;
        if (updates >= MAX_UPDATES) {
            accumulator = 0; // Discard remaining time to catch up
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

    // ECS systems — warTargeting units skip wander, they chase enemies instead
    wanderSystem(entities.positions, entities.velocities, entities.wanders, warTargeting);
    movementSystem(entities.positions, entities.velocities, world);
    hungerSystem(entities.hungers, entities.healths);
    grazingSystem(entities.positions, entities.hungers, entities.grazers, world);

    // Remove dead entities (clean up kingdom membership too)
    for (const [id, hp] of entities.healths) {
        if (hp.current <= 0) {
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

    // UI Updates
    document.body.classList.add('game-active');

    // Generate initial world if empty (optional, but good for "New Game")
    // world.generateIsland(); // Uncomment if we want auto-generation on start

    // Start Loop
    lastTime = performance.now();
    requestAnimationFrame(frame);
}

// Event Listeners
document.getElementById('btn-new-game').addEventListener('click', () => {
    // For a "New Game", we might want to clear the world. 
    // For now, we just start the flow.
    world.generateIsland(); // Make sure they start with something
    startGame();
});

document.getElementById('btn-load-game').addEventListener('click', () => {
    alert("Save/Load system coming soon!");
});

// Initial Render (so canvas isn't blank black if visible behind menu)
renderer.render(camera, chunkManager, world, entities, kingdoms);

