import { describe, expect, it } from 'vitest';
import { FOODS, getFood } from '../foods/catalog';
import { isAllowed } from '../foods/queries';
import { computeTargets } from '../nutrition/targets';
import type { MacroTargets, Profile } from '../nutrition/types';
import { generateWeek, planKey, reshuffleDay } from './generator';
import { rebalanceDay, setPortions, swapItem, swapOptions } from './swap';
import { dayTotals } from './totals';
import { DEFAULT_PREFS, type PlanPrefs } from './types';

const base: Profile = {
  sex: 'male',
  age: 25,
  heightCm: 170,
  weightKg: 70,
  lifestyle: 'desk',
  trainingDays: 4,
  experience: 'intermediate',
  goal: 'maintain',
};

const profiles: Record<string, Profile> = {
  'small woman cutting': { ...base, sex: 'female', heightCm: 155, weightKg: 55, goal: 'lose' },
  'average man cutting': { ...base, goal: 'lose' },
  'average man maintaining': base,
  'beginner bulking': { ...base, weightKg: 62, experience: 'beginner', goal: 'gain' },
  'big man bulking': { ...base, heightCm: 182, weightKg: 92, lifestyle: 'onFeet', trainingDays: 6, goal: 'gain' },
};

const prefSets: Record<string, PlanPrefs> = {
  default: DEFAULT_PREFS,
  tipid: { ...DEFAULT_PREFS, budget: 1 },
  'sagana with whey': { ...DEFAULT_PREFS, budget: 3, hasWhey: true, mealsPerDay: 5 },
  'three meals, no pork': { ...DEFAULT_PREFS, mealsPerDay: 3, exclude: ['pork'] },
  'no seafood or dairy': { ...DEFAULT_PREFS, exclude: ['seafood', 'dairy'] },
};

describe('food catalog', () => {
  it('has portion ranges that make sense', () => {
    for (const food of FOODS) {
      expect(food.portions.min, food.id).toBeGreaterThan(0);
      expect(food.portions.max, food.id).toBeGreaterThanOrEqual(food.portions.min);
      expect(food.kcal, food.id).toBeGreaterThan(0);
    }
  });
});

describe('generateWeek', () => {
  for (const [profileName, profile] of Object.entries(profiles)) {
    for (const [prefName, prefs] of Object.entries(prefSets)) {
      it(`lands near the targets: ${profileName}, ${prefName}`, () => {
        const targets = computeTargets(profile);
        const week = generateWeek(targets, prefs, 12345);

        expect(week.days).toHaveLength(7);
        let kcal = 0;
        let protein = 0;
        for (const day of week.days) {
          const totals = dayTotals(day);
          kcal += totals.kcal / 7;
          protein += totals.protein / 7;

          // Any single day stays close. Portions move in whole eggs and half cups, so not exact.
          expect(Math.abs(totals.kcal - targets.calories) / targets.calories, 'day calories').toBeLessThan(0.08);
          expect(Math.abs(totals.protein - targets.proteinG) / targets.proteinG, 'day protein').toBeLessThan(0.2);
          expect(day.meals).toHaveLength(prefs.mealsPerDay);
          for (const meal of day.meals) expect(meal.items.length).toBeGreaterThan(0);
        }

        // The week as a whole lands tighter.
        expect(Math.abs(kcal - targets.calories) / targets.calories, 'week calories').toBeLessThan(0.05);
        expect(Math.abs(protein - targets.proteinG) / targets.proteinG, 'week protein').toBeLessThan(0.1);
      });
    }
  }

  it('only uses foods the preferences allow', () => {
    const prefs: PlanPrefs = { budget: 1, mealsPerDay: 4, exclude: ['pork', 'seafood'], hasWhey: false };
    const week = generateWeek(computeTargets(base), prefs, 99);
    for (const day of week.days) {
      for (const meal of day.meals) {
        for (const item of meal.items) expect(isAllowed(getFood(item.foodId), prefs), item.foodId).toBe(true);
      }
    }
  });

  it('builds the same plan from the same seed', () => {
    const targets = computeTargets(base);
    const a = generateWeek(targets, DEFAULT_PREFS, 7);
    const b = generateWeek(targets, DEFAULT_PREFS, 7);
    expect(a.days).toEqual(b.days);
  });

  it('varies the ulam across the week', () => {
    const week = generateWeek(computeTargets(base), DEFAULT_PREFS, 2024);
    const ulam = week.days.flatMap((day) =>
      day.meals.flatMap((meal) => meal.items.filter((item) => item.role === 'ulam').map((item) => item.foodId)),
    );
    expect(new Set(ulam).size).toBeGreaterThanOrEqual(7);
  });
});

describe('planKey', () => {
  it('changes when targets or preferences change', () => {
    const targets: MacroTargets = { calories: 2200, proteinG: 150, carbsG: 250, fatG: 60 };
    const key = planKey(targets, DEFAULT_PREFS);
    expect(planKey({ ...targets, calories: 2300 }, DEFAULT_PREFS)).not.toBe(key);
    expect(planKey(targets, { ...DEFAULT_PREFS, budget: 1 })).not.toBe(key);
    expect(planKey(targets, { ...DEFAULT_PREFS })).toBe(key);
  });
});

describe('editing a day', () => {
  const targets = computeTargets(base);
  const week = generateWeek(targets, DEFAULT_PREFS, 555);
  const day = week.days[0]!;
  const lunch = day.meals.find((meal) => meal.slot === 'tanghalian')!;
  const ulamIndex = lunch.items.findIndex((item) => item.role === 'ulam');

  it('offers swaps with the same role, closest calories first', () => {
    const options = swapOptions(day, lunch.id, ulamIndex, DEFAULT_PREFS);
    expect(options.length).toBeGreaterThan(3);
    for (const option of options) {
      expect(option.food.roles).toContain('ulam');
      expect(lunch.items.map((item) => item.foodId)).not.toContain(option.food.id);
    }
    expect(Math.abs(options[0]!.delta.kcal)).toBeLessThan(120);
  });

  it('swaps one item and leaves the rest alone', () => {
    const option = swapOptions(day, lunch.id, ulamIndex, DEFAULT_PREFS)[0]!;
    const swapped = swapItem(day, lunch.id, ulamIndex, option.food.id, option.portions);
    const newLunch = swapped.meals.find((meal) => meal.id === lunch.id)!;
    expect(newLunch.items[ulamIndex]!.foodId).toBe(option.food.id);
    expect(swapped.meals.filter((meal) => meal.id !== lunch.id)).toEqual(
      day.meals.filter((meal) => meal.id !== lunch.id),
    );
  });

  it('keeps portions inside what the food allows', () => {
    const changed = setPortions(day, lunch.id, ulamIndex, 99);
    const item = changed.meals.find((meal) => meal.id === lunch.id)!.items[ulamIndex]!;
    expect(item.portions).toBe(getFood(item.foodId).portions.max);
  });

  it('rebalances back toward the targets after an edit', () => {
    const riceIndex = lunch.items.findIndex((item) => item.role === 'carb');
    const off = setPortions(day, lunch.id, riceIndex, 3);
    const fixed = rebalanceDay(off, targets);
    expect(Math.abs(dayTotals(fixed).kcal - targets.calories) / targets.calories).toBeLessThan(0.06);
  });

  it('reshuffles only the chosen day', () => {
    const next = reshuffleDay(week, 2, targets, DEFAULT_PREFS, 4242);
    expect(next.days[2]).not.toEqual(week.days[2]);
    expect(next.days.filter((d) => d.dayIndex !== 2)).toEqual(week.days.filter((d) => d.dayIndex !== 2));
  });
});
