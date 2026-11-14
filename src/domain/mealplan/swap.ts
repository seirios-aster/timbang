import { getFood } from '../foods/catalog';
import { foodsFor } from '../foods/queries';
import type { Food } from '../foods/types';
import type { MacroTargets } from '../nutrition/types';
import { fitDay } from './fit';
import { foodTotals, itemTotals } from './totals';
import type { DayPlan, PlanItem, PlanPrefs, Totals } from './types';

export interface SwapOption {
  food: Food;
  /** Portion of the new food that best replaces the current one. */
  portions: number;
  /** New minus current, for the suggested portion. */
  delta: Totals;
}

function allowedPortions(food: Food): number[] {
  const { min, max, step } = food.portions;
  const values: number[] = [];
  for (let value = min; value <= max + 1e-9; value += step) values.push(Number(value.toFixed(2)));
  return values;
}

/** How different a replacement is from what it replaces. Calories count most, then protein. */
function distance(candidate: Totals, current: Totals): number {
  const kcal = (candidate.kcal - current.kcal) / Math.max(current.kcal, 50);
  const protein = (candidate.protein - current.protein) / Math.max(current.protein, 10);
  return kcal ** 2 + 0.5 * protein ** 2;
}

function bestPortion(food: Food, current: Totals): { portions: number; totals: Totals; distance: number } {
  let best: { portions: number; totals: Totals; distance: number } | null = null;
  for (const portions of allowedPortions(food)) {
    const totals = foodTotals(food, portions);
    const candidate = { portions, totals, distance: distance(totals, current) };
    if (!best || candidate.distance < best.distance) best = candidate;
  }
  return best!;
}

/** Foods that could replace one item in a meal, closest match first. */
export function swapOptions(day: DayPlan, mealId: string, itemIndex: number, prefs: PlanPrefs): SwapOption[] {
  const meal = day.meals.find((m) => m.id === mealId);
  const item = meal?.items[itemIndex];
  if (!meal || !item) return [];

  const current = itemTotals(item);
  const inMeal = new Set(meal.items.map((i) => i.foodId));

  return foodsFor(item.role, meal.slot, prefs)
    .filter((food) => !inMeal.has(food.id))
    .map((food) => {
      const match = bestPortion(food, current);
      return {
        food,
        portions: match.portions,
        distance: match.distance,
        delta: {
          kcal: match.totals.kcal - current.kcal,
          protein: match.totals.protein - current.protein,
          carbs: match.totals.carbs - current.carbs,
          fat: match.totals.fat - current.fat,
          pricePhp: match.totals.pricePhp - current.pricePhp,
        },
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .map(({ food, portions, delta }) => ({ food, portions, delta }));
}

function updateItem(
  day: DayPlan,
  mealId: string,
  itemIndex: number,
  change: (item: PlanItem) => PlanItem,
): DayPlan {
  return {
    ...day,
    meals: day.meals.map((meal) =>
      meal.id === mealId
        ? { ...meal, items: meal.items.map((item, i) => (i === itemIndex ? change(item) : item)) }
        : meal,
    ),
  };
}

export function swapItem(
  day: DayPlan,
  mealId: string,
  itemIndex: number,
  foodId: string,
  portions: number,
): DayPlan {
  return updateItem(day, mealId, itemIndex, (item) => ({ ...item, foodId, portions }));
}

export function setPortions(day: DayPlan, mealId: string, itemIndex: number, portions: number): DayPlan {
  return updateItem(day, mealId, itemIndex, (item) => {
    const { min, max } = getFood(item.foodId).portions;
    return { ...item, portions: Math.min(max, Math.max(min, portions)) };
  });
}

/** Keeps the day's foods but re-fits every portion to the targets. */
export function rebalanceDay(day: DayPlan, targets: MacroTargets): DayPlan {
  return fitDay(day, targets).day;
}
