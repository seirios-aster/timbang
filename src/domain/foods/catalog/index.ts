import { defineFood } from '../defineFood';
import type { Food } from '../types';
import { almusalProteins } from './almusal';
import { carbs } from './carbs';
import { boosts, meryenda } from './meryenda';
import { gulay, palaman, prutas } from './sides';
import { ulam } from './ulam';

/**
 * Every food the planner knows about.
 *
 * Nutrition values are working estimates for typical home or carinderia cooking.
 * Before launch they should be checked against the DOST-FNRI Philippine Food
 * Composition Tables. To add a food, add an entry to the matching file in this folder.
 */
export const FOODS: readonly Food[] = [
  ...carbs,
  ...almusalProteins,
  ...ulam,
  ...gulay,
  ...prutas,
  ...palaman,
  ...meryenda,
  ...boosts,
].map(defineFood);

const BY_ID = new Map(FOODS.map((food) => [food.id, food]));

if (BY_ID.size !== FOODS.length) {
  throw new Error('Food catalog has duplicate ids');
}

/**
 * Foods the person created themselves. They live outside the catalog on purpose, so the plan
 * generator, which reads FOODS, never picks them. The app registers them at startup.
 */
const CUSTOM = new Map<string, Food>();

export function registerCustomFoods(foods: readonly Food[]) {
  CUSTOM.clear();
  for (const food of foods) CUSTOM.set(food.id, food);
}

/** Every food that can be looked up or logged: the catalog, then the person's own. */
export function allFoods(): Food[] {
  return [...FOODS, ...CUSTOM.values()];
}

export function findFood(id: string): Food | undefined {
  return BY_ID.get(id) ?? CUSTOM.get(id);
}

/** Shown if a food was removed while a plan still lists it, so a missing food never crashes the app. */
const MISSING: Food = defineFood({
  id: 'missing',
  name: 'Removed food',
  gloss: 'This food is no longer available',
  roles: [],
  slots: [],
  unit: 'serving',
  grams: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  tier: 1,
});

export function getFood(id: string): Food {
  const food = findFood(id);
  if (food) return food;
  if (id.startsWith('custom-')) return MISSING;
  throw new Error(`Unknown food: ${id}`);
}
