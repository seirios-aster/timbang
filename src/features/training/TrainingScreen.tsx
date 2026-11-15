import { useEffect, useState } from 'react';
import { nextWorkout } from '@/domain/training/program';
import { strainReport } from '@/domain/training/progression';
import { DAYS, fmtShortDate, todayIndex, todayIso } from '@/lib/date';
import { useProfileStore } from '@/state/profileStore';
import { useUnits } from '@/state/settingsStore';
import { useTrainingStore } from '@/state/trainingStore';
import { Button } from '@/ui/Button';
import { DayStrip } from '@/ui/DayStrip';
import { Icon } from '@/ui/Icon';
import { EQUIPMENT_LABEL } from './copy';
import { ExerciseSheet } from './ExerciseSheet';
import { SessionScreen } from './SessionScreen';
import { SessionSummary } from './SessionSummary';
import { SetupSheet } from './SetupSheet';
import styles from './TrainingScreen.module.css';
import { useProgram } from './useProgram';
import { WorkoutBoard } from './WorkoutBoard';

export function TrainingScreen() {
  const days = useProfileStore((state) => state.profile?.trainingDays ?? 0);
  const equipment = useTrainingStore((state) => state.equipment);
  const { weight: unit } = useUnits();
  const logs = useTrainingStore((state) => state.logs);
  const session = useTrainingStore((state) => state.session);
  const summary = useTrainingStore((state) => state.summary);
  const beginSession = useTrainingStore((state) => state.beginSession);
  const discardSession = useTrainingStore((state) => state.discardSession);
  const dismissSummary = useTrainingStore((state) => state.dismissSummary);
  const deloadUntil = useTrainingStore((state) => state.deloadUntil);
  const snoozedUntil = useTrainingStore((state) => state.deloadSnoozedUntil);
  const startDeload = useTrainingStore((state) => state.startDeload);
  const endDeload = useTrainingStore((state) => state.endDeload);
  const snoozeDeload = useTrainingStore((state) => state.snoozeDeload);
  const { program, lifter, deload } = useProgram();

  const [dayIndex, setDayIndex] = useState(todayIndex);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  // The workout a running session belongs to, if the program still has it.
  const sessionWorkout = session ? (program?.week[session.dayIndex] ?? null) : null;
  const sessionIsValid = session !== null && sessionWorkout?.id === session.workoutId;

  // If the program changed under a running session (fewer days, say), the session no longer fits. Drop it.
  useEffect(() => {
    if (session && !sessionIsValid) discardSession();
  }, [session, sessionIsValid, discardSession]);

  if (!lifter) return null;
  const today = todayIso();

  if (session && sessionIsValid && sessionWorkout) {
    return (
      <SessionScreen
        workout={sessionWorkout}
        session={session}
        logs={logs}
        lifter={lifter}
        equipment={equipment}
        unit={unit}
      />
    );
  }

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

  const strain = strainReport(logs, today);
  const tired = strain.level === 'tired' && !deload && (snoozedUntil === null || snoozedUntil < today);

  const workout = program.week[dayIndex] ?? null;
  const upNext = workout ? null : nextWorkout(program, dayIndex);
  const plannedDays = program.week.filter(Boolean).length;

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <p className="eyebrow">Training</p>
        <button type="button" className={`eyebrow ${styles.settings}`} onClick={() => setSetupOpen(true)}>
          {plannedDays} {plannedDays === 1 ? 'day' : 'days'} · {EQUIPMENT_LABEL[equipment]} · {unit} · change
        </button>
      </div>

      {summary && <SessionSummary summary={summary} unit={unit} logs={logs} lifter={lifter} onDismiss={dismissSummary} />}

      {deload && deloadUntil && (
        <div className={`on-paper ${styles.notice}`} role="status">
          <p>
            <strong>Easy week</strong> until {fmtShortDate(deloadUntil)}. Weights are about 10% lighter and each lift has one set
            fewer. Let your body catch up, then come back stronger.
          </p>
          <Button variant="outline" onClick={endDeload}>
            Back to normal training
          </Button>
        </div>
      )}

      {tired && (
        <div className={`on-paper ${styles.notice}`} role="status">
          <p>
            <strong>You may be run down.</strong> {strain.reasons.join(' ')} A week at lighter weights is how lifters recover
            and keep progressing.
          </p>
          <div className={styles.noticeActions}>
            <Button onClick={startDeload}>Take an easy week</Button>
            <Button variant="quiet" onClick={snoozeDeload}>
              Not now
            </Button>
          </div>
        </div>
      )}

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
            unit={unit}
            today={today}
            onSelect={setOpenSlot}
            onStart={() => beginSession(workout, dayIndex)}
          />
          <p className={styles.tip}>
            Tap a lift to see how it is done, log it by hand, or change it for one your gym has.
          </p>
          <ExerciseSheet
            workout={workout}
            slot={openSlot}
            logs={logs}
            lifter={lifter}
            equipment={equipment}
            unit={unit}
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
