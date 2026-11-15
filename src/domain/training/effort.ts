import type { ExerciseLog } from './types';

/**
 * How hard a set was, as reps left in the tank (RIR). A set with 0 left went to the limit.
 * Six lifts at "2 left" is a normal productive week. Six at "0 left" is a week to be careful with.
 */
export interface Effort {
  rir: number;
  label: string;
  detail: string;
}

export const EFFORTS: readonly Effort[] = [
  { rir: 3, label: 'Easy', detail: '3+ left' },
  { rir: 2, label: 'Solid', detail: '2 left' },
  { rir: 1, label: 'Hard', detail: '1 left' },
  { rir: 0, label: 'Max', detail: 'none left' },
];

/** What a set is counted as when nothing was recorded. It is the middle of the productive range. */
export const DEFAULT_RIR = 2;

export function effortFor(rir: number): Effort {
  return EFFORTS.reduce((best, effort) => (Math.abs(effort.rir - rir) < Math.abs(best.rir - rir) ? effort : best));
}

/** Reps left after one set of a log. */
export function rirOf(log: ExerciseLog, setIndex: number): number {
  return log.rir?.[setIndex] ?? DEFAULT_RIR;
}

/** Average reps left across a log's sets. */
export function averageRir(log: ExerciseLog): number {
  if (log.reps.length === 0) return DEFAULT_RIR;
  return log.reps.reduce((sum, _, i) => sum + rirOf(log, i), 0) / log.reps.length;
}

/** True when this log recorded how hard the sets were. */
export const hasEffort = (log: ExerciseLog) => Boolean(log.rir && log.rir.length > 0);
