import type { Equipment, Exercise, LoadBasis, PlannedExercise } from '@/domain/training/types';
import { displayWeight, type WeightUnit } from '@/domain/training/units';
import { fmtKg } from '@/lib/format';

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  gym: 'Gym',
  dumbbells: 'Dumbbells',
  bodyweight: 'No equipment',
};

export const EQUIPMENT_CHOICES: { value: Equipment; title: string; detail: string }[] = [
  { value: 'gym', title: 'Gym', detail: 'Barbells, dumbbells, cables and machines' },
  { value: 'dumbbells', title: 'Dumbbells at home', detail: 'A pair of dumbbells and something sturdy to sit on' },
  { value: 'bodyweight', title: 'No equipment', detail: 'Bodyweight only. A pull-up bar helps.' },
];


export const BASIS_STAMP: Record<LoadBasis, { label: string; tone: 'ink' | 'green' | 'red' | 'blue' }> = {
  start: { label: 'Start here', tone: 'blue' },
  up: { label: 'Go up', tone: 'green' },
  hold: { label: 'Hold', tone: 'ink' },
  down: { label: 'Back off', tone: 'red' },
  deload: { label: 'Easy week', tone: 'blue' },
};

/** "6–10", or "30–60 sec" for holds. */
export function fmtRange(planned: PlannedExercise, exercise: Exercise): string {
  return `${planned.repsMin}–${planned.repsMax}${exercise.timed ? ' sec' : ''}`;
}

/** "3 × 6–10", or "3 × 30–60 sec" for holds. */
export function fmtDose(planned: PlannedExercise, exercise: Exercise): string {
  return `${planned.sets} × ${fmtRange(planned, exercise)}`;
}

/** A stored weight as the number to show in the person's unit, such as "42.5" or "95". */
export function fmtWeight(weightKg: number, unit: WeightUnit): string {
  return fmtKg(displayWeight(weightKg, unit));
}

/** The unit after a weight: "kg", or "kg each" for a pair of dumbbells. */
export function loadUnit(exercise: Exercise, unit: WeightUnit): string {
  return exercise.load === 'dumbbell' && !exercise.single ? `${unit} each` : unit;
}

/** "40 kg", "25 lb each", or the word used when there is no weight to load. */
export function fmtLoad(weightKg: number | null, exercise: Exercise, unit: WeightUnit): string {
  if (weightKg === null) {
    if (exercise.load !== 'bodyweight') return 'Your pick';
    return exercise.timed ? 'Hold' : 'Bodyweight';
  }
  return `${fmtWeight(weightKg, unit)} ${loadUnit(exercise, unit)}`;
}

/** A search link for a demonstration video. Opens outside the app. */
export function videoSearchUrl(exercise: Exercise): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to ${exercise.name} proper form`)}`;
}

/** Minutes and seconds, such as "2:05". */
export function fmtClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}
