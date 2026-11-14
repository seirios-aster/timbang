import { useMemo } from 'react';
import { computeTargets } from '@/domain/nutrition/targets';
import type { Targets } from '@/domain/nutrition/types';
import { useProfileStore } from './profileStore';

/** The current calorie and macro targets, or null before onboarding. */
export function useTargets(): Targets | null {
  const profile = useProfileStore((state) => state.profile);
  return useMemo(() => (profile ? computeTargets(profile) : null), [profile]);
}
