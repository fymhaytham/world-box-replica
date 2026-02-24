
/**
 * PathfollowingSystem — moves entities along their pre-calculated paths.
 */
export function pathfollowingSystem(entities, world) {
    const { positions, velocities, paths } = entities;

    for (const [id, path] of paths) {
        if (!path.points || path.points.length === 0) continue;

        const pos = positions.get(id);
        const vel = velocities.get(id);
        if (!pos || !vel) continue;

        const isBoat = entities.boats.has(id);
        const speed = isBoat ? 0.25 : 0.35; // Default chase speeds

        // Get current target point
        const targetPoint = path.points[0];

        // Distance to target point
        const dx = targetPoint.x + 0.5 - pos.x;
        const dy = targetPoint.y + 0.5 - pos.y;
        const distSq = dx * dx + dy * dy;

        // If close enough to current point, move to next
        if (distSq < 0.1) {
            path.points.shift();
            // If no more points, we reached the destination
            if (path.points.length === 0) {
                vel.vx = 0;
                vel.vy = 0;
                continue;
            }
        }

        // Move towards current point
        const dist = Math.sqrt(distSq) || 0.001;
        vel.vx = (dx / dist) * speed;
        vel.vy = (dy / dist) * speed;
    }
}
