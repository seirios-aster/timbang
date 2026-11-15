import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  sessionLogs,
  startSession,
  summarize,
  type Session,
  type SessionSummary,
} from '@/domain/training/session';
import { findRecords } from '@/domain/training/stats';
import type { Equipment, ExerciseLog, Swaps, Workout } from '@/domain/training/types';
import { todayIso } from '@/lib/date';
import { appStorage, storageKey } from './storage';

/** Oldest logs are dropped past this many, so storage never fills up. */
const MAX_LOGS = 3000;

interface TrainingState {
  equipment: Equipment;
  /** Exercises the person picked in place of the defaults. */
  swaps: Swaps;
  logs: ExerciseLog[];
  /** The guided session in progress, if any. Saved, so it survives a reload or a locked phone. */
  session: Session | null;
  /** The result of the last finished session, shown until dismissed. */
  summary: SessionSummary | null;

  setEquipment: (equipment: Equipment) => void;
  swap: (key: string, exerciseId: string) => void;
  /** Saves a session for one exercise. Saving the same exercise again that day replaces it. */
  log: (entry: ExerciseLog) => void;

  beginSession: (workout: Workout, dayIndex: number) => void;
  /** Applies a change from the session rules in the domain layer. Does nothing when no session is running. */
  updateSession: (change: (session: Session) => Session) => void;
  /** Saves the sets done so far to the logs and ends the session. */
  finishSession: (workout: Workout) => void;
  /** Ends the session without saving anything. */
  discardSession: () => void;
  dismissSummary: () => void;

  clear: () => void;
}

type Saved = Pick<TrainingState, 'equipment' | 'swaps' | 'logs' | 'session' | 'summary'>;

/** Adds entries to the logs, replacing any for the same exercise on the same day. */
function mergeLogs(logs: ExerciseLog[], entries: ExerciseLog[]): ExerciseLog[] {
  const replaced = new Set(entries.map((entry) => `${entry.exerciseId}|${entry.date}`));
  return [...logs.filter((log) => !replaced.has(`${log.exerciseId}|${log.date}`)), ...entries].slice(-MAX_LOGS);
}

const INITIAL: Saved = { equipment: 'gym', swaps: {}, logs: [], session: null, summary: null };

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set) => ({
      ...INITIAL,
      setEquipment: (equipment) => set({ equipment }),
      swap: (key, exerciseId) => set((state) => ({ swaps: { ...state.swaps, [key]: exerciseId } })),
      log: (entry) => set((state) => ({ logs: mergeLogs(state.logs, [entry]) })),

      beginSession: (workout, dayIndex) =>
        set({ session: startSession(workout, dayIndex, todayIso(), Date.now()), summary: null }),
      updateSession: (change) => set((state) => (state.session ? { session: change(state.session) } : state)),
      finishSession: (workout) =>
        set((state) => {
          if (!state.session) return state;
          const added = sessionLogs(state.session, workout);
          return {
            logs: mergeLogs(state.logs, added),
            summary: {
              ...summarize(state.session, workout, Date.now()),
              records: findRecords(state.logs, added),
            },
            session: null,
          };
        }),
      discardSession: () => set({ session: null }),
      dismissSummary: () => set({ summary: null }),

      clear: () => set(INITIAL),
    }),
    {
      name: storageKey('training'),
      storage: appStorage<Saved>(),
      partialize: ({ equipment, swaps, logs, session, summary }) => ({
        equipment,
        swaps,
        logs,
        session,
        summary,
      }),
    },
  ),
);
