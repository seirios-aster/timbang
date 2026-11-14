import type { Split, WorkoutTemplate } from './types';

/**
 * The workouts splits are built from. Each slot names a movement pattern.
 * The exercise that fills it depends on the person's equipment, so the same
 * template works in a gym, with dumbbells at home, or with no equipment.
 */
const TEMPLATE_LIST: WorkoutTemplate[] = [
  // Full body, for one to three days a week
  {
    id: 'full-a',
    name: 'Full body A',
    short: 'A',
    focus: 'Squat and push',
    slots: [
      { pattern: 'squat', tier: 'main' },
      { pattern: 'pushH', tier: 'main' },
      { pattern: 'pullV', tier: 'secondary' },
      { pattern: 'hinge', tier: 'secondary', prefer: ['romanian-deadlift', 'db-rdl'] },
      { pattern: 'core', tier: 'accessory', prefer: ['plank'] },
    ],
  },
  {
    id: 'full-b',
    name: 'Full body B',
    short: 'B',
    focus: 'Hinge and pull',
    slots: [
      { pattern: 'hinge', tier: 'main', prefer: ['deadlift', 'db-rdl'] },
      { pattern: 'pushV', tier: 'main' },
      { pattern: 'pullH', tier: 'secondary' },
      { pattern: 'lunge', tier: 'secondary' },
      { pattern: 'biceps', tier: 'accessory' },
      { pattern: 'triceps', tier: 'accessory' },
    ],
  },
  {
    id: 'full-c',
    name: 'Full body C',
    short: 'C',
    focus: 'Volume day',
    slots: [
      { pattern: 'squat', tier: 'secondary', prefer: ['leg-press', 'goblet-squat'] },
      { pattern: 'pushH', tier: 'secondary', prefer: ['incline-db-press', 'db-floor-press'] },
      { pattern: 'pullH', tier: 'secondary', prefer: ['seated-cable-row', 'db-row'] },
      { pattern: 'glutes', tier: 'secondary' },
      { pattern: 'sideDelt', tier: 'accessory' },
      { pattern: 'core', tier: 'accessory', prefer: ['hanging-knee-raise', 'lying-leg-raise'] },
    ],
  },

  // Upper / lower, for four days a week
  {
    id: 'upper-a',
    name: 'Upper A',
    short: 'UA',
    focus: 'Chest and back',
    slots: [
      { pattern: 'pushH', tier: 'main' },
      { pattern: 'pullH', tier: 'main' },
      { pattern: 'pushV', tier: 'secondary', prefer: ['db-shoulder-press'] },
      { pattern: 'pullV', tier: 'secondary' },
      { pattern: 'biceps', tier: 'accessory' },
      { pattern: 'triceps', tier: 'accessory' },
    ],
  },
  {
    id: 'lower-a',
    name: 'Lower A',
    short: 'LA',
    focus: 'Squat day',
    slots: [
      { pattern: 'squat', tier: 'main' },
      { pattern: 'hinge', tier: 'secondary', prefer: ['romanian-deadlift', 'db-rdl'] },
      { pattern: 'lunge', tier: 'secondary' },
      { pattern: 'hams', tier: 'accessory' },
      { pattern: 'calves', tier: 'accessory' },
      { pattern: 'core', tier: 'accessory', prefer: ['plank'] },
    ],
  },
  {
    id: 'upper-b',
    name: 'Upper B',
    short: 'UB',
    focus: 'Shoulders and back',
    slots: [
      { pattern: 'pushV', tier: 'main' },
      { pattern: 'pullV', tier: 'main' },
      { pattern: 'pushH', tier: 'secondary', prefer: ['incline-db-press', 'db-floor-press'] },
      { pattern: 'pullH', tier: 'secondary', prefer: ['seated-cable-row', 'db-row'] },
      { pattern: 'sideDelt', tier: 'accessory' },
      { pattern: 'rearDelt', tier: 'accessory' },
    ],
  },
  {
    id: 'lower-b',
    name: 'Lower B',
    short: 'LB',
    focus: 'Deadlift day',
    slots: [
      { pattern: 'hinge', tier: 'main', prefer: ['deadlift', 'db-rdl'] },
      { pattern: 'squat', tier: 'secondary', prefer: ['leg-press', 'goblet-squat'] },
      { pattern: 'glutes', tier: 'secondary' },
      { pattern: 'quads', tier: 'accessory' },
      { pattern: 'calves', tier: 'accessory' },
      { pattern: 'core', tier: 'accessory', prefer: ['hanging-knee-raise', 'lying-leg-raise'] },
    ],
  },

  // Push / pull / legs, for five and six days a week
  {
    id: 'push-a',
    name: 'Push A',
    short: 'PS',
    focus: 'Chest, shoulders, triceps',
    slots: [
      { pattern: 'pushH', tier: 'main' },
      { pattern: 'pushV', tier: 'secondary', prefer: ['db-shoulder-press'] },
      { pattern: 'chestFly', tier: 'accessory' },
      { pattern: 'sideDelt', tier: 'accessory' },
      { pattern: 'triceps', tier: 'accessory' },
    ],
  },
  {
    id: 'pull-a',
    name: 'Pull A',
    short: 'PL',
    focus: 'Back and biceps',
    slots: [
      { pattern: 'pullV', tier: 'main' },
      { pattern: 'pullH', tier: 'secondary' },
      { pattern: 'rearDelt', tier: 'accessory' },
      { pattern: 'biceps', tier: 'accessory' },
      { pattern: 'core', tier: 'accessory', prefer: ['hanging-knee-raise', 'lying-leg-raise'] },
    ],
  },
  {
    id: 'legs-a',
    name: 'Legs A',
    short: 'LG',
    focus: 'Squat day',
    slots: [
      { pattern: 'squat', tier: 'main' },
      { pattern: 'hinge', tier: 'secondary', prefer: ['romanian-deadlift', 'db-rdl'] },
      { pattern: 'lunge', tier: 'secondary' },
      { pattern: 'hams', tier: 'accessory' },
      { pattern: 'calves', tier: 'accessory' },
    ],
  },
  {
    id: 'push-b',
    name: 'Push B',
    short: 'PS',
    focus: 'Shoulders, chest, triceps',
    slots: [
      { pattern: 'pushV', tier: 'main' },
      { pattern: 'pushH', tier: 'secondary', prefer: ['incline-db-press', 'db-floor-press'] },
      { pattern: 'chestFly', tier: 'accessory', prefer: ['db-fly'] },
      { pattern: 'sideDelt', tier: 'accessory', prefer: ['cable-lateral-raise'] },
      { pattern: 'triceps', tier: 'accessory', prefer: ['overhead-db-extension'] },
    ],
  },
  {
    id: 'pull-b',
    name: 'Pull B',
    short: 'PL',
    focus: 'Back and biceps',
    slots: [
      { pattern: 'pullH', tier: 'main' },
      { pattern: 'pullV', tier: 'secondary', prefer: ['pull-up'] },
      { pattern: 'rearDelt', tier: 'accessory', prefer: ['reverse-fly'] },
      { pattern: 'biceps', tier: 'accessory', prefer: ['hammer-curl'] },
      { pattern: 'core', tier: 'accessory', prefer: ['plank'] },
    ],
  },
  {
    id: 'legs-b',
    name: 'Legs B',
    short: 'LG',
    focus: 'Deadlift day',
    slots: [
      { pattern: 'hinge', tier: 'main', prefer: ['deadlift', 'db-rdl'] },
      { pattern: 'squat', tier: 'secondary', prefer: ['leg-press', 'goblet-squat'] },
      { pattern: 'glutes', tier: 'secondary' },
      { pattern: 'quads', tier: 'accessory' },
      { pattern: 'calves', tier: 'accessory' },
    ],
  },
];

export const TEMPLATES: ReadonlyMap<string, WorkoutTemplate> = new Map(
  TEMPLATE_LIST.map((template) => [template.id, template]),
);

const REST = null;

/** The recommended split for each number of lifting days. Weeks run Monday to Sunday. */
const SPLITS: Record<number, Split> = {
  1: {
    id: 'full-1',
    name: 'Full body',
    why: 'With one day, train everything in one session. It is enough to hold on to your strength, and two days would build more.',
    week: [REST, REST, 'full-a', REST, REST, REST, REST],
  },
  2: {
    id: 'full-2',
    name: 'Full body',
    why: 'Two full-body days hit every muscle twice a week, with plenty of rest in between.',
    week: ['full-a', REST, REST, 'full-b', REST, REST, REST],
  },
  3: {
    id: 'full-3',
    name: 'Full body',
    why: 'Three full-body days train every muscle three times a week. For beginners this is the fastest way to learn the lifts and grow.',
    week: ['full-a', REST, 'full-b', REST, 'full-c', REST, REST],
  },
  4: {
    id: 'upper-lower',
    name: 'Upper / Lower',
    why: 'Four days splits into two upper and two lower sessions. Every muscle gets trained twice a week with a rest day after each pair.',
    week: ['upper-a', 'lower-a', REST, 'upper-b', 'lower-b', REST, REST],
  },
  5: {
    id: 'upper-lower-ppl',
    name: 'Upper / Lower + PPL',
    why: 'Five days pairs an upper and lower day with a push, pull and legs run. Each muscle still gets two sessions a week.',
    week: ['upper-a', 'lower-a', REST, 'push-a', 'pull-a', 'legs-a', REST],
  },
  6: {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    why: 'Six days runs push, pull and legs twice. Sessions stay short because each one covers fewer muscles.',
    week: ['push-a', 'pull-a', 'legs-a', 'push-b', 'pull-b', 'legs-b', REST],
  },
};

export const MIN_TRAINING_DAYS = 1;
export const MAX_TRAINING_DAYS = 6;

/**
 * Returns the split for a number of lifting days, or null for zero days.
 * Seven days is planned as six, because at least one rest day is part of the program.
 */
export function splitForDays(days: number): Split | null {
  if (days < MIN_TRAINING_DAYS) return null;
  return SPLITS[Math.min(MAX_TRAINING_DAYS, Math.round(days))] ?? null;
}
