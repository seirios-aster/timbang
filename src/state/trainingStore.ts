import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Equipment, ExerciseLog, Swaps } from '@/domain/training/types';
import { appStorage, storageKey } from './storage';

/** Oldest logs are dropped past this many, so storage never fills up. */
const MAX_LOGS = 3000;

interface TrainingState {
  equipment: Equipment;
  /** Exercises the person picked in place of the defaults. */
  swaps: Swaps;
  logs: ExerciseLog[];
  setEquipment: (equipment: Equipment) => void;
  swap: (key: string, exerciseId: string) => void;
  /** Saves a session for one exercise. Saving the same exercise again that day replaces it. */
  log: (entry: ExerciseLog) => void;
  clear: () => void;
}

type Saved = Pick<TrainingState, 'equipment' | 'swaps' | 'logs'>;

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set) => ({
      equipment: 'gym',
      swaps: {},
      logs: [],
      setEquipment: (equipment) => set({ equipment }),
      swap: (key, exerciseId) => set((state) => ({ swaps: { ...state.swaps, [key]: exerciseId } })),
      log: (entry) =>
        set((state) => ({
          logs: [
            ...state.logs.filter((log) => !(log.exerciseId === entry.exerciseId && log.date === entry.date)),
            entry,
          ].slice(-MAX_LOGS),
        })),
      clear: () => set({ equipment: 'gym', swaps: {}, logs: [] }),
    }),
    {
      name: storageKey('training'),
      storage: appStorage<Saved>(),
      partialize: ({ equipment, swaps, logs }) => ({ equipment, swaps, logs }),
    },
  ),
);
