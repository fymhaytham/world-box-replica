/**
 * Wander component — random direction changes on a timer.
 */
export function Wander(interval = 30) {
    return { timer: 0, interval, dirX: 0, dirY: 0 };
}
