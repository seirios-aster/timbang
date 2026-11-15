import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_STEP_GOAL } from '@/domain/nutrition/steps';
import { appStorage, storageKey } from './storage';

/** Older days are dropped past this many. */
const DAYS_KEPT = 120;

interface StepsState {
  /** Steps by calendar date (YYYY-MM-DD). */
  days: Record<string, number>;
  goal: number;
  setSteps: (date: string, steps: number) => void;
  setGoal: (goal: number) => void;
  clear: () => void;
}

type Saved = Pick<StepsState, 'days' | 'goal'>;

export const useStepsStore = create<StepsState>()(
  persist(
    (set) => ({
      days: {},
      goal: DEFAULT_STEP_GOAL,
      setSteps: (date, steps) =>
        set((state) => {
          const days = { ...state.days };
          if (steps > 0) days[date] = Math.round(steps);
          else delete days[date];
          const dates = Object.keys(days).sort();
          return { days: dates.length > DAYS_KEPT ? Object.fromEntries(dates.slice(-DAYS_KEPT).map((d) => [d, days[d]!])) : days };
        }),
      setGoal: (goal) => set({ goal }),
      clear: () => set({ days: {}, goal: DEFAULT_STEP_GOAL }),
    }),
    {
      name: storageKey('steps'),
      storage: appStorage<Saved>(),
      partialize: ({ days, goal }) => ({ days, goal }),
    },
  ),
);
