import type { Experience, Sex } from '../nutrition/types';

/** What the person has to train with. */
export type Equipment = 'gym' | 'dumbbells' | 'bodyweight';

/** How an exercise is loaded, which decides how weights are rounded and increased. */
export type LoadType = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight';

/** The movement an exercise trains. Swaps happen between exercises that share a pattern. */
export type Pattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'pushH' // horizontal push: bench, push-up
  | 'pushV' // vertical push: overhead press
  | 'pullH' // horizontal pull: rows
  | 'pullV' // vertical pull: pulldown, pull-up
  | 'chestFly'
  | 'sideDelt'
  | 'rearDelt'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hams'
  | 'glutes'
  | 'calves'
  | 'core';

export interface Exercise {
  id: string;
  name: string;
  pattern: Pattern;
  /** Setups this exercise can be done with. */
  equipment: Equipment[];
  load: LoadType;
  /** Main muscles worked, in plain words. */
  muscles: string;
  /** One or two sentences on how to do it. */
  cue: string;
  /**
   * A beginner man's working weight as a fraction of body weight.
   * For dumbbells this is per dumbbell. Absent for bodyweight exercises.
   */
  startRatio?: number;
  /** Lower-body lifts start heavier for women relative to men, and go up in bigger jumps. */
  lower?: boolean;
  /** Uses one dumbbell, not a pair. */
  single?: boolean;
  /** Held for time, in seconds, instead of counted in reps. */
  timed?: boolean;
}

/** How much work a slot gets: heavy first lift, supporting lift, or small finishing move. */
export type Tier = 'main' | 'secondary' | 'accessory';

export interface Slot {
  pattern: Pattern;
  tier: Tier;
  /** Exercise ids to try first, in order. The first one the person's equipment allows is used. */
  prefer?: string[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  /** Two or three letters for the week strip. */
  short: string;
  focus: string;
  slots: Slot[];
}

export interface Split {
  id: string;
  name: string;
  /** One or two sentences on why this split suits this many days. */
  why: string;
  /** Monday to Sunday. A template id on training days, null on rest days. */
  week: (string | null)[];
}

export interface PlannedExercise {
  /** Position in the workout template. Used to remember swaps. */
  slot: number;
  exerciseId: string;
  pattern: Pattern;
  tier: Tier;
  sets: number;
  /** Reps per set, or seconds for timed holds. */
  repsMin: number;
  repsMax: number;
  restSec: number;
}

export interface Workout {
  id: string;
  name: string;
  short: string;
  focus: string;
  exercises: PlannedExercise[];
}

export interface Program {
  split: Split;
  /** Monday to Sunday. Null on rest days. */
  week: (Workout | null)[];
}

/** Which exercise the person chose for a slot, keyed by `swapKey`. */
export type Swaps = Record<string, string>;

export interface ExerciseLog {
  exerciseId: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Weight used, per dumbbell for dumbbell lifts. Null for bodyweight. */
  weightKg: number | null;
  /** Reps done on each set, or seconds for timed holds. */
  reps: number[];
  /**
   * Reps left in the tank after each set, as the person judged it: 3 means easy, 0 means
   * nothing left. Older logs and hand-entered ones may not have it.
   */
  rir?: number[];
}

/** Who the weight guidance is for. */
export interface Lifter {
  sex: Sex;
  experience: Experience;
  weightKg: number;
  heightCm: number;
}

/** `start` is an estimate before any log exists. The rest come from the last session. */
export type LoadBasis = 'start' | 'up' | 'hold' | 'down' | 'deload';

export interface LoadAdvice {
  /** Suggested weight. Null for bodyweight exercises. */
  weightKg: number | null;
  /** Reps to aim for on every set. */
  targetReps?: number;
  basis: LoadBasis;
  note: string;
}
