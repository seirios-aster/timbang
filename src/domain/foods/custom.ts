import type { Macros } from '../mealplan/types';
import { kcalFromMacros } from './defineFood';
import type { Food } from './types';

/**
 * A food the person entered themselves, from a label, a menu or their own recipe.
 * Values are per serving. Calories follow the grams unless they were typed in,
 * since many menus list only calories.
 */
export function createCustomFood(name: string, per: Macros, id = `custom-${Date.now().toString(36)}`): Food {
  const kcal = per.kcal > 0 ? per.kcal : kcalFromMacros(per.protein, per.carbs, per.fat);
  return {
    id,
    name: name.trim() || 'My food',
    gloss: 'My own food',
    roles: [],
    slots: ['almusal', 'tanghalian', 'meryenda', 'hapunan'],
    unit: 'serving',
    // Unknown. Zero tells the screens not to show a weight.
    grams: 0,
    kcal,
    protein: per.protein,
    carbs: per.carbs,
    fat: per.fat,
    tier: 1,
    contains: [],
    portions: { min: 0.5, max: 10, step: 0.5 },
  };
}
