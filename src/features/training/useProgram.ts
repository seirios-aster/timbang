import { useMemo } from 'react';
import { todayIso } from '@/lib/date';
import { buildProgram } from '@/domain/training/program';
import type { Lifter, Program } from '@/domain/training/types';
import { useProfileStore } from '@/state/profileStore';
import { useTrainingStore } from '@/state/trainingStore';

/** True while an easier week is under way. */
export function useDeloadActive(): boolean {
  const deloadUntil = useTrainingStore((state) => state.deloadUntil);
  return deloadUntil !== null && deloadUntil >= todayIso();
}

/** The current week's program and the person it is for. Null before onboarding or with no lifting days. */
export function useProgram(): { program: Program | null; lifter: Lifter | null; deload: boolean } {
  const profile = useProfileStore((state) => state.profile);
  const equipment = useTrainingStore((state) => state.equipment);
  const swaps = useTrainingStore((state) => state.swaps);
  const deloadUntil = useTrainingStore((state) => state.deloadUntil);
  const deload = deloadUntil !== null && deloadUntil >= todayIso();

  const days = profile?.trainingDays ?? 0;
  const experience = profile?.experience ?? 'beginner';

  const program = useMemo(
    () => buildProgram(days, experience, equipment, swaps, { deload }),
    [days, experience, equipment, swaps, deload],
  );

  const lifter = useMemo<Lifter | null>(
    () =>
      profile
        ? { sex: profile.sex, experience: profile.experience, weightKg: profile.weightKg, heightCm: profile.heightCm }
        : null,
    [profile],
  );

  return { program, lifter, deload };
}
