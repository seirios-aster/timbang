import type { BudgetTier, DietTag, FoodRole, MealSlot } from '../foods/types';

export type MealsPerDay = 3 | 4 | 5;

export interface PlanPrefs {
  budget: BudgetTier;
  mealsPerDay: MealsPerDay;
  exclude: DietTag[];
  hasWhey: boolean;
}

export interface PlanItem {
  foodId: string;
  /** The role this food was picked for. Swaps offer other foods with the same role. */
  role: FoodRole;
  /** Number of serving units, for example 1.5 cups. */
  portions: number;
}

export interface PlanMeal {
  id: string;
  slot: MealSlot;
  label: string;
  /** Fraction of the day's calories this meal aims for. */
  share: number;
  items: PlanItem[];
}

export interface DayPlan {
  /** 0 = Monday. */
  dayIndex: number;
  /** Seed used to build this day. Reshuffling picks a new one. */
  seed: number;
  meals: PlanMeal[];
}

export interface WeekPlan {
  days: DayPlan[];
  /** Identifies the targets and preferences the plan was built for. */
  builtFor: string;
  createdAt: string;
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Summed macros for a food, a meal or a day. */
export type Totals = Macros;

export const DEFAULT_PREFS: PlanPrefs = {
  budget: 2,
  mealsPerDay: 4,
  exclude: [],
  hasWhey: false,
};
