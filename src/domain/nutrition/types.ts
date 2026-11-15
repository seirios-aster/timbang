export type Sex = 'male' | 'female';

/** What a normal day looks like outside the gym. */
export type Lifestyle = 'desk' | 'mixed' | 'onFeet' | 'manual';

export type Experience = 'beginner' | 'intermediate' | 'advanced';

export type Goal = 'lose' | 'maintain' | 'gain';

/** How hard to push the deficit or surplus. */
export type Pace = 'easy' | 'steady' | 'fast';

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  lifestyle: Lifestyle;
  /** Lifting sessions per week, 0 to 7. */
  trainingDays: number;
  experience: Experience;
  goal: Goal;

  // Optional fine-tuning. When absent, defaults are derived from the fields above.
  bodyFatPct?: number;
  pace?: Pace;
  proteinPerKg?: number;
  /** A correction to the estimated maintenance calories, from how the scale actually moved. */
  calorieAdjustment?: number;
  /** The date the correction was made. Later weigh-ins are used to check it. */
  calibratedOn?: string;
}

export type BmrFormula = 'mifflin' | 'katch';

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Targets extends MacroTargets {
  bmr: number;
  maintenance: number;
  /** The part of `maintenance` that comes from the person's own weigh-ins, not the formula. */
  calibrationKcal: number;
  /** Target minus maintenance, in kcal. Negative when cutting. */
  deltaKcal: number;
  /** A daily water amount to aim for, in litres. */
  waterL: number;
  /** Expected body weight change per week at this target, in kg. */
  weeklyChangeKg: number;
  pace: Pace;
  proteinPerKg: number;
  formula: BmrFormula;
  /** True when the target was raised to the minimum safe intake. */
  floorApplied: boolean;
}

export const PROFILE_LIMITS = {
  age: { min: 18, max: 80 },
  heightCm: { min: 130, max: 220 },
  weightKg: { min: 35, max: 200 },
  bodyFatPct: { min: 4, max: 50 },
  proteinPerKg: { min: 1.2, max: 3 },
  trainingDays: { min: 0, max: 7 },
} as const;
