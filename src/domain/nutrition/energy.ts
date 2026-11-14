import type { BmrFormula, Lifestyle, Profile } from './types';

const LIFESTYLE_BASE: Record<Lifestyle, number> = {
  desk: 1.2,
  mixed: 1.3,
  onFeet: 1.4,
  manual: 1.5,
};

/** Added to the lifestyle multiplier for each lifting session per week. */
const PER_TRAINING_DAY = 0.035;
const MAX_MULTIPLIER = 1.9;

export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg * (1 - bodyFatPct / 100);
}

/**
 * Resting energy use in kcal per day.
 * Uses Katch-McArdle when body fat is known, otherwise Mifflin-St Jeor.
 */
export function bmr(profile: Profile): { value: number; formula: BmrFormula } {
  if (profile.bodyFatPct !== undefined) {
    const lean = leanMassKg(profile.weightKg, profile.bodyFatPct);
    return { value: 370 + 21.6 * lean, formula: 'katch' };
  }
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return { value: base + (profile.sex === 'male' ? 5 : -161), formula: 'mifflin' };
}

export function activityMultiplier(lifestyle: Lifestyle, trainingDays: number): number {
  const days = Math.min(7, Math.max(0, trainingDays));
  return Math.min(MAX_MULTIPLIER, LIFESTYLE_BASE[lifestyle] + days * PER_TRAINING_DAY);
}

/** Calories that keep body weight stable. */
export function maintenanceCalories(profile: Profile): number {
  return bmr(profile).value * activityMultiplier(profile.lifestyle, profile.trainingDays);
}
