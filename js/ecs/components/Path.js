
/**
 * Path component — stores pathfinding state.
 */
export function Path() {
    return {
        points: [],      // Array of {x, y}
        targetId: null,  // Entity ID being targeted
        targetX: null,
        targetY: null,
        recalcTimer: 0,  // Ticks until next path recalculation
    };
}
