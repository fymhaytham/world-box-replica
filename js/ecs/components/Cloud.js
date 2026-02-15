/**
 * Cloud component: tracks lightning timer and visual state.
 */
export function Cloud() {
    return {
        timer: 60,                // Time until next lightning strike
        lightningDuration: 0,     // Visual duration of lightning flash
        despawnTimer: 600,        // 30 seconds at 20 TPS
        moveTimer: 0,             // Time until next direction change
        dx: 0,                    // Movement X direction
        dy: 0,                    // Movement Y direction
    };
}
