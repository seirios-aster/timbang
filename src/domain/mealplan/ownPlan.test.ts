import { describe, expect, it } from 'vitest';
import { createCustomFood } from '../foods/custom';
import { findFood, getFood, registerCustomFoods } from '../foods/catalog';
import { computeTargets } from '../nutrition/targets';
import { generateWeek } from './generator';
import {
  addItem,
  addMeal,
  copyDayToAll,
  emptyOwnWeek,
  ownWeekFrom,
  removeItem,
  removeMeal,
  renameMeal,
  setItemPortions,
} from './ownPlan';
import { dayTotals, mealTotals } from './totals';
import { DEFAULT_PREFS } from './types';

describe('own plan', () => {
  it('starts with three empty meals on each of seven days', () => {
    const week = emptyOwnWeek();
    expect(week.days).toHaveLength(7);
    for (const day of week.days) {
      expect(day.meals.map((meal) => meal.label)).toEqual(['Almusal', 'Tanghalian', 'Hapunan']);
      expect(day.meals.every((meal) => meal.items.length === 0)).toBe(true);
    }
    const ids = week.days.flatMap((day) => day.meals.map((meal) => meal.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('edits meals and foods one step at a time', () => {
    let day = emptyOwnWeek().days[0]!;
    const lunch = day.meals[1]!;
    day = addItem(day, lunch.id, 'kanin', 1.5);
    day = addItem(day, lunch.id, 'chicken-adobo', 1);
    expect(mealTotals(day.meals[1]!).kcal).toBeCloseTo(getFood('kanin').kcal * 1.5 + getFood('chicken-adobo').kcal, 5);

    day = setItemPortions(day, lunch.id, 0, 2);
    expect(day.meals[1]!.items[0]!.portions).toBe(2);
    expect(setItemPortions(day, lunch.id, 0, 0).meals[1]!.items[0]!.portions).toBe(0.25);

    day = removeItem(day, lunch.id, 1);
    expect(day.meals[1]!.items).toHaveLength(1);

    day = addMeal(day, '  Pre-workout ');
    expect(day.meals.at(-1)!.label).toBe('Pre-workout');
    day = renameMeal(day, lunch.id, 'Lunch at work');
    expect(day.meals[1]!.label).toBe('Lunch at work');
    expect(renameMeal(day, lunch.id, '   ')).toBe(day);
    day = removeMeal(day, lunch.id);
    expect(day.meals.map((meal) => meal.label)).toEqual(['Almusal', 'Hapunan', 'Pre-workout']);
  });

  it('copies one day to every other day without sharing meal ids', () => {
    let week = emptyOwnWeek();
    const monday = addItem(week.days[0]!, week.days[0]!.meals[0]!.id, 'pandesal', 3);
    week = { ...week, days: week.days.map((day) => (day.dayIndex === 0 ? monday : day)) };

    const copied = copyDayToAll(week, 0);
    expect(copied.days[0]).toBe(monday);
    for (const day of copied.days.slice(1)) {
      expect(day.meals[0]!.items).toEqual([{ foodId: 'pandesal', role: 'ulam', portions: 3 }]);
      expect(day.dayIndex).toBe(copied.days.indexOf(day));
    }
    const ids = copied.days.flatMap((day) => day.meals.map((meal) => meal.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('can start from a suggested week and be edited without changing it', () => {
    const suggested = generateWeek(computeTargets({ sex: 'male', age: 25, heightCm: 170, weightKg: 70, lifestyle: 'desk', trainingDays: 3, experience: 'beginner', goal: 'maintain' }), DEFAULT_PREFS, 9);
    const own = ownWeekFrom(suggested);
    expect(dayTotals(own.days[2]!).kcal).toBeCloseTo(dayTotals(suggested.days[2]!).kcal, 5);
    const edited = addItem(own.days[2]!, own.days[2]!.meals[0]!.id, 'saging', 1);
    expect(dayTotals(edited).kcal).toBeGreaterThan(dayTotals(suggested.days[2]!).kcal);
    expect(suggested.days[2]!.meals[0]!.id).not.toBe(own.days[2]!.meals[0]!.id);
  });
});

describe('custom foods', () => {
  const food = createCustomFood('Nanay\'s adobo', { kcal: 0, protein: 20, carbs: 5, fat: 15 }, 'custom-test');

  it('works out calories from the grams unless they were typed', () => {
    expect(food.kcal).toBe(20 * 4 + 5 * 4 + 15 * 9);
    expect(createCustomFood('Milk tea', { kcal: 320, protein: 0, carbs: 60, fat: 8 }).kcal).toBe(320);
  });

  it('is found once registered, and never joins the generated plans', () => {
    registerCustomFoods([food]);
    expect(findFood('custom-test')?.name).toBe("Nanay's adobo");
    const week = generateWeek(computeTargets({ sex: 'male', age: 25, heightCm: 170, weightKg: 70, lifestyle: 'desk', trainingDays: 3, experience: 'beginner', goal: 'maintain' }), DEFAULT_PREFS, 3);
    const used = week.days.flatMap((day) => day.meals.flatMap((meal) => meal.items.map((item) => item.foodId)));
    expect(used).not.toContain('custom-test');
  });

  it('shows a placeholder if a custom food has gone missing, instead of crashing', () => {
    registerCustomFoods([]);
    expect(getFood('custom-gone').name).toBe('Removed food');
    expect(() => getFood('not-a-food')).toThrow();
  });
});
