export interface WeighIn {
  id: string;
  /** Local calendar date, YYYY-MM-DD. One weigh-in per date. */
  date: string;
  weightKg: number;
}

export interface TrendPoint {
  date: string;
  weightKg: number;
  /** Smoothed weight, which filters out daily water swings. */
  trendKg: number;
}

export type PaceStatus = 'needsData' | 'onPace' | 'tooFast' | 'tooSlow' | 'wrongWay';

export interface PaceReport {
  status: PaceStatus;
  /** Measured change in kg per week. Undefined until there is enough data. */
  actualKgPerWeek?: number;
  plannedKgPerWeek: number;
}
