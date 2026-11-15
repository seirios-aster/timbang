import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EMPTY_DAY_LOG, type DayLog, type MealStatus } from '@/domain/mealplan/tracking';
import type { Macros } from '@/domain/mealplan/types';
import { appStorage, storageKey } from './storage';

/** Older days are dropped past this many. */
const DAYS_KEPT = 60;

interface MealLogState {
  /** What was eaten, by calendar date (YYYY-MM-DD). */
  days: Record<string, DayLog>;
  /** Marks a planned meal eaten or skipped. A null status clears the mark. */
  markMeal: (date: string, mealId: string, status: MealStatus | null, totals: Macros) => void;
  /** Adds food eaten outside the plan. */
  addExtra: (date: string, name: string, totals: Macros, meal?: string) => void;
  removeExtra: (date: string, id: string) => void;
  /** Clears the meal marks for a date, keeping extras. Used when that day's menu is replaced. */
  resetMeals: (date: string) => void;
  clear: () => void;
}

type Saved = Pick<MealLogState, 'days'>;

function prune(days: Record<string, DayLog>): Record<string, DayLog> {
  const dates = Object.keys(days).sort();
  if (dates.length <= DAYS_KEPT) return days;
  return Object.fromEntries(dates.slice(-DAYS_KEPT).map((date) => [date, days[date]!]));
}

function update(state: Saved, date: string, change: (log: DayLog) => DayLog): Saved {
  return { days: prune({ ...state.days, [date]: change(state.days[date] ?? EMPTY_DAY_LOG) }) };
}

export const useMealLogStore = create<MealLogState>()(
  persist(
    (set) => ({
      days: {},
      markMeal: (date, mealId, status, totals) =>
        set((state) =>
          update(state, date, (log) => {
            const meals = { ...log.meals };
            if (status) meals[mealId] = { status, totals };
            else delete meals[mealId];
            return { ...log, meals };
          }),
        ),
      addExtra: (date, name, totals, meal) =>
        set((state) =>
          update(state, date, (log) => ({
            ...log,
            extras: [...log.extras, { id: `${Date.now().toString(36)}-${log.extras.length}`, name, totals, ...(meal ? { meal } : {}) }],
          })),
        ),
      removeExtra: (date, id) =>
        set((state) => update(state, date, (log) => ({ ...log, extras: log.extras.filter((e) => e.id !== id) }))),
      resetMeals: (date) => set((state) => update(state, date, (log) => ({ ...log, meals: {} }))),
      clear: () => set({ days: {} }),
    }),
    {
      name: storageKey('meal-log'),
      storage: appStorage<Saved>(),
      partialize: ({ days }) => ({ days }),
    },
  ),
);

/** The log for one date. Always returns an object, empty when nothing is tracked yet. */
export function useDayLog(date: string): DayLog {
  return useMealLogStore((state) => state.days[date]) ?? EMPTY_DAY_LOG;
}
