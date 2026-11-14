import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateWeek, reshuffleDay } from '@/domain/mealplan/generator';
import { randomSeed } from '@/domain/mealplan/rng';
import { rebalanceDay, setPortions, swapItem } from '@/domain/mealplan/swap';
import type { DayPlan, PlanPrefs, WeekPlan } from '@/domain/mealplan/types';
import type { MacroTargets } from '@/domain/nutrition/types';
import { todayIndex, todayIso } from '@/lib/date';
import { appStorage, storageKey } from './storage';

/**
 * A one-day change to the plan, such as bigger portions to cover a skipped meal.
 * It applies only on its date, so next week's plan for that weekday is untouched.
 */
export interface DayOverride {
  date: string;
  dayIndex: number;
  day: DayPlan;
}

interface PlanState {
  week: WeekPlan | null;
  override: DayOverride | null;
  build: (targets: MacroTargets, prefs: PlanPrefs) => void;
  reshuffle: (dayIndex: number, targets: MacroTargets, prefs: PlanPrefs) => void;
  swap: (dayIndex: number, mealId: string, itemIndex: number, foodId: string, portions: number) => void;
  setPortions: (dayIndex: number, mealId: string, itemIndex: number, portions: number) => void;
  rebalance: (dayIndex: number, targets: MacroTargets) => void;
  /** Uses an adjusted version of today's plan for today only. */
  adjustToday: (day: DayPlan) => void;
  /** Goes back to today's plan as written. */
  clearAdjustment: () => void;
  clear: () => void;
}

type Saved = Pick<PlanState, 'week' | 'override'>;

/** True when the override is for the given weekday and is still dated today. */
function overrideApplies(override: DayOverride | null, dayIndex: number): override is DayOverride {
  return override !== null && override.dayIndex === dayIndex && override.date === todayIso();
}

/** The plan for a weekday as it should be shown: today's adjusted version if there is one, else the weekly plan. */
export function effectiveDay(week: WeekPlan, override: DayOverride | null, dayIndex: number): DayPlan | undefined {
  return overrideApplies(override, dayIndex) ? override.day : week.days[dayIndex];
}

/** Applies an edit to a day. While today is adjusted, edits to today go to the adjusted version. */
function changeDay(state: Saved, dayIndex: number, change: (day: DayPlan) => DayPlan): Partial<Saved> {
  if (overrideApplies(state.override, dayIndex)) {
    return { override: { ...state.override, day: change(state.override.day) } };
  }
  if (!state.week) return {};
  return {
    week: { ...state.week, days: state.week.days.map((day) => (day.dayIndex === dayIndex ? change(day) : day)) },
  };
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      week: null,
      override: null,
      build: (targets, prefs) => set({ week: generateWeek(targets, prefs, randomSeed()), override: null }),
      reshuffle: (dayIndex, targets, prefs) =>
        set((state) =>
          state.week
            ? {
                week: reshuffleDay(state.week, dayIndex, targets, prefs, randomSeed()),
                // A new menu replaces any adjustment made to the old one.
                override: overrideApplies(state.override, dayIndex) ? null : state.override,
              }
            : state,
        ),
      swap: (dayIndex, mealId, itemIndex, foodId, portions) =>
        set((state) => changeDay(state, dayIndex, (day) => swapItem(day, mealId, itemIndex, foodId, portions))),
      setPortions: (dayIndex, mealId, itemIndex, portions) =>
        set((state) => changeDay(state, dayIndex, (day) => setPortions(day, mealId, itemIndex, portions))),
      rebalance: (dayIndex, targets) =>
        set((state) => changeDay(state, dayIndex, (day) => rebalanceDay(day, targets))),
      adjustToday: (day) => set({ override: { date: todayIso(), dayIndex: todayIndex(), day } }),
      clearAdjustment: () => set({ override: null }),
      clear: () => set({ week: null, override: null }),
    }),
    {
      name: storageKey('plan'),
      storage: appStorage<Saved>(),
      partialize: ({ week, override }) => ({ week, override }),
    },
  ),
);
