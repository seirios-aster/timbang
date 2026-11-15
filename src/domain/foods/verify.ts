import type { Food } from './types';

/**
 * Checking catalog foods against USDA FoodData Central, which is public domain (CC0).
 * The comparison is pure, so it is tested here. Fetching from USDA is in usdaCheck.test.ts.
 */

export interface Per100g {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** One nutrient entry as FoodData Central reports it. The search and detail endpoints name the fields differently. */
export interface UsdaNutrient {
  number?: string;
  nutrientNumber?: string;
  value?: number;
  amount?: number;
  unit?: string;
  unitName?: string;
}

/** USDA nutrient numbers: energy in kcal, protein, total fat, carbohydrate by difference. */
const NUMBER = { kcal: '208', protein: '203', fat: '204', carbs: '205' } as const;

function find(nutrients: readonly UsdaNutrient[], number: string): number {
  const match = nutrients.find((item) => (item.number ?? item.nutrientNumber) === number);
  return match?.value ?? match?.amount ?? 0;
}

/** Calories and macros per 100 g from a USDA food record. */
export function readPer100g(nutrients: readonly UsdaNutrient[]): Per100g {
  return {
    kcal: find(nutrients, NUMBER.kcal),
    protein: find(nutrients, NUMBER.protein),
    carbs: find(nutrients, NUMBER.carbs),
    fat: find(nutrients, NUMBER.fat),
  };
}

export type Nutrient = keyof Per100g;

export interface Deviation {
  nutrient: Nutrient;
  catalog: number;
  usda: number;
  /** Catalog minus USDA. */
  difference: number;
  /** True when the catalog value is close enough to leave alone. */
  ok: boolean;
}

/** Calories and macros differ by cooking, so the check allows some give before asking for a review. */
const TOLERANCE = { kcal: { relative: 0.15, absolute: 15 }, macro: { relative: 0.2, absolute: 2 } };

/** Compares one catalog portion with what USDA says the same weight of food has. */
export function compareFood(food: Food, per100: Per100g): Deviation[] {
  const scale = food.grams / 100;
  return (['kcal', 'protein', 'carbs', 'fat'] as const).map((nutrient) => {
    const catalog = food[nutrient];
    const usda = per100[nutrient] * scale;
    const difference = catalog - usda;
    const limit = TOLERANCE[nutrient === 'kcal' ? 'kcal' : 'macro'];
    const ok = Math.abs(difference) <= Math.max(limit.absolute, Math.abs(usda) * limit.relative);
    return { nutrient, catalog, usda, difference, ok };
  });
}
