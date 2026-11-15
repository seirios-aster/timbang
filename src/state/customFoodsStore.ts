import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { registerCustomFoods } from '@/domain/foods/catalog';
import { createCustomFood } from '@/domain/foods/custom';
import type { Food } from '@/domain/foods/types';
import type { Macros } from '@/domain/mealplan/types';
import { appStorage, storageKey } from './storage';

interface CustomFoodsState {
  foods: Food[];
  /** Saves a new food and returns it. */
  add: (name: string, per: Macros) => Food;
  clear: () => void;
}

type Saved = Pick<CustomFoodsState, 'foods'>;

export const useCustomFoodsStore = create<CustomFoodsState>()(
  persist(
    (set, get) => ({
      foods: [],
      add: (name, per) => {
        const food = createCustomFood(name, per);
        set({ foods: [...get().foods, food] });
        return food;
      },
      clear: () => set({ foods: [] }),
    }),
    {
      name: storageKey('custom-foods'),
      storage: appStorage<Saved>(),
      partialize: ({ foods }) => ({ foods }),
    },
  ),
);

// The domain layer looks foods up by id, so it needs to know about the person's own.
// Registered now, and again on every change, before any screen asks for one.
registerCustomFoods(useCustomFoodsStore.getState().foods);
useCustomFoodsStore.subscribe((state) => registerCustomFoods(state.foods));
