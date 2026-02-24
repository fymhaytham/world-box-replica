
/**
 * Simple A* pathfinding for WorldBox remake.
 */
export class Pathfinding {
    /**
     * Finds a path between two points.
     * @param {number} startX 
     * @param {number} startY 
     * @param {number} targetX 
     * @param {number} targetY 
     * @param {object} world - Must have isWalkable(x, y)
     * @param {number} maxIterations - Limit search to prevent hangs
     * @param {boolean} isBoat - Use sailable check instead
     * @returns {Array<{x, y}> | null} Path if found, else null
     */
    static findPath(startX, startY, targetX, targetY, world, maxIterations = 1000, isBoat = false) {
        const sX = Math.floor(startX);
        const sY = Math.floor(startY);
        const tX = Math.floor(targetX);
        const tY = Math.floor(targetY);

        if (sX === tX && sY === tY) return [{ x: tX, y: tY }];

        const canPass = (x, y) => isBoat ? world.isSailable(x, y) : world.isWalkable(x, y);

        // If target is not walkable, search fails immediately or we find nearest walkable
        if (!canPass(tX, tY)) return null;

        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const nodeKey = (x, y) => `${x},${y}`;

        const startKey = nodeKey(sX, sY);
        openSet.push({ x: sX, y: sY, f: this.heuristic(sX, sY, tX, tY) });
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(sX, sY, tX, tY));

        let iterations = 0;
        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;

            // Get node with lowest fScore
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const currentKey = nodeKey(current.x, current.y);

            if (current.x === tX && current.y === tY) {
                return this.reconstructPath(cameFrom, currentKey);
            }

            closedSet.add(currentKey);

            // Neighbors (8-way movement)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;

                    const nx = current.x + dx;
                    const ny = current.y + dy;
                    const nKey = nodeKey(nx, ny);

                    if (!world.inBounds(nx, ny) || !canPass(nx, ny) || closedSet.has(nKey)) {
                        continue;
                    }

                    // For diagonal movement, check if both adjacent tiles are passable to avoid "squeezing" through corners
                    if (dx !== 0 && dy !== 0) {
                        if (!canPass(current.x + dx, current.y) || !canPass(current.x, current.y + dy)) {
                            continue;
                        }
                    }

                    const tentativeGScore = gScore.get(currentKey) + (dx !== 0 && dy !== 0 ? 1.414 : 1);

                    if (!gScore.has(nKey) || tentativeGScore < gScore.get(nKey)) {
                        cameFrom.set(nKey, { x: current.x, y: current.y });
                        gScore.set(nKey, tentativeGScore);
                        const f = tentativeGScore + this.heuristic(nx, ny, tX, tY);
                        fScore.set(nKey, f);

                        const existing = openSet.find(o => o.x === nx && o.y === ny);
                        if (!existing) {
                            openSet.push({ x: nx, y: ny, f });
                        } else {
                            existing.f = f;
                        }
                    }
                }
            }
        }

        return null; // Path connection not found or limit reached
    }

    static heuristic(x1, y1, x2, y2) {
        // Octile distance for 8-way movement
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
    }

    static reconstructPath(cameFrom, currentKey) {
        const path = [];
        let curr = currentKey;
        while (cameFrom.has(curr)) {
            const [x, y] = curr.split(',').map(Number);
            path.unshift({ x, y });
            const parent = cameFrom.get(curr);
            curr = `${parent.x},${parent.y}`;
        }
        return path;
    }
}
