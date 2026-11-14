import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeighIn } from '@/domain/progress/types';
import { appStorage, storageKey } from './storage';

interface ProgressState {
  entries: WeighIn[];
  /** Adds a weigh-in. Logging the same date again replaces that day's entry. */
  log: (entry: Omit<WeighIn, 'id'>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

type Saved = Pick<ProgressState, 'entries'>;

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      entries: [],
      log: (entry) =>
        set((state) => ({
          entries: [
            ...state.entries.filter((existing) => existing.date !== entry.date),
            { ...entry, id: `${entry.date}-${Date.now().toString(36)}` },
          ],
        })),
      remove: (id) => set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: storageKey('progress'),
      storage: appStorage<Saved>(),
      partialize: ({ entries }) => ({ entries }),
    },
  ),
);
