import type { Goal, Pace, Targets } from '@/domain/nutrition/types';
import { fmtDecimal, fmtInt } from '@/lib/format';

export const GOAL_LABEL: Record<Goal, string> = {
  lose: 'Cut',
  maintain: 'Maintain',
  gain: 'Bulk',
};

/** Pace options with the calorie change each one means, for the fine-tune panel. */
export const PACE_CHOICES: Record<Exclude<Goal, 'maintain'>, { value: Pace; title: string; detail: string }[]> = {
  lose: [
    { value: 'easy', title: 'Easy', detail: '10% under' },
    { value: 'steady', title: 'Steady', detail: '20% under' },
    { value: 'fast', title: 'Fast', detail: '25% under' },
  ],
  gain: [
    { value: 'easy', title: 'Lean', detail: '5% over' },
    { value: 'steady', title: 'Steady', detail: '10% over' },
    { value: 'fast', title: 'Fast', detail: '15% over' },
  ],
};

/** One plain sentence explaining what the target should do. */
export function summarize(goal: Goal, targets: Targets): string {
  const rate = fmtDecimal(Math.abs(targets.weeklyChangeKg), 2);
  const calories = fmtInt(targets.calories);
  if (goal === 'lose') {
    return `At ${calories} kcal you should lose about ${rate} kg a week. Protein is set high to protect your muscle while you cut.`;
  }
  if (goal === 'gain') {
    return `At ${calories} kcal you should gain about ${rate} kg a week. That is enough to grow without piling on fat.`;
  }
  return `At ${calories} kcal your weight should hold steady while your lifts go up.`;
}
