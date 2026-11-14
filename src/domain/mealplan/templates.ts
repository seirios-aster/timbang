import type { FoodRole, MealSlot } from '../foods/types';
import type { MealsPerDay } from './types';

/** One food to choose for a meal. */
export interface Pick {
  role: FoodRole;
  /** Limit the choice to these food ids. */
  from?: string[];
  /** Never choose these food ids. */
  not?: string[];
  /** The meal still works if nothing fits this pick. */
  optional?: boolean;
}

export interface MealTemplate {
  id: string;
  /** Higher means chosen more often. */
  weight: number;
  picks: Pick[];
}

const EGGS = ['pritong-itlog', 'nilagang-itlog'];
const RICE = ['kanin', 'brown-rice'];

export const TEMPLATES: Record<MealSlot, MealTemplate[]> = {
  almusal: [
    {
      id: 'silog',
      weight: 5,
      picks: [
        { role: 'carb', from: ['sinangag', ...RICE] },
        { role: 'protein', not: EGGS },
        { role: 'protein', from: EGGS, optional: true },
      ],
    },
    {
      id: 'pandesal',
      weight: 3,
      picks: [
        { role: 'carb', from: ['pandesal', 'tasty'] },
        { role: 'protein' },
        { role: 'palaman' },
        { role: 'prutas', optional: true },
      ],
    },
    {
      id: 'oats',
      weight: 2,
      picks: [
        { role: 'carb', from: ['oatmeal'] },
        { role: 'prutas', from: ['saging', 'mangga'] },
        { role: 'boost' },
        { role: 'palaman', from: ['peanut-butter'], optional: true },
      ],
    },
  ],
  tanghalian: [
    { id: 'kanin-ulam', weight: 3, picks: [{ role: 'carb', from: RICE }, { role: 'ulam' }, { role: 'gulay' }] },
    {
      id: 'kanin-ulam-prutas',
      weight: 2,
      picks: [{ role: 'carb', from: RICE }, { role: 'ulam' }, { role: 'gulay' }, { role: 'prutas' }],
    },
  ],
  hapunan: [
    { id: 'kanin-ulam', weight: 4, picks: [{ role: 'carb', from: RICE }, { role: 'ulam' }, { role: 'gulay' }] },
    {
      id: 'kamote-ulam',
      weight: 1,
      picks: [{ role: 'carb', from: ['kamote'] }, { role: 'ulam' }, { role: 'gulay' }],
    },
  ],
  meryenda: [
    { id: 'kakanin', weight: 3, picks: [{ role: 'meryenda' }, { role: 'boost', optional: true }] },
    { id: 'prutas', weight: 2, picks: [{ role: 'prutas' }, { role: 'boost' }] },
    {
      id: 'tinapay',
      weight: 2,
      picks: [
        { role: 'carb', from: ['pandesal', 'tasty', 'kamote'] },
        { role: 'palaman' },
        { role: 'boost', optional: true },
      ],
    },
  ],
};

export interface MealOutline {
  slot: MealSlot;
  label: string;
  share: number;
}

/** Which meals a day has, and how the day's calories are split between them. */
export const DAY_OUTLINES: Record<MealsPerDay, MealOutline[]> = {
  3: [
    { slot: 'almusal', label: 'Almusal', share: 0.3 },
    { slot: 'tanghalian', label: 'Tanghalian', share: 0.37 },
    { slot: 'hapunan', label: 'Hapunan', share: 0.33 },
  ],
  4: [
    { slot: 'almusal', label: 'Almusal', share: 0.25 },
    { slot: 'tanghalian', label: 'Tanghalian', share: 0.32 },
    { slot: 'meryenda', label: 'Meryenda', share: 0.13 },
    { slot: 'hapunan', label: 'Hapunan', share: 0.3 },
  ],
  5: [
    { slot: 'almusal', label: 'Almusal', share: 0.22 },
    { slot: 'meryenda', label: 'Meryenda sa umaga', share: 0.1 },
    { slot: 'tanghalian', label: 'Tanghalian', share: 0.3 },
    { slot: 'meryenda', label: 'Meryenda sa hapon', share: 0.1 },
    { slot: 'hapunan', label: 'Hapunan', share: 0.28 },
  ],
};
