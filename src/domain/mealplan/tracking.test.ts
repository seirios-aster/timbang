import { describe, expect, it } from 'vitest';
import { computeTargets } from '../nutrition/targets';
import type { Profile } from '../nutrition/types';
import { generateWeek } from './generator';
import { dayTotals, mealTotals } from './totals';
import { eatenTotals, EMPTY_DAY_LOG, makeUpDay, openMeals, projectedTotals, remaining, type DayLog } from './tracking';
import { DEFAULT_PREFS } from './types';

const profile: Profile = {
  sex: 'male',
  age: 25,
  heightCm: 170,
  weightKg: 70,
  lifestyle: 'desk',
  trainingDays: 4,
  experience: 'intermediate',
  goal: 'maintain',
};
const targets = computeTargets(profile);
const day = generateWeek(targets, DEFAULT_PREFS, 4321).days[0]!;
const [breakfast, lunch, snack, dinner] = day.meals as [(typeof day.meals)[0], (typeof day.meals)[0], (typeof day.meals)[0], (typeof day.meals)[0]];

const mark = (meal: (typeof day.meals)[0], status: 'eaten' | 'skipped') => ({
  [meal.id]: { status, totals: mealTotals(meal) },
});

describe('eatenTotals', () => {
  it('is zero before anything is marked', () => {
    expect(eatenTotals(EMPTY_DAY_LOG)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('counts eaten meals and extras, not skipped meals', () => {
    const log: DayLog = {
      meals: { ...mark(breakfast, 'eaten'), ...mark(snack, 'skipped') },
      extras: [{ id: 'x', name: 'Halo-halo', totals: { kcal: 300, protein: 5, carbs: 60, fat: 5 } }],
    };
    expect(eatenTotals(log).kcal).toBeCloseTo(mealTotals(breakfast).kcal + 300, 5);
  });

  it('keeps the macros from when a meal was marked', () => {
    const log: DayLog = { meals: { [breakfast.id]: { status: 'eaten', totals: { kcal: 500, protein: 30, carbs: 60, fat: 15 } } }, extras: [] };
    expect(eatenTotals(log).kcal).toBe(500);
  });
});

describe('remaining and projections', () => {
  it('subtracts what was eaten from the target', () => {
    const log: DayLog = { meals: mark(breakfast, 'eaten'), extras: [] };
    const left = remaining(targets, eatenTotals(log));
    expect(left.kcal).toBeCloseTo(targets.calories - mealTotals(breakfast).kcal, 5);
  });

  it('goes negative once the target is passed', () => {
    expect(remaining(targets, { kcal: targets.calories + 200, protein: 0, carbs: 0, fat: 0 }).kcal).toBe(-200);
  });

  it('projects the full plan when nothing is marked', () => {
    expect(projectedTotals(day, EMPTY_DAY_LOG).kcal).toBeCloseTo(dayTotals(day).kcal, 5);
  });

  it('projects lower once a meal is skipped', () => {
    const log: DayLog = { meals: mark(snack, 'skipped'), extras: [] };
    expect(projectedTotals(day, log).kcal).toBeCloseTo(dayTotals(day).kcal - mealTotals(snack).kcal, 5);
    expect(openMeals(day, log)).toHaveLength(3);
  });
});

describe('makeUpDay', () => {
  it('raises the meals still to come to cover a skipped meal', () => {
    const log: DayLog = { meals: { ...mark(breakfast, 'eaten'), ...mark(lunch, 'skipped') }, extras: [] };
    const before = projectedTotals(day, log);
    const adjusted = makeUpDay(day, targets, log);
    const after = projectedTotals(adjusted, log);

    expect(Math.abs(after.kcal - targets.calories)).toBeLessThan(Math.abs(before.kcal - targets.calories));
    expect(after.kcal).toBeGreaterThan(before.kcal);
    // Eaten and skipped meals are left exactly as they were.
    expect(adjusted.meals[0]).toEqual(breakfast);
    expect(adjusted.meals[1]).toEqual(lunch);
  });

  it('trims the meals still to come after an off-plan snack', () => {
    const log: DayLog = { meals: {}, extras: [{ id: 'x', name: 'Milk tea', totals: { kcal: 450, protein: 4, carbs: 80, fat: 12 } }] };
    const adjusted = makeUpDay(day, targets, log);
    expect(dayTotals(adjusted).kcal).toBeLessThan(dayTotals(day).kcal);
    expect(Math.abs(projectedTotals(adjusted, log).kcal - targets.calories) / targets.calories).toBeLessThan(0.08);
  });

  it('changes nothing when every meal is already decided', () => {
    const log: DayLog = {
      meals: { ...mark(breakfast, 'eaten'), ...mark(lunch, 'eaten'), ...mark(snack, 'skipped'), ...mark(dinner, 'eaten') },
      extras: [],
    };
    expect(makeUpDay(day, targets, log)).toBe(day);
  });
});
