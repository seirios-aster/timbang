import type { PaceReport, TrendPoint, WeighIn } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many days either side shape the trend at a given date. Higher is smoother. */
const TREND_WINDOW_DAYS = 5;

/** The pace check looks at this many most recent days. */
const PACE_WINDOW_DAYS = 28;
const MIN_SPAN_DAYS = 7;
const MIN_ENTRIES = 3;

/** Within this many kg per week of zero counts as holding steady. */
const STEADY_BAND = 0.15;

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function sortByDate(entries: readonly WeighIn[]): WeighIn[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Smoothed weight at each weigh-in, which filters out daily water swings.
 * For every date it fits a straight line through the nearby weigh-ins, counting
 * closer days more, and reads the line at that date. Unlike a running average,
 * this does not lag behind a steady loss or gain.
 */
export function trend(entries: readonly WeighIn[]): TrendPoint[] {
  const sorted = sortByDate(entries);
  const first = sorted[0];
  if (!first) return [];

  const days = sorted.map((entry) => daysBetween(first.date, entry.date));

  return sorted.map((entry, index) => {
    const here = days[index] ?? 0;
    let sumW = 0;
    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumXY = 0;

    sorted.forEach((other, i) => {
      const x = (days[i] ?? 0) - here;
      const weight = Math.exp(-0.5 * (x / TREND_WINDOW_DAYS) ** 2);
      sumW += weight;
      sumX += weight * x;
      sumY += weight * other.weightKg;
      sumXX += weight * x * x;
      sumXY += weight * x * other.weightKg;
    });

    // The fitted line's value at this date. Falls back to the weighted average when the fit is undefined.
    const denominator = sumW * sumXX - sumX * sumX;
    const trendKg =
      Math.abs(denominator) < 1e-9 ? sumY / sumW : (sumXX * sumY - sumX * sumXY) / denominator;

    return { date: entry.date, weightKg: entry.weightKg, trendKg };
  });
}

/**
 * Change in kg per week over the recent window, from a straight-line fit through the weigh-ins.
 * Returns undefined until there are enough entries spread over enough days.
 */
export function weeklyRate(entries: readonly WeighIn[]): number | undefined {
  const sorted = sortByDate(entries);
  const last = sorted[sorted.length - 1];
  if (!last) return undefined;

  const recent = sorted.filter((entry) => daysBetween(entry.date, last.date) <= PACE_WINDOW_DAYS);
  const first = recent[0];
  if (!first || recent.length < MIN_ENTRIES || daysBetween(first.date, last.date) < MIN_SPAN_DAYS) {
    return undefined;
  }

  const xs = recent.map((entry) => daysBetween(first.date, entry.date));
  const ys = recent.map((entry) => entry.weightKg);
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;

  let numerator = 0;
  let denominator = 0;
  xs.forEach((x, i) => {
    numerator += (x - meanX) * ((ys[i] ?? meanY) - meanY);
    denominator += (x - meanX) ** 2;
  });
  if (denominator === 0) return undefined;

  return (numerator / denominator) * 7;
}

/** Compares measured weight change with what the calorie target should produce. */
export function paceReport(entries: readonly WeighIn[], plannedKgPerWeek: number): PaceReport {
  const actual = weeklyRate(entries);
  if (actual === undefined) return { status: 'needsData', plannedKgPerWeek };

  const report = { actualKgPerWeek: actual, plannedKgPerWeek };

  if (Math.abs(plannedKgPerWeek) < 0.05) {
    return { ...report, status: Math.abs(actual) <= STEADY_BAND ? 'onPace' : 'wrongWay' };
  }

  const direction = Math.sign(plannedKgPerWeek);
  const progress = actual * direction;
  const planned = Math.abs(plannedKgPerWeek);
  const tolerance = Math.max(0.1, planned * 0.35);

  if (progress < -STEADY_BAND) return { ...report, status: 'wrongWay' };
  if (progress > planned + tolerance) return { ...report, status: 'tooFast' };
  if (progress < planned - tolerance) return { ...report, status: 'tooSlow' };
  return { ...report, status: 'onPace' };
}
