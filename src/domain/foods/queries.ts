import type { PlanPrefs } from '../mealplan/types';
import { FOODS } from './catalog';
import type { Food, FoodRole, MealSlot } from './types';

/** True when the food fits the person's budget and the ingredients they avoid. */
export function isAllowed(food: Food, prefs: PlanPrefs): boolean {
  if (food.tier > prefs.budget) return false;
  if (food.needsWhey && !prefs.hasWhey) return false;
  return !food.contains.some((tag) => prefs.exclude.includes(tag));
}

/** Foods that can play `role` in a `slot` meal for this person. */
export function foodsFor(role: FoodRole, slot: MealSlot, prefs: PlanPrefs): Food[] {
  return FOODS.filter(
    (food) => food.roles.includes(role) && food.slots.includes(slot) && isAllowed(food, prefs),
  );
}
