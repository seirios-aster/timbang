import type { Experience, Sex } from '../nutrition/types';
import type { Exercise, ExerciseLog, Lifter, LoadAdvice, LoadType, PlannedExercise } from './types';
import { displayWeight, fromKg, toKg, UNIT_SYSTEMS, type WeightUnit } from './units';

/** Starting weights scale with body weight, but stop at the weight of BMI 27.5 so they do not balloon. */
const REFERENCE_BMI = 27.5;

const EXPERIENCE_FACTOR: Record<Experience, number> = { beginner: 1, intermediate: 1.4, advanced: 1.75 };

/** Starting weights for women relative to men, for upper-body and lower-body lifts. */
const FEMALE_FACTOR = { upper: 0.6, lower: 0.75 };

/** After a set falls short, the next session uses this fraction of the weight. */
const BACK_OFF = 0.9;

function referenceWeightKg(lifter: Lifter): number {
  const heightM = lifter.heightCm / 100;
  return Math.min(lifter.weightKg, REFERENCE_BMI * heightM * heightM);
}

function sexFactor(sex: Sex, lower: boolean): number {
  if (sex === 'male') return 1;
  return lower ? FEMALE_FACTOR.lower : FEMALE_FACTOR.upper;
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/**
 * Rounds a weight to something the equipment can actually be set to.
 * The weight and the result are in the gym's unit, not kg.
 */
export function roundLoad(weight: number, load: LoadType, unit: WeightUnit = 'kg'): number {
  const system = UNIT_SYSTEMS[unit];
  switch (load) {
    case 'barbell':
      return Math.max(system.min.barbell, roundTo(weight, system.round.barbell));
    case 'dumbbell':
      return Math.max(system.min.dumbbell, roundTo(weight, system.dumbbellStep(weight)));
    case 'machine':
      return Math.max(system.min.machine, roundTo(weight, system.round.machine));
    case 'bodyweight':
      return 0;
  }
}

/** The smallest sensible jump up for this exercise at this weight, in the gym's unit. */
export function increment(exercise: Exercise, weight: number, unit: WeightUnit = 'kg'): number {
  const system = UNIT_SYSTEMS[unit];
  switch (exercise.load) {
    case 'barbell':
      return exercise.lower ? system.jump.barbellLower : system.jump.barbellUpper;
    case 'dumbbell':
      return system.dumbbellStep(weight);
    case 'machine':
      return system.jump.machine;
    case 'bodyweight':
      return 0;
  }
}

/**
 * A first working weight estimated from body weight, sex and experience, in kg,
 * rounded to what a gym in the given unit can load. Null when there is nothing to estimate from.
 */
export function startingLoad(exercise: Exercise, lifter: Lifter, unit: WeightUnit = 'kg'): number | null {
  if (exercise.load === 'bodyweight' || exercise.startRatio === undefined) return null;
  const estimateKg =
    referenceWeightKg(lifter) *
    exercise.startRatio *
    sexFactor(lifter.sex, Boolean(exercise.lower)) *
    EXPERIENCE_FACTOR[lifter.experience];
  return toKg(roundLoad(fromKg(estimateKg, unit), exercise.load, unit), unit);
}

/** The most recent log for an exercise, optionally only from before a date. */
export function lastLog(
  logs: readonly ExerciseLog[],
  exerciseId: string,
  beforeDate?: string,
): ExerciseLog | undefined {
  let latest: ExerciseLog | undefined;
  for (const log of logs) {
    if (log.exerciseId !== exerciseId) continue;
    if (beforeDate && log.date >= beforeDate) continue;
    if (!latest || log.date > latest.date) latest = log;
  }
  return latest;
}

type Range = Pick<PlannedExercise, 'repsMin' | 'repsMax'>;

/**
 * What to load next, using double progression: stay at a weight until every set
 * reaches the top of the rep range, then add weight and work back up.
 * With no earlier session it gives a starting estimate.
 * Weights in and out are kg. `unit` decides which jumps and rounding apply.
 */
export function adviseLoad(
  exercise: Exercise,
  range: Range,
  previous: ExerciseLog | undefined,
  lifter: Lifter,
  unit: WeightUnit = 'kg',
): LoadAdvice {
  const repUnit = exercise.timed ? 'seconds' : 'reps';
  const weighted = exercise.load !== 'bodyweight';

  if (!previous || previous.reps.length === 0 || (weighted && previous.weightKg === null)) {
    const weightKg = startingLoad(exercise, lifter, unit);
    return {
      weightKg,
      basis: 'start',
      note: !weighted
        ? `Stop each set with about two ${exercise.timed ? 'seconds of good form' : 'reps'} left.`
        : weightKg === null
          ? `Pick a weight you can lift for ${range.repsMax} good reps, and log it. The app takes it from there.`
          : 'A starting estimate from your body weight. You should finish each set with about two reps left. Adjust it today if it feels off.',
    };
  }

  const fewest = Math.min(...previous.reps);
  const hitTop = fewest >= range.repsMax;
  const hitBottom = fewest >= range.repsMin;

  if (!weighted) {
    if (hitTop) {
      return {
        weightKg: null,
        basis: 'up',
        note: exercise.timed
          ? `You held ${range.repsMax} seconds on every set. Add a set, or make it harder by lifting one foot.`
          : `You hit ${range.repsMax} reps on every set. Add a set, or lower yourself over three seconds to make it harder.`,
      };
    }
    return {
      weightKg: null,
      basis: 'hold',
      note: `Add a few ${repUnit} to each set until every set reaches ${range.repsMax}.`,
    };
  }

  const weightKg = previous.weightKg ?? 0;
  const weight = displayWeight(weightKg, unit);

  if (hitTop) {
    const step = increment(exercise, weight, unit);
    return {
      weightKg: toKg(roundLoad(weight + step, exercise.load, unit), unit),
      basis: 'up',
      note: `You hit ${range.repsMax} reps on every set last time. Add ${step} ${unit} and work back up from ${range.repsMin}.`,
    };
  }

  if (hitBottom) {
    return {
      weightKg,
      basis: 'hold',
      note: `Same weight as last time. Add reps until every set reaches ${range.repsMax}.`,
    };
  }

  const lighter = Math.min(roundLoad(weight * BACK_OFF, exercise.load, unit), weight);
  return {
    weightKg: toKg(lighter, unit),
    basis: 'down',
    note: `A set fell under ${range.repsMin} reps last time, so the weight was too heavy. Drop it and build back up.`,
  };
}

export interface BarLoading {
  /** Weight of the empty bar, in the gym's unit. */
  bar: number;
  /** Plates for one side of the bar, heaviest first. */
  perSide: number[];
  /** Weight that cannot be made with the available plates, if any. */
  leftover: number;
}

/** Which plates to put on each side of the bar to reach a total. All weights are in the gym's unit. */
export function platesPerSide(total: number, unit: WeightUnit = 'kg'): BarLoading {
  const { bar, plates } = UNIT_SYSTEMS[unit];
  let remaining = Math.max(0, (total - bar) / 2);
  const perSide: number[] = [];
  for (const plate of plates) {
    while (remaining >= plate - 1e-9) {
      perSide.push(plate);
      remaining -= plate;
    }
  }
  return { bar, perSide, leftover: Number((remaining * 2).toFixed(2)) };
}
