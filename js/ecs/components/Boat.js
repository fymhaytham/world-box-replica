export function Boat(size = 'medium', type = 'travel', kingdomId = null) {
    const capacities = {
        small: 5,
        medium: 12,
        large: 25
    };

    return {
        size,           // 'small', 'medium', 'large'
        type,           // 'travel', 'combat'
        capacity: capacities[size] || 12,
        passengers: new Set(),
        kingdomId,
        boardingTimer: 0
    };
}
