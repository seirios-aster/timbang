import type { Lifestyle } from './types';

/** A common daily goal, and a reasonable place to start. */
export const DEFAULT_STEP_GOAL = 8000;

/** Days of steps needed before an average means anything. */
const MIN_DAYS = 4;
const WINDOW_DAYS = 7;

export interface StepAverage {
  average: number;
  /** Days with steps logged in the window. */
  days: number;
}

function shiftIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days)).toISOString().slice(0, 10);
}

/** Average steps over the last seven days, counting only days that were logged. Null with too few days. */
export function stepAverage(steps: Readonly<Record<string, number>>, today: string): StepAverage | null {
  const counts: number[] = [];
  for (let back = 0; back < WINDOW_DAYS; back += 1) {
    const value = steps[shiftIso(today, -back)];
    if (value !== undefined && value > 0) counts.push(value);
  }
  if (counts.length < MIN_DAYS) return null;
  return { average: Math.round(counts.reduce((a, b) => a + b, 0) / counts.length), days: counts.length };
}

/**
 * Which lifestyle level a typical day of steps fits. Bands follow the commonly used
 * pedometer classes: under 5,000 sedentary, 5,000 to 7,499 low active,
 * 7,500 to 9,999 somewhat active, 10,000 or more active.
 */
export function lifestyleFromSteps(averageSteps: number): Lifestyle {
  if (averageSteps < 5000) return 'desk';
  if (averageSteps < 7500) return 'mixed';
  if (averageSteps < 10000) return 'onFeet';
  return 'manual';
}
