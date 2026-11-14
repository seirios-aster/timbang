import type { Experience } from '../nutrition/types';
import { EXERCISES, exercisesFor, findExercise } from './exercises';
import { splitForDays, TEMPLATES } from './splits';
import type {
  Equipment,
  Exercise,
  PlannedExercise,
  Program,
  Slot,
  Swaps,
  Tier,
  Workout,
  WorkoutTemplate,
} from './types';

interface Dose {
  sets: Record<Experience, number>;
  repsMin: number;
  repsMax: number;
  restSec: number;
}

/** Sets, reps and rest for each tier. Newer lifters do a little less, advanced lifters a little more. */
const DOSES: Record<Tier, Dose> = {
  main: { sets: { beginner: 3, intermediate: 3, advanced: 4 }, repsMin: 6, repsMax: 10, restSec: 150 },
  secondary: { sets: { beginner: 3, intermediate: 3, advanced: 3 }, repsMin: 8, repsMax: 12, restSec: 120 },
  accessory: { sets: { beginner: 2, intermediate: 3, advanced: 3 }, repsMin: 10, repsMax: 15, restSec: 75 },
};

/** Timed holds, in seconds. */
const HOLD = { min: 30, max: 60 };

/** Seconds a set takes, for estimating how long a workout lasts. */
const SECONDS_PER_SET = 40;

export function swapKey(workoutId: string, slot: number): string {
  return `${workoutId}:${slot}`;
}

function chooseExercise(slot: Slot, equipment: Equipment, taken: Set<string>, swapped?: string): Exercise | undefined {
  // The person's own choice wins, whatever it trains and whatever it needs. They know their gym.
  const chosen = swapped ? findExercise(swapped) : undefined;
  if (chosen && !taken.has(chosen.id)) return chosen;

  const options = exercisesFor(slot.pattern, equipment).filter((exercise) => !taken.has(exercise.id));

  for (const id of slot.prefer ?? []) {
    const preferred = options.find((exercise) => exercise.id === id);
    if (preferred) return preferred;
  }
  return options[0];
}

function buildWorkout(
  template: WorkoutTemplate,
  experience: Experience,
  equipment: Equipment,
  swaps: Swaps,
): Workout {
  const taken = new Set<string>();
  const exercises: PlannedExercise[] = [];

  template.slots.forEach((slot, index) => {
    const exercise = chooseExercise(slot, equipment, taken, swaps[swapKey(template.id, index)]);
    // Some patterns have no option for some equipment, such as a chest fly with no weights. Skip those.
    if (!exercise) return;
    taken.add(exercise.id);

    const dose = DOSES[slot.tier];
    exercises.push({
      slot: index,
      exerciseId: exercise.id,
      pattern: slot.pattern,
      tier: slot.tier,
      sets: dose.sets[experience],
      repsMin: exercise.timed ? HOLD.min : dose.repsMin,
      repsMax: exercise.timed ? HOLD.max : dose.repsMax,
      restSec: dose.restSec,
    });
  });

  return { id: template.id, name: template.name, short: template.short, focus: template.focus, exercises };
}

/**
 * The week's training: a split chosen from the number of lifting days, with
 * exercises that fit the equipment and sets that fit the experience level.
 * Returns null when there are no lifting days.
 */
export function buildProgram(
  days: number,
  experience: Experience,
  equipment: Equipment,
  swaps: Swaps = {},
): Program | null {
  const split = splitForDays(days);
  if (!split) return null;

  const week = split.week.map((templateId) => {
    const template = templateId ? TEMPLATES.get(templateId) : undefined;
    return template ? buildWorkout(template, experience, equipment, swaps) : null;
  });

  return { split, week };
}

/** Suggested swaps for a slot: same movement, allowed by the equipment, not already in the workout. */
export function alternatives(workout: Workout, planned: PlannedExercise, equipment: Equipment): Exercise[] {
  const inWorkout = new Set(workout.exercises.map((exercise) => exercise.exerciseId));
  return exercisesFor(planned.pattern, equipment).filter((exercise) => !inWorkout.has(exercise.id));
}

/**
 * Every other exercise the person could put in a slot, for when the suggestions do not fit
 * their gym. Matches the search text against the name and the muscles worked.
 */
export function searchExercises(workout: Workout, query: string): Exercise[] {
  const inWorkout = new Set(workout.exercises.map((exercise) => exercise.exerciseId));
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return EXERCISES.filter((exercise) => {
    if (inWorkout.has(exercise.id)) return false;
    const text = `${exercise.name} ${exercise.muscles}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

/** Rough length of a workout in minutes, rounded to five, including rest between sets. */
export function estimateMinutes(workout: Workout): number {
  const seconds = workout.exercises.reduce(
    (total, planned) => total + planned.sets * (planned.restSec + SECONDS_PER_SET),
    0,
  );
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

/** The next training day after `dayIndex`, wrapping around the week. */
export function nextWorkout(program: Program, dayIndex: number): { workout: Workout; inDays: number } | null {
  for (let offset = 1; offset <= 7; offset += 1) {
    const workout = program.week[(dayIndex + offset) % 7];
    if (workout) return { workout, inDays: offset };
  }
  return null;
}
