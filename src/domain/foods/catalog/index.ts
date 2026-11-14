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

export function getFood(id: string): Food {
  const food = BY_ID.get(id);
  if (!food) throw new Error(`Unknown food: ${id}`);
  return food;
}

export function findFood(id: string): Food | undefined {
  return BY_ID.get(id);
}
