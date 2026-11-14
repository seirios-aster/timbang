/** Small seeded random generator (mulberry32), so the same seed always builds the same plan. */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks one item, where a higher weight makes an item more likely. */
export function pickWeighted<T>(items: readonly T[], weights: readonly number[], rng: Rng): T | undefined {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (items.length === 0 || total <= 0) return items[0];
  let roll = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}
