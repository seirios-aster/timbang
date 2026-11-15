import type { Food, FoodInput, PortionRange, ServingUnit } from './types';

const DEFAULT_PORTIONS: Record<ServingUnit, PortionRange> = {
  cup: { min: 0.5, max: 3, step: 0.5 },
  pc: { min: 1, max: 4, step: 1 },
  slice: { min: 1, max: 4, step: 1 },
  serving: { min: 0.5, max: 2.5, step: 0.5 },
  bowl: { min: 0.5, max: 2, step: 0.5 },
  tbsp: { min: 1, max: 3, step: 1 },
  can: { min: 0.5, max: 2, step: 0.5 },
  scoop: { min: 1, max: 2, step: 1 },
  glass: { min: 1, max: 2, step: 1 },
  stick: { min: 1, max: 2, step: 1 },
};

/** Calories from macros: 4 per gram of protein and carbs, 9 per gram of fat. */
export function kcalFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

export function defineFood(input: FoodInput): Food {
  return {
    ...input,
    kcal: kcalFromMacros(input.protein, input.carbs, input.fat),
    source: input.source ?? 'estimate',
    contains: input.contains ?? [],
    portions: input.portions ?? DEFAULT_PORTIONS[input.unit],
  };
}
