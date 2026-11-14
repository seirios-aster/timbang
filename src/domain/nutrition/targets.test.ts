import { describe, expect, it } from 'vitest';
import { activityMultiplier, bmr } from './energy';
import { computeTargets, defaultPace } from './targets';
import type { Profile } from './types';

const lifter: Profile = {
  sex: 'male',
  age: 25,
  heightCm: 170,
  weightKg: 70,
  lifestyle: 'desk',
  trainingDays: 4,
  experience: 'intermediate',
  goal: 'maintain',
};

describe('bmr', () => {
  it('uses Mifflin-St Jeor by default', () => {
    // 10*70 + 6.25*170 - 5*25 + 5
    expect(bmr(lifter)).toEqual({ value: 1642.5, formula: 'mifflin' });
  });

  it('subtracts 161 for women', () => {
    expect(bmr({ ...lifter, sex: 'female' }).value).toBe(1476.5);
  });

  it('switches to Katch-McArdle when body fat is known', () => {
    const result = bmr({ ...lifter, bodyFatPct: 20 });
    expect(result.formula).toBe('katch');
    expect(result.value).toBeCloseTo(370 + 21.6 * 56, 5);
  });
});

describe('activityMultiplier', () => {
  it('adds to the lifestyle base for each training day', () => {
    expect(activityMultiplier('desk', 0)).toBe(1.2);
    expect(activityMultiplier('desk', 4)).toBeCloseTo(1.34, 5);
  });

  it('never exceeds 1.9', () => {
    expect(activityMultiplier('manual', 7)).toBeLessThanOrEqual(1.9);
  });
});

describe('computeTargets', () => {
  it('keeps maintenance calories when the goal is to maintain', () => {
    const targets = computeTargets(lifter);
    expect(targets.calories).toBe(targets.maintenance);
    expect(targets.weeklyChangeKg).toBeCloseTo(0, 1);
  });

  it('cuts about 20% by default', () => {
    const targets = computeTargets({ ...lifter, goal: 'lose' });
    expect(targets.calories / targets.maintenance).toBeCloseTo(0.8, 1);
    expect(targets.weeklyChangeKg).toBeLessThan(0);
  });

  it('gives beginners a larger surplus than advanced lifters', () => {
    const beginner = computeTargets({ ...lifter, goal: 'gain', experience: 'beginner' });
    const advanced = computeTargets({ ...lifter, goal: 'gain', experience: 'advanced' });
    expect(beginner.calories).toBeGreaterThan(advanced.calories);
    expect(defaultPace('gain', 'beginner')).toBe('fast');
    expect(defaultPace('gain', 'advanced')).toBe('easy');
  });

  it('sets more protein per kg on a cut', () => {
    expect(computeTargets({ ...lifter, goal: 'lose' }).proteinG).toBe(155); // 70 * 2.2, rounded to 5
    expect(computeTargets(lifter).proteinG).toBe(125); // 70 * 1.8, rounded to 5
  });

  it('makes the macros add up to the calorie target', () => {
    for (const goal of ['lose', 'maintain', 'gain'] as const) {
      const t = computeTargets({ ...lifter, goal });
      const fromMacros = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
      expect(Math.abs(fromMacros - t.calories)).toBeLessThanOrEqual(25);
    }
  });

  it('never goes below the minimum intake', () => {
    const small: Profile = {
      ...lifter,
      sex: 'female',
      heightCm: 150,
      weightKg: 42,
      age: 55,
      trainingDays: 0,
      goal: 'lose',
      pace: 'fast',
    };
    const targets = computeTargets(small);
    expect(targets.calories).toBe(1200);
    expect(targets.floorApplied).toBe(true);
  });

  it('caps protein for heavier people', () => {
    const heavy = computeTargets({ ...lifter, weightKg: 120, goal: 'lose' });
    // Reference weight is BMI 27.5 at 170 cm, about 79.5 kg.
    expect(heavy.proteinG).toBe(175);
  });

  it('respects manual overrides', () => {
    const targets = computeTargets({ ...lifter, goal: 'lose', pace: 'easy', proteinPerKg: 2.5 });
    expect(targets.calories / targets.maintenance).toBeCloseTo(0.9, 1);
    expect(targets.proteinG).toBe(175);
  });
});
