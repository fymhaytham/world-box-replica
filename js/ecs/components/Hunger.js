/**
 * Hunger component — accumulates over time, damages health when full.
 */
export function Hunger(rate = 0.05) {
    return { value: 0, rate, max: 100 };
}
