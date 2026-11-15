import { findExercise } from './exercises';
import type { Exercise, ExerciseLog } from './types';

/**
 * Lift history: personal records, estimated one-rep max, and totals.
 * Everything is worked out from the exercise logs. Weights are in kg.
 */

/** Rep counts above this make a one-rep-max estimate too rough to be useful, so they are capped. */
const MAX_REPS_FOR_ESTIMATE = 12;

/** A sack of rice, the unit of weight everyone in the Philippines can picture. */
export const RICE_SACK_KG = 50;

/**
 * Estimated one-rep max from a set, using the Epley formula.
 * A single rep is its own answer. Higher reps make the estimate less exact.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + Math.min(reps, MAX_REPS_FOR_ESTIMATE) / 30);
}

/** The weight someone with this one-rep max could expect to lift for a number of reps. */
export function weightForReps(oneRepMaxKg: number, reps: number): number {
  if (reps <= 1) return oneRepMaxKg;
  return oneRepMaxKg / (1 + reps / 30);
}

export interface LiftSession {
  date: string;
  /** Weight used. Null for bodyweight lifts. */
  weightKg: number | null;
  reps: number[];
  /** Most reps on any one set. */
  topReps: number;
  /** Estimated one-rep max from the best set. Null for bodyweight lifts. */
  oneRepMaxKg: number | null;
  /** Weight times total reps. Zero for bodyweight lifts. */
  volumeKg: number;
}

export interface LiftStats {
  exercise: Exercise;
  /** Oldest first. */
  sessions: LiftSession[];
  last: LiftSession;
  /** The session with the most weight on the bar. Null for bodyweight lifts. */
  heaviest: LiftSession | null;
  /** The session with the highest estimated one-rep max. Null for bodyweight lifts. */
  strongest: LiftSession | null;
  /** The session with the most reps in one set. */
  mostReps: LiftSession;
  totalVolumeKg: number;
}

function toSession(log: ExerciseLog, exercise: Exercise): LiftSession {
  const topReps = Math.max(0, ...log.reps);
  const totalReps = log.reps.reduce((sum, reps) => sum + reps, 0);
  // A pair of dumbbells is logged per hand, so the load moved is double.
  const hands = exercise.load === 'dumbbell' && !exercise.single ? 2 : 1;
  const weighted = log.weightKg !== null && log.weightKg > 0 && !exercise.timed;

  return {
    date: log.date,
    weightKg: log.weightKg,
    reps: log.reps,
    topReps,
    oneRepMaxKg: weighted ? estimateOneRepMax(log.weightKg!, topReps) : null,
    volumeKg: weighted ? log.weightKg! * totalReps * hands : 0,
  };
}

/** The better of two sessions by a measure, keeping the earlier one on a tie so a record keeps its first date. */
function best(sessions: LiftSession[], measure: (session: LiftSession) => number): LiftSession | null {
  let top: LiftSession | null = null;
  for (const session of sessions) {
    if (measure(session) > 0 && (!top || measure(session) > measure(top))) top = session;
  }
  return top;
}

/** History and records for one lift. Null when it has never been logged. */
export function liftStats(logs: readonly ExerciseLog[], exerciseId: string): LiftStats | null {
  const exercise = findExercise(exerciseId);
  if (!exercise) return null;

  const sessions = logs
    .filter((log) => log.exerciseId === exerciseId && log.reps.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((log) => toSession(log, exercise));
  const last = sessions[sessions.length - 1];
  if (!last) return null;

  return {
    exercise,
    sessions,
    last,
    // More reps at the same weight beats fewer, so add a small bonus for reps.
    heaviest: best(sessions, (session) => (session.weightKg ? session.weightKg + session.topReps / 1000 : 0)),
    strongest: best(sessions, (session) => session.oneRepMaxKg ?? 0),
    mostReps: best(sessions, (session) => session.topReps) ?? last,
    totalVolumeKg: sessions.reduce((sum, session) => sum + session.volumeKg, 0),
  };
}

/** Stats for every lift that has been logged, most recently trained first. */
export function allLiftStats(logs: readonly ExerciseLog[]): LiftStats[] {
  const ids = [...new Set(logs.map((log) => log.exerciseId))];
  return ids
    .map((id) => liftStats(logs, id))
    .filter((stats): stats is LiftStats => stats !== null)
    .sort((a, b) => b.last.date.localeCompare(a.last.date));
}

export interface TrainingTotals {
  /** Days with at least one lift logged. */
  days: number;
  lifts: number;
  sets: number;
  volumeKg: number;
}

export function trainingTotals(logs: readonly ExerciseLog[]): TrainingTotals {
  const stats = allLiftStats(logs);
  return {
    days: new Set(logs.map((log) => log.date)).size,
    lifts: stats.length,
    sets: logs.reduce((sum, log) => sum + log.reps.length, 0),
    volumeKg: stats.reduce((sum, lift) => sum + lift.totalVolumeKg, 0),
  };
}

/** Whole days from one calendar date to another. Negative when `to` is earlier. */
export function daysBetweenDates(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** `weight` is more on the bar than ever. `strength` is a higher estimated max. `reps` is for bodyweight lifts. */
export type RecordKind = 'weight' | 'strength' | 'reps';

export interface LiftRecord {
  exerciseId: string;
  kind: RecordKind;
  /** The new best: kg for weight and strength, a count for reps. */
  value: number;
  /** The best before it. */
  previous: number;
}

/**
 * Records set by newly added logs, compared with the history before them.
 * A lift's very first session sets no record, since there is nothing to beat.
 */
export function findRecords(before: readonly ExerciseLog[], added: readonly ExerciseLog[]): LiftRecord[] {
  const records: LiftRecord[] = [];

  for (const log of added) {
    const earlier = liftStats(
      before.filter((entry) => !(entry.exerciseId === log.exerciseId && entry.date === log.date)),
      log.exerciseId,
    );
    const now = liftStats([log], log.exerciseId);
    if (!earlier || !now) continue;

    const session = now.last;
    const previousWeight = earlier.heaviest?.weightKg ?? 0;
    const previousMax = earlier.strongest?.oneRepMaxKg ?? 0;

    if (session.weightKg !== null && session.oneRepMaxKg !== null) {
      if (previousWeight > 0 && session.weightKg > previousWeight + 1e-6) {
        records.push({ exerciseId: log.exerciseId, kind: 'weight', value: session.weightKg, previous: previousWeight });
      } else if (previousMax > 0 && session.oneRepMaxKg > previousMax + 0.25) {
        records.push({ exerciseId: log.exerciseId, kind: 'strength', value: session.oneRepMaxKg, previous: previousMax });
      }
    } else if (session.topReps > earlier.mostReps.topReps) {
      records.push({ exerciseId: log.exerciseId, kind: 'reps', value: session.topReps, previous: earlier.mostReps.topReps });
    }
  }

  return records;
}
