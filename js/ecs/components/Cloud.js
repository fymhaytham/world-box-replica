/**
 * Cloud component: tracks lightning timer and visual state.
 */
export function Cloud() {
    return {
        timer: 60,                // Time until next lightning strike
        lightningDuration: 0,     // Visual duration of lightning flash
    };
}
