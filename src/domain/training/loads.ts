import type { Experience, Sex } from '../nutrition/types';
import { averageRir } from './effort';
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

/** How much lighter an easier week is. */
export const DELOAD_FACTOR = 0.9;

export interface AdviseOptions {
  /** An easier week: lighter weights and a relaxed target. */
  deload?: boolean;
}

/**
 * What to load next, using double progression with effort: stay at a weight until every set
 * reaches the top of the rep range with reps to spare, then add weight and work back up.
 *
 * Effort changes the call at the edges:
 * - Every set reached the top but most went to the limit: hold, and repeat once more.
 * - Sets felt easy (3 or more left): the weight is too light, so step up even before the top.
 *   If they also reached the top, take a double step.
 * - A set fell under the bottom of the range: back off, whatever the effort.
 *
 * With no effort recorded, sets count as "2 left", so only the rep rules apply.
 * With no earlier session it gives a starting estimate.
 * Weights in and out are kg. `unit` decides which jumps and rounding apply.
 */
export function adviseLoad(
  exercise: Exercise,
  range: Range,
  previous: ExerciseLog | undefined,
  lifter: Lifter,
  unit: WeightUnit = 'kg',
  options: AdviseOptions = {},
): LoadAdvice {
  const repUnit = exercise.timed ? 'seconds' : 'reps';
  const weighted = exercise.load !== 'bodyweight';
  const middle = Math.round((range.repsMin + range.repsMax) / 2);

  if (!previous || previous.reps.length === 0 || (weighted && previous.weightKg === null)) {
    const weightKg = startingLoad(exercise, lifter, unit);
    const eased = options.deload && weightKg !== null ? toKg(roundLoad(fromKg(weightKg, unit) * DELOAD_FACTOR, exercise.load, unit), unit) : weightKg;
    return {
      weightKg: eased,
      targetReps: middle,
      basis: options.deload ? 'deload' : 'start',
      note: options.deload
        ? 'An easier week. Keep every rep clean and stop well short of your limit.'
        : !weighted
          ? `Stop each set with about two ${exercise.timed ? 'seconds of good form' : 'reps'} left.`
          : weightKg === null
            ? `Pick a weight you can lift for ${range.repsMax} good reps, and log it. The app takes it from there.`
            : 'A starting estimate from your body weight. You should finish each set with about two reps left. Adjust it today if it feels off.',
    };
  }

  const fewest = Math.min(...previous.reps);
  const hitTop = fewest >= range.repsMax;
  const hitBottom = fewest >= range.repsMin;
  const effort = averageRir(previous);
  const grind = effort < 1;
  const easy = effort >= 2.5;
  const veryEasy = effort >= 3;

  if (options.deload) {
    const weightKg = weighted ? toKg(roundLoad(displayWeight(previous.weightKg ?? 0, unit) * DELOAD_FACTOR, exercise.load, unit), unit) : null;
    return {
      weightKg,
      targetReps: middle,
      basis: 'deload',
      note: weighted
        ? `An easier week: about 10% lighter and one set fewer. Aim for ${middle} ${repUnit} with plenty left.`
        : `An easier week: one set fewer. Stop each set with at least four ${exercise.timed ? 'seconds' : 'reps'} left.`,
    };
  }

  if (!weighted) {
    if (hitTop && !grind) {
      return {
        weightKg: null,
        targetReps: range.repsMax,
        basis: 'up',
        note: exercise.timed
          ? `You held ${range.repsMax} seconds on every set. Add a set, or make it harder by lifting one foot.`
          : `You hit ${range.repsMax} reps on every set. Add a set, or lower yourself over three seconds to make it harder.`,
      };
    }
    const target = Math.min(range.repsMax, fewest + (exercise.timed ? 5 : 1));
    return {
      weightKg: null,
      targetReps: target,
      basis: 'hold',
      note: hitTop
        ? 'You reached the top on every set, but it was close to your limit. Repeat it once more before making it harder.'
        : `Add a few ${repUnit} to each set until every set reaches ${range.repsMax}.`,
    };
  }

  const weightKg = previous.weightKg ?? 0;
  const weight = displayWeight(weightKg, unit);
  const stepUp = (steps: number, note: string): LoadAdvice => ({
    weightKg: toKg(roundLoad(weight + increment(exercise, weight, unit) * steps, exercise.load, unit), unit),
    targetReps: range.repsMin,
    basis: 'up',
    note,
  });
  const jump = increment(exercise, weight, unit);

  if (!hitBottom) {
    const lighter = Math.min(roundLoad(weight * BACK_OFF, exercise.load, unit), weight);
    return {
      weightKg: toKg(lighter, unit),
      targetReps: range.repsMin,
      basis: 'down',
      note: `A set fell under ${range.repsMin} reps last time, so the weight was too heavy. Drop it and build back up.`,
    };
  }

  if (hitTop) {
    if (grind) {
      return {
        weightKg,
        targetReps: range.repsMax,
        basis: 'hold',
        note: `You reached ${range.repsMax} reps on every set, but most sets went to your limit. Repeat this weight once more. It goes up when it feels solid.`,
      };
    }
    if (veryEasy) {
      return stepUp(2, `You hit ${range.repsMax} reps on every set and it felt easy. Add ${jump * 2} ${unit} and work back up from ${range.repsMin}.`);
    }
    return stepUp(1, `You hit ${range.repsMax} reps on every set last time. Add ${jump} ${unit} and work back up from ${range.repsMin}.`);
  }

  if (easy) {
    return stepUp(1, `Your sets felt easy, so this weight is too light for ${range.repsMin} to ${range.repsMax} reps. Add ${jump} ${unit} and work back up from ${range.repsMin}.`);
  }

  const target = Math.min(range.repsMax, fewest + 1);
  return {
    weightKg,
    targetReps: target,
    basis: 'hold',
    note: `Same weight as last time. Aim for ${target} reps on every set. When every set reaches ${range.repsMax}, it goes up.`,
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
