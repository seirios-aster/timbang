import type { Equipment, Exercise, LoadBasis, PlannedExercise } from '@/domain/training/types';
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
};

/** "3 × 6–10", or "3 × 30–60 sec" for holds. */
export function fmtDose(planned: PlannedExercise, exercise: Exercise): string {
  const range = `${planned.repsMin}–${planned.repsMax}`;
  return `${planned.sets} × ${range}${exercise.timed ? ' sec' : ''}`;
}

/** The unit after a weight: "kg", or "kg each" for a pair of dumbbells. */
export function loadUnit(exercise: Exercise): string {
  return exercise.load === 'dumbbell' && !exercise.single ? 'kg each' : 'kg';
}

/** "40 kg", "12.5 kg each", or the word used when there is no weight to load. */
export function fmtLoad(weightKg: number | null, exercise: Exercise): string {
  if (weightKg === null) return exercise.timed ? 'Hold' : 'Bodyweight';
  return `${fmtKg(weightKg)} ${loadUnit(exercise)}`;
}
