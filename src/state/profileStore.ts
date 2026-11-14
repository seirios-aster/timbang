import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_PREFS, type PlanPrefs } from '@/domain/mealplan/types';
import type { Profile } from '@/domain/nutrition/types';
import { appStorage, storageKey } from './storage';

interface ProfileState {
  profile: Profile | null;
  prefs: PlanPrefs;
  saveProfile: (profile: Profile) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  setPrefs: (patch: Partial<PlanPrefs>) => void;
  reset: () => void;
}

type Saved = Pick<ProfileState, 'profile' | 'prefs'>;

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      prefs: DEFAULT_PREFS,
      saveProfile: (profile) => set({ profile }),
      updateProfile: (patch) =>
        set((state) => (state.profile ? { profile: { ...state.profile, ...patch } } : state)),
      setPrefs: (patch) => set((state) => ({ prefs: { ...state.prefs, ...patch } })),
      reset: () => set({ profile: null, prefs: DEFAULT_PREFS }),
    }),
    {
      name: storageKey('profile'),
      storage: appStorage<Saved>(),
      partialize: ({ profile, prefs }) => ({ profile, prefs }),
    },
  ),
);
