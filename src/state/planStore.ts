import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateWeek, reshuffleDay } from '@/domain/mealplan/generator';
import {
  addItem,
  addMeal,
  copyDayToAll,
  emptyOwnWeek,
  ownWeekFrom,
  removeItem,
  removeMeal,
  renameMeal,
  setItemPortions,
} from '@/domain/mealplan/ownPlan';
import { randomSeed } from '@/domain/mealplan/rng';
import { rebalanceDay, setPortions, swapItem } from '@/domain/mealplan/swap';
import type { DayPlan, PlanMode, PlanPrefs, WeekPlan } from '@/domain/mealplan/types';
import type { MacroTargets } from '@/domain/nutrition/types';
import { todayIndex, todayIso } from '@/lib/date';
import { appStorage, storageKey } from './storage';

/**
 * A one-day change to the suggested plan, such as bigger portions to cover a skipped meal.
 * It applies only on its date, so next week's plan for that weekday is untouched.
 */
export interface DayOverride {
  date: string;
  dayIndex: number;
  day: DayPlan;
}

interface PlanState {
  mode: PlanMode;
  /** The suggested plan. Kept when switching to a plan of one's own, in case of switching back. */
  week: WeekPlan | null;
  /** The plan the person wrote. */
  ownWeek: WeekPlan | null;
  override: DayOverride | null;

  setMode: (mode: PlanMode) => void;
  build: (targets: MacroTargets, prefs: PlanPrefs) => void;
  reshuffle: (dayIndex: number, targets: MacroTargets, prefs: PlanPrefs) => void;
  swap: (dayIndex: number, mealId: string, itemIndex: number, foodId: string, portions: number) => void;
  setPortions: (dayIndex: number, mealId: string, itemIndex: number, portions: number) => void;
  rebalance: (dayIndex: number, targets: MacroTargets) => void;
  /** Uses an adjusted version of today's plan for today only. */
  adjustToday: (day: DayPlan) => void;
  /** Goes back to today's plan as written. */
  clearAdjustment: () => void;

  /** Starts a plan of one's own, empty or copied from the suggested week. */
  startOwn: (from: 'blank' | 'suggested') => void;
  /** Applies an edit from the own-plan rules in the domain layer to one day. */
  editOwn: (dayIndex: number, change: (day: DayPlan) => DayPlan) => void;
  copyOwnToAll: (dayIndex: number) => void;

  clear: () => void;
}

type Saved = Pick<PlanState, 'mode' | 'week' | 'ownWeek' | 'override'>;

type PlanSlice = Pick<PlanState, 'mode' | 'week' | 'ownWeek' | 'override'>;

/** True when the override is for the given weekday and is still dated today. */
function overrideApplies(override: DayOverride | null, dayIndex: number): override is DayOverride {
  return override !== null && override.dayIndex === dayIndex && override.date === todayIso();
}

/** The week in use for the current mode. Null when tracking without a plan, or before a plan exists. */
export function selectWeek(state: PlanSlice): WeekPlan | null {
  if (state.mode === 'own') return state.ownWeek;
  if (state.mode === 'suggested') return state.week;
  return null;
}

/** The plan for a weekday as it should be shown: today's adjusted version if there is one, else the week's. */
export function selectDay(state: PlanSlice, dayIndex: number): DayPlan | undefined {
  if (state.mode === 'suggested' && overrideApplies(state.override, dayIndex)) return state.override.day;
  return selectWeek(state)?.days[dayIndex];
}

/** Applies an edit to a day of the suggested plan. While today is adjusted, edits to today go to the adjusted version. */
function changeDay(state: PlanSlice, dayIndex: number, change: (day: DayPlan) => DayPlan): Partial<Saved> {
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
      mode: 'suggested',
      week: null,
      ownWeek: null,
      override: null,

      setMode: (mode) => set({ mode }),
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

      startOwn: (from) =>
        set((state) => ({
          ownWeek: from === 'suggested' && state.week ? ownWeekFrom(state.week) : emptyOwnWeek(),
        })),
      editOwn: (dayIndex, change) =>
        set((state) =>
          state.ownWeek
            ? { ownWeek: { ...state.ownWeek, days: state.ownWeek.days.map((day) => (day.dayIndex === dayIndex ? change(day) : day)) } }
            : state,
        ),
      copyOwnToAll: (dayIndex) => set((state) => (state.ownWeek ? { ownWeek: copyDayToAll(state.ownWeek, dayIndex) } : state)),

      clear: () => set({ mode: 'suggested', week: null, ownWeek: null, override: null }),
    }),
    {
      name: storageKey('plan'),
      storage: appStorage<Saved>(),
      partialize: ({ mode, week, ownWeek, override }) => ({ mode, week, ownWeek, override }),
    },
  ),
);

/** Edits for the own plan, bundled so screens do not import the domain functions one by one. */
export const ownPlanEdits = { addItem, addMeal, removeItem, removeMeal, renameMeal, setItemPortions };
