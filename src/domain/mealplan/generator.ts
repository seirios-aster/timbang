import { getFood } from '../foods/catalog';
import { foodsFor } from '../foods/queries';
import type { Food, FoodRole, MealSlot } from '../foods/types';
import type { MacroTargets } from '../nutrition/types';
import { fitDay } from './fit';
import { createRng, pickWeighted, type Rng } from './rng';
import { DAY_OUTLINES, TEMPLATES, type MealTemplate, type Pick } from './templates';
import type { DayPlan, PlanItem, PlanMeal, PlanPrefs, WeekPlan } from './types';

/** How many different menus to try for a day before keeping the closest one. */
const ATTEMPTS_PER_DAY = 14;

/** How strongly to steer away from foods already used this week. */
const REPEAT_PENALTY = 3;

/**
 * When protein makes up more than this share of the day's calories, the planner
 * starts favouring leaner foods. Typical for cuts.
 */
const LEAN_BIAS_STARTS_AT = 0.24;
const LEAN_BIAS_STRENGTH = 18;
const MAX_LEAN_BIAS = 3;

/** Below this many calories a day, optional extras are left out more and more often. */
const FULL_EXTRAS_FROM_KCAL = 2600;

/** How often each food has been used so far, to keep the week varied. */
export type Usage = Map<string, number>;

/** A short string that changes whenever the targets or preferences change. */
export function planKey(targets: MacroTargets, prefs: PlanPrefs): string {
  return [
    targets.calories,
    targets.proteinG,
    targets.carbsG,
    targets.fatG,
    prefs.budget,
    prefs.mealsPerDay,
    [...prefs.exclude].sort().join('+'),
    prefs.hasWhey ? 'whey' : '',
  ].join('|');
}

function startingPortion(food: Food): number {
  const { min, max } = food.portions;
  return Math.min(max, Math.max(min, 1));
}

/** 0 for ordinary targets, rising to MAX_LEAN_BIAS as the targets get more protein-dense. */
function leanBias(targets: MacroTargets): number {
  const proteinShare = (targets.proteinG * 4) / targets.calories;
  return Math.min(MAX_LEAN_BIAS, Math.max(0, (proteinShare - LEAN_BIAS_STARTS_AT) * LEAN_BIAS_STRENGTH));
}

/** Share of a food's calories that come from protein. */
function proteinDensity(food: Food): number {
  return food.kcal > 0 ? (food.protein * 4) / food.kcal : 0;
}

const PROTEIN_ROLES = new Set<FoodRole>(['protein', 'ulam', 'boost', 'meryenda']);

interface MenuContext {
  prefs: PlanPrefs;
  usage: Usage;
  rng: Rng;
  /** How strongly to favour lean foods. */
  bias: number;
  /** Chance, 0 to 1, that an optional extra is added to a meal. */
  extrasChance: number;
}

function chooseFood(pick: Pick, slot: MealSlot, taken: Set<string>, context: MenuContext): Food | undefined {
  const { prefs, usage, rng, bias } = context;
  const pool = foodsFor(pick.role, slot, prefs).filter(
    (food) =>
      !taken.has(food.id) &&
      (!pick.from || pick.from.includes(food.id)) &&
      !(pick.not && pick.not.includes(food.id)),
  );
  const weights = pool.map((food) => {
    const variety = 1 / (1 + REPEAT_PENALTY * (usage.get(food.id) ?? 0));
    const lean = PROTEIN_ROLES.has(pick.role) ? (0.15 + proteinDensity(food)) ** bias : 1;
    return variety * lean;
  });
  return pickWeighted(pool, weights, rng);
}

/** Fills a template with foods. Returns null when a required pick has no allowed food. */
function buildMeal(
  template: MealTemplate,
  slot: MealSlot,
  takenToday: Set<string>,
  context: MenuContext,
): PlanItem[] | null {
  const items: PlanItem[] = [];
  const taken = new Set(takenToday);

  for (const pick of template.picks) {
    if (pick.optional && context.rng() > context.extrasChance) continue;
    const food = chooseFood(pick, slot, taken, context);
    if (!food) {
      if (pick.optional) continue;
      return null;
    }
    taken.add(food.id);
    items.push({ foodId: food.id, role: pick.role, portions: startingPortion(food) });
  }
  return items;
}

function buildMenu(dayIndex: number, seed: number, context: Omit<MenuContext, 'rng'>): DayPlan {
  const rng = createRng(seed);
  const menuContext: MenuContext = { ...context, rng };
  const takenToday = new Set<string>();

  const meals: PlanMeal[] = DAY_OUTLINES[context.prefs.mealsPerDay].map((outline, mealIndex) => {
    const templates = [...TEMPLATES[outline.slot]];
    let items: PlanItem[] | null = null;

    // Try templates in weighted random order until one can be filled.
    while (!items && templates.length > 0) {
      const template = pickWeighted(
        templates,
        templates.map((t) => t.weight),
        rng,
      )!;
      templates.splice(templates.indexOf(template), 1);
      items = buildMeal(template, outline.slot, takenToday, menuContext);
    }

    const finalItems = items ?? [];
    for (const item of finalItems) {
      // Rice can repeat within a day. Everything else should not.
      if (item.role !== 'carb') takenToday.add(item.foodId);
    }

    return {
      id: `d${dayIndex}-m${mealIndex}`,
      slot: outline.slot,
      label: outline.label,
      share: outline.share,
      items: finalItems,
    };
  });

  return { dayIndex, seed, meals };
}

/**
 * Builds one day: tries several menus, fits the portions of each to the targets,
 * and keeps the menu that lands closest.
 */
export function generateDay(
  dayIndex: number,
  seed: number,
  targets: MacroTargets,
  prefs: PlanPrefs,
  usage: Usage = new Map(),
): DayPlan {
  let best: { day: DayPlan; error: number } | null = null;
  const context = {
    prefs,
    usage,
    bias: leanBias(targets),
    extrasChance: Math.min(1, targets.calories / FULL_EXTRAS_FROM_KCAL),
  };

  for (let attempt = 0; attempt < ATTEMPTS_PER_DAY; attempt += 1) {
    const menu = buildMenu(dayIndex, seed + attempt * 7919, context);
    const fitted = fitDay(menu, targets);
    if (!best || fitted.error < best.error) best = fitted;
  }

  return { ...best!.day, seed };
}

function recordUsage(day: DayPlan, usage: Usage) {
  for (const meal of day.meals) {
    for (const item of meal.items) {
      // Staples like rice are expected daily, so they do not count against variety.
      if (getFood(item.foodId).roles.includes('carb')) continue;
      usage.set(item.foodId, (usage.get(item.foodId) ?? 0) + 1);
    }
  }
}

export function generateWeek(targets: MacroTargets, prefs: PlanPrefs, seed: number): WeekPlan {
  const usage: Usage = new Map();
  const days: DayPlan[] = [];

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const day = generateDay(dayIndex, seed + dayIndex * 104729, targets, prefs, usage);
    recordUsage(day, usage);
    days.push(day);
  }

  return { days, builtFor: planKey(targets, prefs), createdAt: new Date().toISOString() };
}

/** Rebuilds one day of the week with a new seed, steering away from the other days' foods. */
export function reshuffleDay(
  week: WeekPlan,
  dayIndex: number,
  targets: MacroTargets,
  prefs: PlanPrefs,
  seed: number,
): WeekPlan {
  const usage: Usage = new Map();
  week.days.forEach((day) => {
    // The current menu counts too, so a reshuffle actually changes the day.
    recordUsage(day, usage);
  });

  const fresh = generateDay(dayIndex, seed, targets, prefs, usage);
  return { ...week, days: week.days.map((day) => (day.dayIndex === dayIndex ? fresh : day)) };
}
