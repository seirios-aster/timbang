import { useMemo, useState } from 'react';
import { buildProgram, nextWorkout } from '@/domain/training/program';
import type { Lifter } from '@/domain/training/types';
import { DAYS, todayIndex, todayIso } from '@/lib/date';
import { useProfileStore } from '@/state/profileStore';
import { useTrainingStore } from '@/state/trainingStore';
import { Button } from '@/ui/Button';
import { DayStrip } from '@/ui/DayStrip';
import { Icon } from '@/ui/Icon';
import { EQUIPMENT_LABEL } from './copy';
import { ExerciseSheet } from './ExerciseSheet';
import { SetupSheet } from './SetupSheet';
import styles from './TrainingScreen.module.css';
import { WorkoutBoard } from './WorkoutBoard';

export function TrainingScreen() {
  const profile = useProfileStore((state) => state.profile);
  const equipment = useTrainingStore((state) => state.equipment);
  const swaps = useTrainingStore((state) => state.swaps);
  const logs = useTrainingStore((state) => state.logs);

  const [dayIndex, setDayIndex] = useState(todayIndex);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const days = profile?.trainingDays ?? 0;
  const experience = profile?.experience ?? 'beginner';
  const program = useMemo(
    () => buildProgram(days, experience, equipment, swaps),
    [days, experience, equipment, swaps],
  );

  if (!profile) return null;

  const lifter: Lifter = {
    sex: profile.sex,
    experience: profile.experience,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
  };
  const today = todayIso();

  if (!program) {
    return (
      <div className={styles.empty}>
        <p className="eyebrow">Training</p>
        <h1 className={`display ${styles.emptyTitle}`}>No lifting days yet</h1>
        <p className={styles.lead}>
          Tell the app how many days a week you can train and what equipment you have. It will lay out a weekly split
          with exercises, sets, reps and the weight to start with.
        </p>
        <Button size="lg" block onClick={() => setSetupOpen(true)}>
          Set up my training <Icon name="arrowRight" />
        </Button>
        <SetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} />
      </div>
    );
  }

  const workout = program.week[dayIndex] ?? null;
  const upNext = workout ? null : nextWorkout(program, dayIndex);
  const plannedDays = program.week.filter(Boolean).length;

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <p className="eyebrow">Training</p>
        <button type="button" className={`eyebrow ${styles.settings}`} onClick={() => setSetupOpen(true)}>
          {plannedDays} {plannedDays === 1 ? 'day' : 'days'} · {EQUIPMENT_LABEL[equipment]} · change
        </button>
      </div>

      <header className={styles.split}>
        <h1 className={`display ${styles.splitName}`}>{program.split.name}</h1>
        <p className={styles.lead}>{program.split.why}</p>
        {days > plannedDays && (
          <p className={styles.lead}>You asked for {days} days. The plan keeps one rest day so you can recover.</p>
        )}
      </header>

      <DayStrip
        selected={dayIndex}
        onSelect={setDayIndex}
        captions={program.week.map((day) => day?.short ?? null)}
      />

      {workout ? (
        <>
          <WorkoutBoard
            key={workout.id}
            workout={workout}
            logs={logs}
            lifter={lifter}
            today={today}
            onSelect={setOpenSlot}
          />
          <p className={styles.tip}>
            Tap a lift to see how to do it, log your sets, or swap it. Weights go up on their own as you log.
          </p>
          <ExerciseSheet
            workout={workout}
            slot={openSlot}
            logs={logs}
            lifter={lifter}
            equipment={equipment}
            today={today}
            onClose={() => setOpenSlot(null)}
          />
        </>
      ) : (
        <section className={styles.rest} aria-label="Rest day">
          <p className="eyebrow">{DAYS[dayIndex]?.long} · rest day</p>
          <h2 className={`display ${styles.restTitle}`}>Pahinga</h2>
          <p className={styles.lead}>
            Muscle is built while you recover, not while you lift. Sleep seven to nine hours, hit your protein, and take
            a walk if you feel stiff.
          </p>
          {upNext && (
            <Button variant="outline" onClick={() => setDayIndex((dayIndex + upNext.inDays) % 7)}>
              Next: {upNext.workout.name} · {upNext.inDays === 1 ? 'tomorrow' : `in ${upNext.inDays} days`}
            </Button>
          )}
        </section>
      )}

      <p className={styles.disclaimer}>
        Suggested weights are estimates. Start lighter if a movement is new, and stop if something hurts in a way
        that is not normal effort. If you have an injury or a health condition, check with a doctor or a coach first.
      </p>

      <SetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} />
    </div>
  );
}
