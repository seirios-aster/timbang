/** The part a food plays in a meal. Swaps happen between foods that share a role. */
export type FoodRole =
  | 'carb' // kanin, pandesal, oats
  | 'protein' // breakfast proteins: itlog, tapa, tuyo
  | 'ulam' // lunch and dinner dishes
  | 'gulay'
  | 'prutas'
  | 'palaman' // spreads and toppings
  | 'meryenda' // stand-alone snacks
  | 'boost'; // small protein add-ons

export type MealSlot = 'almusal' | 'tanghalian' | 'meryenda' | 'hapunan';

/** 1 = tipid, 2 = sakto, 3 = sagana. A plan may use foods at or below its tier. */
export type BudgetTier = 1 | 2 | 3;

/** Ingredients a person can choose to leave out. */
export type DietTag = 'pork' | 'beef' | 'seafood' | 'dairy' | 'egg';

export type ServingUnit =
  | 'cup'
  | 'pc'
  | 'slice'
  | 'serving'
  | 'bowl'
  | 'tbsp'
  | 'can'
  | 'scoop'
  | 'glass'
  | 'stick';

export interface PortionRange {
  min: number;
  max: number;
  step: number;
}

export interface Food {
  id: string;
  /** The name people use at home or at the carinderia. */
  name: string;
  /** Short English description. */
  gloss: string;
  roles: FoodRole[];
  slots: MealSlot[];
  /** One portion is one unit, weighing roughly `grams`. */
  unit: ServingUnit;
  grams: number;
  /** Per one unit. Calories are derived from the macros so totals always agree. */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Rough peso cost for one unit, home-cooked or carinderia. An estimate, not a quote. */
  pricePhp: number;
  tier: BudgetTier;
  contains: DietTag[];
  portions: PortionRange;
  /** Only offered when the person says they use protein powder. */
  needsWhey?: boolean;
}

/** What goes into the catalog files. Calories and common defaults are filled in by `defineFood`. */
export type FoodInput = Omit<Food, 'kcal' | 'contains' | 'portions'> & {
  contains?: DietTag[];
  portions?: PortionRange;
};
