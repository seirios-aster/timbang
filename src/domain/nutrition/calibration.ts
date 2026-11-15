import { daysBetween, sortByDate, weeklyRate } from '../progress/trend';
import type { WeighIn } from '../progress/types';

/**
 * Checking the calorie estimate against what the scale does.
 *
 * The formulas estimate maintenance calories, and bodies differ from them by a few
 * hundred. If the person has been eating to their target, the weight they actually gained
 * or lost shows how far off the estimate was. We turn that into a small correction to
 * the maintenance estimate, offered for the person to accept.
 */

const KCAL_PER_KG = 7700;

export const CALIBRATION = {
  /** Days of weigh-ins needed. Shorter spans are mostly water. */
  minDays: 14,
  minEntries: 5,
  /** Corrections are rounded to this. */
  step: 50,
  /** Smaller corrections are not worth a change. */
  minChange: 100,
  /** One correction never moves the estimate by more than this. */
  maxChange: 300,
} as const;

export interface Calibration {
  /** Change to the maintenance estimate, in kcal a day. Positive means the body burns more than estimated. */
  maintenanceDeltaKcal: number;
  actualKgPerWeek: number;
  plannedKgPerWeek: number;
  /** Days of weigh-ins it is based on. */
  days: number;
}

/**
 * Works out a correction from weigh-ins taken after `since`, or null when there is not enough
 * data or the estimate is already close. `plannedKgPerWeek` is what the current target predicts.
 */
export function suggestCalibration(
  entries: readonly WeighIn[],
  plannedKgPerWeek: number,
  since?: string,
): Calibration | null {
  const usable = sortByDate(entries).filter((entry) => !since || entry.date > since);
  const first = usable[0];
  const last = usable[usable.length - 1];
  if (!first || !last || usable.length < CALIBRATION.minEntries) return null;

  const days = daysBetween(first.date, last.date);
  if (days < CALIBRATION.minDays) return null;

  const actual = weeklyRate(usable);
  if (actual === undefined) return null;

  // Eating X below the body's real needs loses weight at X / 7700 per kg. Solve for the real needs.
  const raw = ((plannedKgPerWeek - actual) * KCAL_PER_KG) / 7;
  const rounded = Math.round(raw / CALIBRATION.step) * CALIBRATION.step;
  if (Math.abs(rounded) < CALIBRATION.minChange) return null;

  const clamped = Math.max(-CALIBRATION.maxChange, Math.min(CALIBRATION.maxChange, rounded));
  return { maintenanceDeltaKcal: clamped, actualKgPerWeek: actual, plannedKgPerWeek, days };
}
