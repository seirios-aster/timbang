import type { MacroTargets } from '../nutrition/types';
import { fitDay } from './fit';
import { addTotals, mealTotals } from './totals';
import type { DayPlan, Macros } from './types';

/**
 * Tracking what was actually eaten on a calendar day, against the plan.
 *
 * The plan says what to eat. This records what happened: each planned meal can
 * be marked eaten or skipped, and food outside the plan can be added.
 */

export type MealStatus = 'eaten' | 'skipped';

export interface TrackedMeal {
  status: MealStatus;
  /** The meal's macros when it was marked. Kept, so later edits to the plan do not rewrite the day. */
  totals: Macros;
}

/** Food eaten outside the plan. */
export interface ExtraFood {
  id: string;
  name: string;
  totals: Macros;
  /** The meal it belongs to, when tracking without a plan. */
  meal?: string;
}

export interface DayLog {
  /** Status of planned meals, by meal id. A meal with no entry has not been decided yet. */
  meals: Record<string, TrackedMeal>;
  extras: ExtraFood[];
}

export const EMPTY_DAY_LOG: DayLog = { meals: {}, extras: [] };

const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Everything eaten so far: meals marked eaten, plus extras. */
export function eatenTotals(log: DayLog): Macros {
  const meals = Object.values(log.meals)
    .filter((meal) => meal.status === 'eaten')
    .map((meal) => meal.totals);
  return [...meals, ...log.extras.map((extra) => extra.totals)].reduce(addTotals, ZERO);
}

/** Target minus eaten. Negative values mean the target has been passed. */
export function remaining(targets: MacroTargets, eaten: Macros): Macros {
  return {
    kcal: targets.calories - eaten.kcal,
    protein: targets.proteinG - eaten.protein,
    carbs: targets.carbsG - eaten.carbs,
    fat: targets.fatG - eaten.fat,
  };
}

/** Planned meals that are neither eaten nor skipped yet. */
export function openMeals(day: DayPlan, log: DayLog) {
  return day.meals.filter((meal) => !log.meals[meal.id]);
}

/** What the day would end on if every open meal is eaten as planned. */
export function projectedTotals(day: DayPlan, log: DayLog): Macros {
  return openMeals(day, log).map(mealTotals).reduce(addTotals, eatenTotals(log));
}

/**
 * Re-portions the meals still to come so the day lands on target despite a
 * skipped meal or an off-plan snack. Meals already eaten or skipped are left alone.
 * Returns the day unchanged when nothing is left to adjust.
 */
export function makeUpDay(day: DayPlan, targets: MacroTargets, log: DayLog): DayPlan {
  const open = openMeals(day, log);
  if (open.length === 0) return day;

  const left = remaining(targets, eatenTotals(log));
  const stillNeeded: MacroTargets = {
    calories: Math.max(0, left.kcal),
    proteinG: Math.max(0, left.protein),
    carbsG: Math.max(0, left.carbs),
    fatG: Math.max(0, left.fat),
  };

  // Fit only the open meals, sharing what is left between them in their planned proportions.
  const shareTotal = open.reduce((sum, meal) => sum + meal.share, 0) || 1;
  const rest: DayPlan = { ...day, meals: open.map((meal) => ({ ...meal, share: meal.share / shareTotal })) };
  const fitted = new Map(fitDay(rest, stillNeeded).day.meals.map((meal) => [meal.id, meal.items]));

  return {
    ...day,
    meals: day.meals.map((meal) => (fitted.has(meal.id) ? { ...meal, items: fitted.get(meal.id)! } : meal)),
  };
}
