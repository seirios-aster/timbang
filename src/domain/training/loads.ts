import type { Experience, Sex } from '../nutrition/types';
import type { Exercise, ExerciseLog, Lifter, LoadAdvice, LoadType, PlannedExercise } from './types';

export const BAR_KG = 20;

/** Plates in a typical gym, heaviest first, in kg. */
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

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

/** Dumbbell racks usually go up by 1 kg to 10 kg, then by 2.5 kg. */
function dumbbellStep(weightKg: number): number {
  return weightKg < 10 ? 1 : 2.5;
}

/** Rounds a weight to something the equipment can actually be set to. */
export function roundLoad(weightKg: number, load: LoadType): number {
  switch (load) {
    case 'barbell':
      return Math.max(BAR_KG, roundTo(weightKg, 2.5));
    case 'dumbbell':
      return Math.max(2, roundTo(weightKg, dumbbellStep(weightKg)));
    case 'machine':
      return Math.max(5, roundTo(weightKg, 5));
    case 'bodyweight':
      return 0;
  }
}

/** The smallest sensible jump up for this exercise at this weight. */
export function increment(exercise: Exercise, weightKg: number): number {
  switch (exercise.load) {
    case 'barbell':
      return exercise.lower ? 5 : 2.5;
    case 'dumbbell':
      return dumbbellStep(weightKg);
    case 'machine':
      return 5;
    case 'bodyweight':
      return 0;
  }
}

/** A first working weight estimated from body weight, sex and experience. Null for bodyweight exercises. */
export function startingLoad(exercise: Exercise, lifter: Lifter): number | null {
  if (exercise.load === 'bodyweight' || exercise.startRatio === undefined) return null;
  const estimate =
    referenceWeightKg(lifter) *
    exercise.startRatio *
    sexFactor(lifter.sex, Boolean(exercise.lower)) *
    EXPERIENCE_FACTOR[lifter.experience];
  return roundLoad(estimate, exercise.load);
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
 */
export function adviseLoad(
  exercise: Exercise,
  range: Range,
  previous: ExerciseLog | undefined,
  lifter: Lifter,
): LoadAdvice {
  const unit = exercise.timed ? 'seconds' : 'reps';
  const weighted = exercise.load !== 'bodyweight';

  if (!previous || previous.reps.length === 0 || (weighted && previous.weightKg === null)) {
    return {
      weightKg: startingLoad(exercise, lifter),
      basis: 'start',
      note: weighted
        ? 'A starting estimate from your body weight. You should finish each set with about two reps left. Adjust it today if it feels off.'
        : `Stop each set with about two ${exercise.timed ? 'seconds of good form' : 'reps'} left.`,
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
      note: `Add a few ${unit} to each set until every set reaches ${range.repsMax}.`,
    };
  }

  const weightKg = previous.weightKg ?? 0;

  if (hitTop) {
    const step = increment(exercise, weightKg);
    return {
      weightKg: roundLoad(weightKg + step, exercise.load),
      basis: 'up',
      note: `You hit ${range.repsMax} reps on every set last time. Add ${step} kg and work back up from ${range.repsMin}.`,
    };
  }

  if (hitBottom) {
    return {
      weightKg,
      basis: 'hold',
      note: `Same weight as last time. Add reps until every set reaches ${range.repsMax}.`,
    };
  }

  const lighter = roundLoad(weightKg * BACK_OFF, exercise.load);
  return {
    weightKg: Math.min(lighter, weightKg),
    basis: 'down',
    note: `A set fell under ${range.repsMin} reps last time, so the weight was too heavy. Drop it and build back up.`,
  };
}

export interface BarLoading {
  /** Plates for one side of the bar, heaviest first. */
  perSide: number[];
  /** Weight that cannot be made with the available plates, if any. */
  leftoverKg: number;
}

/** Which plates to put on each side of a 20 kg bar to reach a total weight. */
export function platesPerSide(totalKg: number, barKg: number = BAR_KG): BarLoading {
  let remaining = Math.max(0, (totalKg - barKg) / 2);
  const perSide: number[] = [];
  for (const plate of PLATES_KG) {
    while (remaining >= plate - 1e-9) {
      perSide.push(plate);
      remaining -= plate;
    }
  }
  return { perSide, leftoverKg: Number((remaining * 2).toFixed(2)) };
}
