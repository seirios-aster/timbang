import { averageRir, hasEffort } from './effort';
import { getExercise } from './exercises';
import { adviseLoad, lastLog } from './loads';
import { daysBetweenDates } from './stats';
import type { ExerciseLog, Lifter, LoadAdvice } from './types';
import type { WeightUnit } from './units';

/**
 * Looking ahead from what was done: what each lift should do next time, how the
 * session went overall, and whether it is time for an easier week.
 */

export interface NextUp {
  exerciseId: string;
  advice: LoadAdvice;
  /** The session this is based on. */
  from: ExerciseLog;
}

/** What each lift just done should do next session. */
export function nextSessionPreview(
  lifts: readonly { exerciseId: string; repsMin: number; repsMax: number }[],
  logs: readonly ExerciseLog[],
  lifter: Lifter,
  unit: WeightUnit,
): NextUp[] {
  return lifts.flatMap((lift) => {
    const from = lastLog(logs, lift.exerciseId);
    if (!from) return [];
    return [{ exerciseId: lift.exerciseId, from, advice: adviseLoad(getExercise(lift.exerciseId), lift, from, lifter, unit) }];
  });
}

export interface SessionVerdict {
  headline: string;
  detail: string;
}

/** A plain-words read on how the session went, from what each lift should do next. */
export function sessionVerdict(next: readonly NextUp[], logs: readonly ExerciseLog[], today: string): SessionVerdict {
  const up = next.filter((item) => item.advice.basis === 'up').length;
  const down = next.filter((item) => item.advice.basis === 'down').length;
  const todays = logs.filter((log) => log.date === today && hasEffort(log));
  const rated = todays.length > 0;
  const grind = rated && todays.reduce((sum, log) => sum + averageRir(log), 0) / todays.length < 1;

  if (next.length === 0) return { headline: 'Nothing to go on yet', detail: 'Log a few sets and the next session will be planned from them.' };
  if (down >= 2 || (down >= 1 && down >= next.length / 2)) {
    return { headline: 'A tough one', detail: 'Some weights were too heavy. They come down a little next time, so you can build back up with good reps.' };
  }
  if (grind) return { headline: 'You gave it everything', detail: 'Most sets went to the limit. Eat well and sleep well, and repeat the weights that are held back.' };
  if (up >= Math.max(2, next.length / 2)) return { headline: 'Strong session', detail: `${up} of ${next.length} lifts are ready for more weight next time.` };
  if (up >= 1) return { headline: 'Good work', detail: `${up} ${up === 1 ? 'lift is' : 'lifts are'} ready to go up. The rest stay put until the reps are there.` };
  return { headline: 'Steady progress', detail: 'The weights stay for now. Add reps first, and weight follows.' };
}

export type Freshness = 'fresh' | 'normal' | 'tired';

export interface StrainReport {
  level: Freshness;
  /** Plain-words reasons, for showing to the person. */
  reasons: string[];
  /** Hard sets rated in the window. */
  ratedSets: number;
  averageRir: number | null;
}

/** How far back to look. */
const WINDOW_DAYS = 10;
const MIN_RATED_SETS = 9;

const totalReps = (log: ExerciseLog) => log.reps.reduce((sum, reps) => sum + reps, 0);

/**
 * Whether recent training looks like the person is run down: most sets going to
 * the limit, or lifts getting worse at the same weight. Needs a few sessions of rated sets.
 */
export function strainReport(logs: readonly ExerciseLog[], today: string): StrainReport {
  const recent = logs.filter((log) => {
    const age = daysBetweenDates(log.date, today);
    return age >= 0 && age <= WINDOW_DAYS;
  });

  const rated = recent.filter(hasEffort);
  const ratedSets = rated.reduce((sum, log) => sum + log.reps.length, 0);
  const average = ratedSets > 0 ? rated.reduce((sum, log) => sum + averageRir(log) * log.reps.length, 0) / ratedSets : null;

  // Lifts that did worse than last time at the same weight.
  let slipped = 0;
  for (const id of new Set(recent.map((log) => log.exerciseId))) {
    const history = logs.filter((log) => log.exerciseId === id).sort((a, b) => a.date.localeCompare(b.date));
    const latest = history[history.length - 1];
    const before = history[history.length - 2];
    if (!latest || !before) continue;
    const sameWeight = Math.abs((latest.weightKg ?? 0) - (before.weightKg ?? 0)) < 0.01;
    if (sameWeight && totalReps(latest) <= totalReps(before) - 2) slipped += 1;
  }

  const reasons: string[] = [];
  if (average !== null && ratedSets >= MIN_RATED_SETS && average < 0.8) {
    reasons.push('Most of your recent sets went to the limit.');
  }
  if (slipped >= 2) reasons.push(`${slipped} lifts did worse than last time at the same weight.`);

  const level: Freshness =
    reasons.length > 0 ? 'tired' : average !== null && ratedSets >= MIN_RATED_SETS && average >= 2.7 ? 'fresh' : 'normal';

  return { level, reasons, ratedSets, averageRir: average };
}
