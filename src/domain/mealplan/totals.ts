import { getFood } from '../foods/catalog';
import type { Food } from '../foods/types';
import type { DayPlan, PlanItem, PlanMeal, Totals } from './types';

const ZERO: Totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, pricePhp: 0 };

export function foodTotals(food: Food, portions: number): Totals {
  return {
    kcal: food.kcal * portions,
    protein: food.protein * portions,
    carbs: food.carbs * portions,
    fat: food.fat * portions,
    pricePhp: food.pricePhp * portions,
  };
}

export function itemTotals(item: PlanItem): Totals {
  return foodTotals(getFood(item.foodId), item.portions);
}

export function addTotals(a: Totals, b: Totals): Totals {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    pricePhp: a.pricePhp + b.pricePhp,
  };
}

export function mealTotals(meal: PlanMeal): Totals {
  return meal.items.map(itemTotals).reduce(addTotals, ZERO);
}

export function dayTotals(day: DayPlan): Totals {
  return day.meals.map(mealTotals).reduce(addTotals, ZERO);
}
