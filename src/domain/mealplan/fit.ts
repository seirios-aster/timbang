import { getFood } from '../foods/catalog';
import type { Food } from '../foods/types';
import type { MacroTargets } from '../nutrition/types';
import type { DayPlan } from './types';

/**
 * Portion fitting.
 *
 * Given a day's foods, adjust how much of each to serve so the day lands on the
 * calorie and macro targets. Portions move in the steps each food allows (half
 * cups of rice, whole eggs), so this is a small search, not exact algebra.
 */

const WEIGHTS = { kcal: 4, protein: 3, carbs: 1, fat: 1, mealBalance: 0.6 };
const MAX_ROUNDS = 120;

/** A single change may move a portion by up to this many steps. */
const MAX_STEPS_PER_MOVE = 3;

interface Slot {
  meal: number;
  food: Food;
  portions: number;
}

/** Running totals for the day, kept up to date as portions change. */
interface State {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  mealKcal: number[];
}

interface Move {
  index: number;
  /** Change in portions. */
  delta: number;
}

const relative = (value: number, target: number) => (target > 0 ? (value - target) / target : 0);

function measure(slots: Slot[], mealCount: number): State {
  const state: State = { kcal: 0, protein: 0, carbs: 0, fat: 0, mealKcal: new Array<number>(mealCount).fill(0) };
  for (const slot of slots) shift(state, slot, slot.portions);
  return state;
}

function shift(state: State, slot: Slot, delta: number) {
  const kcal = slot.food.kcal * delta;
  state.kcal += kcal;
  state.protein += slot.food.protein * delta;
  state.carbs += slot.food.carbs * delta;
  state.fat += slot.food.fat * delta;
  state.mealKcal[slot.meal] = (state.mealKcal[slot.meal] ?? 0) + kcal;
}

/** Lower is better. Zero means every target is met and meals are sized as planned. */
function score(state: State, shares: number[], targets: MacroTargets): number {
  let balance = 0;
  for (let i = 0; i < shares.length; i += 1) {
    const share = shares[i] ?? 0;
    balance += relative(state.mealKcal[i] ?? 0, share * targets.calories) ** 2 * share;
  }
  return (
    WEIGHTS.kcal * relative(state.kcal, targets.calories) ** 2 +
    WEIGHTS.protein * relative(state.protein, targets.proteinG) ** 2 +
    WEIGHTS.carbs * relative(state.carbs, targets.carbsG) ** 2 +
    WEIGHTS.fat * relative(state.fat, targets.fatG) ** 2 +
    WEIGHTS.mealBalance * balance
  );
}

function possibleMoves(slots: Slot[]): Move[] {
  const moves: Move[] = [];
  slots.forEach((slot, index) => {
    const { min, max, step } = slot.food.portions;
    for (let steps = 1; steps <= MAX_STEPS_PER_MOVE; steps += 1) {
      const delta = step * steps;
      if (slot.portions + delta <= max + 1e-9) moves.push({ index, delta });
      if (slot.portions - delta >= min - 1e-9) moves.push({ index, delta: -delta });
    }
  });
  return moves;
}

/**
 * Returns the day with portions adjusted toward the targets, plus how far off it still is.
 * Each round tries every single change and every pair of changes, and keeps the best one.
 * Pairs matter: adding ulam for protein usually needs rice taken away in the same move.
 */
export function fitDay(day: DayPlan, targets: MacroTargets): { day: DayPlan; error: number } {
  const slots: Slot[] = day.meals.flatMap((meal, mealIndex) =>
    meal.items.map((item) => ({ meal: mealIndex, food: getFood(item.foodId), portions: item.portions })),
  );
  const shares = day.meals.map((meal) => meal.share);
  const state = measure(slots, shares.length);

  let best = score(state, shares, targets);

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const moves = possibleMoves(slots);
    let bestFirst: Move | null = null;
    let bestSecond: Move | null = null;
    let bestScore = best;

    for (let i = 0; i < moves.length; i += 1) {
      const first = moves[i]!;
      const firstSlot = slots[first.index]!;
      shift(state, firstSlot, first.delta);

      const single = score(state, shares, targets);
      if (single < bestScore - 1e-9) {
        bestScore = single;
        bestFirst = first;
        bestSecond = null;
      }

      for (let j = i + 1; j < moves.length; j += 1) {
        const second = moves[j]!;
        if (second.index === first.index) continue;
        const secondSlot = slots[second.index]!;
        shift(state, secondSlot, second.delta);
        const pair = score(state, shares, targets);
        if (pair < bestScore - 1e-9) {
          bestScore = pair;
          bestFirst = first;
          bestSecond = second;
        }
        shift(state, secondSlot, -second.delta);
      }

      shift(state, firstSlot, -first.delta);
    }

    if (!bestFirst) break;
    for (const move of [bestFirst, bestSecond]) {
      if (!move) continue;
      const slot = slots[move.index]!;
      shift(state, slot, move.delta);
      slot.portions = Number((slot.portions + move.delta).toFixed(2));
    }
    best = bestScore;
  }

  let cursor = 0;
  const fitted: DayPlan = {
    ...day,
    meals: day.meals.map((meal) => ({
      ...meal,
      items: meal.items.map((item) => ({ ...item, portions: slots[cursor++]!.portions })),
    })),
  };

  return { day: fitted, error: best };
}
