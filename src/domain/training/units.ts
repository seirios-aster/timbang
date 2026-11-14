import type { LoadType } from './types';

/** The unit a gym's plates and dumbbells are marked in. Weights are always stored in kg. */
export type WeightUnit = 'kg' | 'lb';

const LB_PER_KG = 2.2046226;

interface UnitSystem {
  /** Weight of an empty barbell. */
  bar: number;
  /** Plates in a typical gym, heaviest first. */
  plates: readonly number[];
  /** Smallest change each kind of equipment can make. */
  round: Record<Exclude<LoadType, 'bodyweight' | 'dumbbell'>, number>;
  /** Lightest sensible load for each kind of equipment. */
  min: Record<Exclude<LoadType, 'bodyweight'>, number>;
  /** How much to add when a lift goes up. */
  jump: { barbellUpper: number; barbellLower: number; machine: number };
  /** Dumbbell racks go up in small steps when light and bigger steps when heavy. */
  dumbbellStep: (weight: number) => number;
  /** Steps for typing a weight by hand. Finer than the jumps, since equipment varies. */
  inputStep: Record<Exclude<LoadType, 'bodyweight'>, number>;
}

/** Everything that differs between a kg gym and a lb gym. All numbers are in that gym's unit. */
export const UNIT_SYSTEMS: Record<WeightUnit, UnitSystem> = {
  kg: {
    bar: 20,
    plates: [25, 20, 15, 10, 5, 2.5, 1.25],
    round: { barbell: 2.5, machine: 5 },
    min: { barbell: 20, dumbbell: 2, machine: 5 },
    jump: { barbellUpper: 2.5, barbellLower: 5, machine: 5 },
    dumbbellStep: (weight) => (weight < 10 ? 1 : 2.5),
    inputStep: { barbell: 2.5, dumbbell: 0.5, machine: 2.5 },
  },
  lb: {
    bar: 45,
    plates: [45, 35, 25, 10, 5, 2.5],
    round: { barbell: 5, machine: 10 },
    min: { barbell: 45, dumbbell: 5, machine: 10 },
    jump: { barbellUpper: 5, barbellLower: 10, machine: 10 },
    dumbbellStep: (weight) => (weight < 25 ? 2.5 : 5),
    inputStep: { barbell: 5, dumbbell: 2.5, machine: 5 },
  },
};

/** Converts a stored weight to the gym's unit. Not rounded. */
export function fromKg(weightKg: number, unit: WeightUnit): number {
  return unit === 'lb' ? weightKg * LB_PER_KG : weightKg;
}

/** Converts a weight in the gym's unit back to kg for storage. */
export function toKg(weight: number, unit: WeightUnit): number {
  return unit === 'lb' ? weight / LB_PER_KG : weight;
}

/**
 * A stored weight as the number to show: 40, 42.5 or 95.
 * Rounds away the tiny errors left by converting to kg and back.
 */
export function displayWeight(weightKg: number, unit: WeightUnit): number {
  const precision = unit === 'lb' ? 2 : 4;
  return Math.round(fromKg(weightKg, unit) * precision) / precision;
}
