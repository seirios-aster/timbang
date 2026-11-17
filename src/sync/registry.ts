import { DEFAULT_PREFS } from '@/domain/mealplan/types';
import { DEFAULT_STEP_GOAL } from '@/domain/nutrition/steps';
import type { Syncable } from '@/domain/sync/engine';
import { mergeCustomFoods, mergeMealLog, mergeProgress, mergeSteps, mergeTraining, preferRemote } from '@/domain/sync/merge';
import { useCustomFoodsStore } from '@/state/customFoodsStore';
import { useMealLogStore } from '@/state/mealLogStore';
import { usePlanStore } from '@/state/planStore';
import { useProfileStore } from '@/state/profileStore';
import { useProgressStore } from '@/state/progressStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useStepsStore } from '@/state/stepsStore';
import { useTrainingStore } from '@/state/trainingStore';

/** What zustand's stores offer, which is all the sync needs. */
interface StoreLike<S> {
  getState(): S;
  setState(patch: Partial<S>): void;
  subscribe(listener: () => void): () => void;
}

interface Entry<S> {
  key: string;
  store: StoreLike<S>;
  /** The part of the store that is worth keeping in the cloud. Running sessions, the theme and the like stay on the device. */
  pick: (state: S) => unknown;
  /** What a store holds when nothing has been entered. Used to clear the device when another account signs in. */
  blank: Partial<S>;
  isEmpty: (picked: any) => boolean; // eslint-disable-line @typescript-eslint/no-explicit-any
  merge: Syncable['merge'];
}

/** Each entry is typed against its own store, then the list is held without that detail. */
interface AnyEntry {
  key: string;
  store: StoreLike<unknown>;
  pick: (state: unknown) => unknown;
  blank: unknown;
  isEmpty: (picked: unknown) => boolean;
  merge: Syncable['merge'];
}

function entry<S>(e: Entry<S>): AnyEntry {
  return e as unknown as AnyEntry;
}

const length = (value: unknown) => (Array.isArray(value) ? value.length : 0);
const keys = (value: unknown) => Object.keys((value ?? {}) as object).length;

const entries: AnyEntry[] = [
  entry({
    key: 'profile',
    store: useProfileStore,
    pick: (s) => ({ profile: s.profile, prefs: s.prefs }),
    blank: { profile: null, prefs: DEFAULT_PREFS },
    isEmpty: (d) => d.profile == null,
    merge: preferRemote,
  }),
  entry({
    key: 'plan',
    store: usePlanStore,
    pick: (s) => ({ mode: s.mode, week: s.week, ownWeek: s.ownWeek }),
    blank: { mode: 'suggested', week: null, ownWeek: null, override: null },
    isEmpty: (d) => d.week == null && d.ownWeek == null,
    merge: preferRemote,
  }),
  entry({
    key: 'mealLog',
    store: useMealLogStore,
    pick: (s) => ({ days: s.days }),
    blank: { days: {} },
    isEmpty: (d) => keys(d.days) === 0,
    merge: mergeMealLog,
  }),
  entry({
    key: 'training',
    store: useTrainingStore,
    pick: (s) => ({
      equipment: s.equipment,
      swaps: s.swaps,
      logs: s.logs,
      deloadUntil: s.deloadUntil,
      deloadSnoozedUntil: s.deloadSnoozedUntil,
    }),
    blank: { equipment: 'gym', swaps: {}, logs: [], deloadUntil: null, deloadSnoozedUntil: null, session: null, summary: null },
    isEmpty: (d) => length(d.logs) === 0 && keys(d.swaps) === 0,
    merge: mergeTraining,
  }),
  entry({
    key: 'progress',
    store: useProgressStore,
    pick: (s) => ({ entries: s.entries }),
    blank: { entries: [] },
    isEmpty: (d) => length(d.entries) === 0,
    merge: mergeProgress,
  }),
  entry({
    key: 'steps',
    store: useStepsStore,
    pick: (s) => ({ days: s.days, goal: s.goal }),
    blank: { days: {}, goal: DEFAULT_STEP_GOAL },
    isEmpty: (d) => keys(d.days) === 0,
    merge: mergeSteps,
  }),
  entry({
    key: 'customFoods',
    store: useCustomFoodsStore,
    pick: (s) => ({ foods: s.foods }),
    blank: { foods: [] },
    isEmpty: (d) => length(d.foods) === 0,
    merge: mergeCustomFoods,
  }),
  entry({
    key: 'settings',
    store: useSettingsStore,
    pick: (s) => ({ units: s.units }),
    blank: { units: 'metric' },
    isEmpty: (d) => d.units === 'metric',
    merge: preferRemote,
  }),
];

/** The data kept in the cloud, wired to the app's stores. */
export const SYNCABLES: Syncable[] = entries.map((entry) => ({
  key: entry.key,
  read: () => entry.pick(entry.store.getState()),
  write: (data) => entry.store.setState(data as Partial<unknown>),
  isEmpty: entry.isEmpty,
  merge: entry.merge,
}));

/** True when this device holds any data that would go to the cloud. */
export function deviceHasData(): boolean {
  return SYNCABLES.some((syncable) => !syncable.isEmpty(syncable.read()));
}

/** Empties everything that syncs, for when someone else's account takes over this device. */
export function clearDeviceData(): void {
  for (const entry of entries) entry.store.setState(entry.blank as Partial<unknown>);
}

/** Calls `listener` whenever any synced store changes. Returns a function that stops it. */
export function watchDeviceData(listener: () => void): () => void {
  const stops = entries.map((entry) => entry.store.subscribe(listener));
  return () => stops.forEach((stop) => stop());
}
