/**
 * ECS-Lite component factories.
 * Each returns a plain data object — no methods, no inheritance.
 */

export function Position(x = 0, y = 0) {
    return { x, y };
}

export function Velocity(vx = 0, vy = 0) {
    return { vx, vy };
}

export function Health(max = 100) {
    return { current: max, max };
}

export function Hunger(rate = 0.05) {
    return { value: 0, rate, max: 100 };
}

export function Render(color = '#FFD700', size = 0.8) {
    return { color, size };
}

export function Wander(interval = 30) {
    return { timer: 0, interval, dirX: 0, dirY: 0 };
}

export function Faction(type = 'human') {
    return { type };
}

export function Grazer() {
    return { eating: false };
}
