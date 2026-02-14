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

/**
 * Personality — affects king behavior in war decisions.
 * 1 = Warmongering (rare), 2 = Irritable, 3 = Neutral (common),
 * 4 = Peaceful, 5 = Pacifist (rare)
 * Bell-curve: 1&5 ~6%, 2&4 ~24%, 3 ~40%
 */
export function Personality() {
    const weights = [1, 4, 6, 4, 1]; // relative weights for 1-5
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return { value: i + 1 };
    }
    return { value: 3 };
}
