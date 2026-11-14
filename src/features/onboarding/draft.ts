import { DEFAULT_PREFS, type PlanPrefs } from '@/domain/mealplan/types';
import type { Experience, Goal, Lifestyle, Profile, Sex } from '@/domain/nutrition/types';

/** Answers collected so far. Choices start empty so nothing is assumed for the person. */
export interface Draft {
  sex?: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  lifestyle?: Lifestyle;
  trainingDays: number;
  experience?: Experience;
  goal?: Goal;
  prefs: PlanPrefs;
}

export const EMPTY_DRAFT: Draft = {
  age: 25,
  heightCm: 165,
  weightKg: 65,
  trainingDays: 4,
  prefs: DEFAULT_PREFS,
};

export function draftFromProfile(profile: Profile, prefs: PlanPrefs): Draft {
  return { ...profile, prefs };
}

/** Returns a full profile once every question is answered. Keeps earlier fine-tuning. */
export function profileFromDraft(draft: Draft, previous: Profile | null): Profile | null {
  const { sex, lifestyle, experience, goal } = draft;
  if (!sex || !lifestyle || !experience || !goal) return null;
  return {
    ...previous,
    sex,
    lifestyle,
    experience,
    goal,
    age: draft.age,
    heightCm: draft.heightCm,
    weightKg: draft.weightKg,
    trainingDays: draft.trainingDays,
  };
}
