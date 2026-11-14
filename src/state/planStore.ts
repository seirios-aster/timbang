import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateWeek, reshuffleDay } from '@/domain/mealplan/generator';
import { randomSeed } from '@/domain/mealplan/rng';
import { rebalanceDay, setPortions, swapItem } from '@/domain/mealplan/swap';
import type { DayPlan, PlanPrefs, WeekPlan } from '@/domain/mealplan/types';
import type { MacroTargets } from '@/domain/nutrition/types';
import { appStorage, storageKey } from './storage';

interface PlanState {
  week: WeekPlan | null;
  build: (targets: MacroTargets, prefs: PlanPrefs) => void;
  reshuffle: (dayIndex: number, targets: MacroTargets, prefs: PlanPrefs) => void;
  swap: (dayIndex: number, mealId: string, itemIndex: number, foodId: string, portions: number) => void;
  setPortions: (dayIndex: number, mealId: string, itemIndex: number, portions: number) => void;
  rebalance: (dayIndex: number, targets: MacroTargets) => void;
  clear: () => void;
}

type Saved = Pick<PlanState, 'week'>;

function changeDay(week: WeekPlan | null, dayIndex: number, change: (day: DayPlan) => DayPlan): Saved {
  if (!week) return { week };
  return { week: { ...week, days: week.days.map((day) => (day.dayIndex === dayIndex ? change(day) : day)) } };
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      week: null,
      build: (targets, prefs) => set({ week: generateWeek(targets, prefs, randomSeed()) }),
      reshuffle: (dayIndex, targets, prefs) =>
        set((state) =>
          state.week ? { week: reshuffleDay(state.week, dayIndex, targets, prefs, randomSeed()) } : state,
        ),
      swap: (dayIndex, mealId, itemIndex, foodId, portions) =>
        set((state) => changeDay(state.week, dayIndex, (day) => swapItem(day, mealId, itemIndex, foodId, portions))),
      setPortions: (dayIndex, mealId, itemIndex, portions) =>
        set((state) => changeDay(state.week, dayIndex, (day) => setPortions(day, mealId, itemIndex, portions))),
      rebalance: (dayIndex, targets) =>
        set((state) => changeDay(state.week, dayIndex, (day) => rebalanceDay(day, targets))),
      clear: () => set({ week: null }),
    }),
    {
      name: storageKey('plan'),
      storage: appStorage<Saved>(),
      partialize: ({ week }) => ({ week }),
    },
  ),
);
