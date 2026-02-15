/**
 * Personality component — affects king behavior in war decisions.
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
