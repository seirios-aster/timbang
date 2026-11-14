import { bmr, maintenanceCalories } from './energy';
import type { Experience, Goal, Pace, Profile, Sex, Targets } from './types';

/** Calorie change from maintenance, as a fraction, for each goal and pace. */
const ADJUSTMENT: Record<Goal, Record<Pace, number>> = {
  lose: { easy: -0.1, steady: -0.2, fast: -0.25 },
  maintain: { easy: 0, steady: 0, fast: 0 },
  gain: { easy: 0.05, steady: 0.1, fast: 0.15 },
};

const PROTEIN_PER_KG: Record<Goal, number> = {
  lose: 2.2,
  maintain: 1.8,
  gain: 2.0,
};

const MIN_CALORIES: Record<Sex, number> = { male: 1500, female: 1200 };

const FAT_SHARE_OF_CALORIES = 0.25;
const MIN_FAT_PER_KG = 0.6;

/** Protein is set per kg, but capped at the weight of BMI 27.5 so it does not balloon at high body fat. */
const PROTEIN_REFERENCE_BMI = 27.5;

const KCAL_PER_KG_BODY_WEIGHT = 7700;

/** A common rule of thumb for daily water. Needs rise with training, sweat and heat. */
const WATER_ML_PER_KG = 35;

/**
 * Newer lifters build muscle faster, so they can use a bigger surplus.
 * Cutting defaults to the middle pace for everyone.
 */
export function defaultPace(goal: Goal, experience: Experience): Pace {
  if (goal !== 'gain') return 'steady';
  const byExperience: Record<Experience, Pace> = {
    beginner: 'fast',
    intermediate: 'steady',
    advanced: 'easy',
  };
  return byExperience[experience];
}

export function defaultProteinPerKg(goal: Goal): number {
  return PROTEIN_PER_KG[goal];
}

function proteinReferenceWeight(profile: Profile): number {
  const heightM = profile.heightCm / 100;
  return Math.min(profile.weightKg, PROTEIN_REFERENCE_BMI * heightM * heightM);
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

export function computeTargets(profile: Profile): Targets {
  const { value: bmrValue, formula } = bmr(profile);
  const maintenance = maintenanceCalories(profile);

  const pace = profile.pace ?? defaultPace(profile.goal, profile.experience);
  const wanted = maintenance * (1 + ADJUSTMENT[profile.goal][pace]);
  const floor = MIN_CALORIES[profile.sex];
  const floorApplied = wanted < floor;
  const calories = roundTo(Math.max(wanted, floor), 10);

  const referenceWeight = proteinReferenceWeight(profile);
  const proteinPerKg = profile.proteinPerKg ?? defaultProteinPerKg(profile.goal);
  const proteinG = roundTo(referenceWeight * proteinPerKg, 5);

  const fatG = roundTo(
    Math.max((calories * FAT_SHARE_OF_CALORIES) / 9, referenceWeight * MIN_FAT_PER_KG),
    5,
  );
  const carbsG = Math.max(0, roundTo((calories - proteinG * 4 - fatG * 9) / 4, 5));

  // Work from the rounded figures so the numbers shown always add up.
  const shownMaintenance = roundTo(maintenance, 10);
  const deltaKcal = calories - shownMaintenance;

  return {
    bmr: Math.round(bmrValue),
    maintenance: shownMaintenance,
    calories,
    deltaKcal,
    weeklyChangeKg: (deltaKcal * 7) / KCAL_PER_KG_BODY_WEIGHT,
    waterL: roundTo((profile.weightKg * WATER_ML_PER_KG) / 1000, 0.1),
    proteinG,
    carbsG,
    fatG,
    pace,
    proteinPerKg,
    formula,
    floorApplied,
  };
}
