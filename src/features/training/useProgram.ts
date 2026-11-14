import { useMemo } from 'react';
import { buildProgram } from '@/domain/training/program';
import type { Lifter, Program } from '@/domain/training/types';
import { useProfileStore } from '@/state/profileStore';
import { useTrainingStore } from '@/state/trainingStore';

/** The current week's program and the person it is for. Null before onboarding or with no lifting days. */
export function useProgram(): { program: Program | null; lifter: Lifter | null } {
  const profile = useProfileStore((state) => state.profile);
  const equipment = useTrainingStore((state) => state.equipment);
  const swaps = useTrainingStore((state) => state.swaps);

  const days = profile?.trainingDays ?? 0;
  const experience = profile?.experience ?? 'beginner';

  const program = useMemo(
    () => buildProgram(days, experience, equipment, swaps),
    [days, experience, equipment, swaps],
  );

  const lifter = useMemo<Lifter | null>(
    () =>
      profile
        ? { sex: profile.sex, experience: profile.experience, weightKg: profile.weightKg, heightCm: profile.heightCm }
        : null,
    [profile],
  );

  return { program, lifter };
}
