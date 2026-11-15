import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { weightUnit, type UnitSystem, type WeightUnit } from '@/lib/units';
import { appStorage, storageKey } from './storage';

interface SettingsState {
  units: UnitSystem;
  /** True once the person closed the "add to home screen" card. */
  installDismissed: boolean;
  setUnits: (units: UnitSystem) => void;
  dismissInstall: () => void;
}

type Saved = Pick<SettingsState, 'units' | 'installDismissed'>;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      units: 'metric',
      installDismissed: false,
      setUnits: (units) => set({ units }),
      dismissInstall: () => set({ installDismissed: true }),
    }),
    {
      name: storageKey('settings'),
      storage: appStorage<Saved>(),
      partialize: ({ units, installDismissed }) => ({ units, installDismissed }),
    },
  ),
);

/** The unit system, plus the weight unit it implies for body weight and gym plates. */
export function useUnits(): { system: UnitSystem; weight: WeightUnit } {
  const system = useSettingsStore((state) => state.units);
  return { system, weight: weightUnit(system) };
}
