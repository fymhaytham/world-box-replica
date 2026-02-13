import { LOGIC_STEP } from './constants.js';
import { ChunkManager } from './world/ChunkManager.js';
import { WorldGrid } from './world/WorldGrid.js';
import { stepAutomata, stepGrassGrowth } from './world/automata.js';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { InputManager } from './input.js';
import { EntityManager } from './ecs/EntityManager.js';
import { KingdomManager } from './ecs/KingdomManager.js';
import { wanderSystem, movementSystem, hungerSystem, grazingSystem } from './ecs/systems.js';

// ─── Bootstrap ──────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const chunkManager = new ChunkManager();
const world = new WorldGrid(chunkManager);
const renderer = new Renderer(canvas);  // resize canvas first
const camera = new Camera(canvas);      // then compute base zoom from canvas size
const entities = new EntityManager();
const kingdoms = new KingdomManager();
const input = new InputManager(canvas, camera, world, entities);

// Wire up toolbar buttons
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        input.setTool(btn.dataset.tool);
    });
});

// ─── Game Loop ──────────────────────────────────────────
let lastTime = performance.now();
let accumulator = 0;
let logicTicks = 0;

function frame(now) {
    const dt = Math.min(now - lastTime, 100);
    lastTime = now;
    accumulator += dt;

    while (accumulator >= LOGIC_STEP) {
        logicTick();
        accumulator -= LOGIC_STEP;
    }

    renderer.render(camera, chunkManager, world, entities, kingdoms);
    requestAnimationFrame(frame);
}

function logicTick() {
    logicTicks++;

    // Cellular automata
    stepAutomata(world, chunkManager);
    stepGrassGrowth(world, chunkManager);

    // ECS systems
    wanderSystem(entities.positions, entities.velocities, entities.wanders);
    movementSystem(entities.positions, entities.velocities, world);
    hungerSystem(entities.hungers, entities.healths);
    grazingSystem(entities.positions, entities.hungers, entities.grazers, world);

    // Kingdom system
    kingdoms.update(entities, world, logicTicks);

    // Remove dead entities (clean up kingdom membership too)
    for (const [id, hp] of entities.healths) {
        if (hp.current <= 0) {
            kingdoms.leaveKingdom(id);
            entities.destroy(id);
        }
    }
}

requestAnimationFrame(frame);
