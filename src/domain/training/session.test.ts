import { describe, expect, it } from 'vitest';
import { buildProgram } from './program';
import {
  clearSlot,
  completeSet,
  elapsed,
  endRest,
  extendRest,
  isComplete,
  jumpTo,
  pause,
  restRemaining,
  resume,
  sessionLogs,
  skipExercise,
  startSession,
  summarize,
} from './session';

const workout = buildProgram(4, 'beginner', 'gym')!.week[0]!; // Upper A: 6 lifts
const first = workout.exercises[0]!;
const second = workout.exercises[1]!;
const T0 = 1_000_000;
const SECOND = 1000;
const set = (reps = 8, weightKg: number | null = 40) => ({ reps, weightKg });

const begin = () => startSession(workout, 0, '2026-11-16', T0);

describe('a session', () => {
  it('starts on the first exercise, ready to work', () => {
    expect(begin()).toMatchObject({ slot: first.slot, phase: 'work', restEndsAt: null, pausedAt: null });
  });

  it('rests after a set, for as long as the exercise calls for', () => {
    const session = completeSet(begin(), workout, set(), T0 + 30 * SECOND);
    expect(session.phase).toBe('rest');
    expect(session.slot).toBe(first.slot);
    expect(restRemaining(session, T0 + 30 * SECOND)).toBe(first.restSec * SECOND);
    expect(restRemaining(session, T0 + 90 * SECOND)).toBe((first.restSec - 60) * SECOND);
  });

  it('moves to the next exercise after the last set', () => {
    let session = begin();
    for (let i = 0; i < first.sets; i += 1) session = endRest(completeSet(session, workout, set(), T0));
    expect(session.slot).toBe(second.slot);
    expect(session.sets[first.slot]).toHaveLength(first.sets);
  });

  it('lets the rest be skipped, extended or shortened', () => {
    const resting = completeSet(begin(), workout, set(), T0);
    expect(endRest(resting)).toMatchObject({ phase: 'work', restEndsAt: null });
    expect(restRemaining(extendRest(resting, 30 * SECOND, T0), T0)).toBe((first.restSec + 30) * SECOND);
    expect(restRemaining(extendRest(resting, -9999 * SECOND, T0), T0)).toBe(0);
  });
});

describe('pausing', () => {
  it('freezes the rest timer and the clock', () => {
    const resting = completeSet(begin(), workout, set(), T0 + 10 * SECOND);
    const paused = pause(resting, T0 + 20 * SECOND);
    const left = restRemaining(paused, T0 + 20 * SECOND);

    // Five minutes later nothing has moved.
    expect(restRemaining(paused, T0 + 320 * SECOND)).toBe(left);
    expect(elapsed(paused, T0 + 320 * SECOND)).toBe(20 * SECOND);

    const resumed = resume(paused, T0 + 320 * SECOND);
    expect(restRemaining(resumed, T0 + 320 * SECOND)).toBe(left);
    expect(elapsed(resumed, T0 + 330 * SECOND)).toBe(30 * SECOND);
  });

  it('ignores a second pause or a resume when running', () => {
    const paused = pause(begin(), T0 + 5 * SECOND);
    expect(pause(paused, T0 + 50 * SECOND)).toBe(paused);
    const running = begin();
    expect(resume(running, T0 + 50 * SECOND)).toBe(running);
  });
});

describe('changing the order', () => {
  it('jumps to another exercise when equipment is taken, and comes back later', () => {
    let session = jumpTo(begin(), workout, second.slot);
    expect(session.slot).toBe(second.slot);
    for (let i = 0; i < second.sets; i += 1) session = endRest(completeSet(session, workout, set(), T0));
    // The next unfinished lift after the second one, not back to the first yet.
    expect(session.slot).toBe(workout.exercises[2]!.slot);
    expect(isComplete(session, workout)).toBe(false);
  });

  it('skips an exercise, and reports when nothing else is left', () => {
    expect(skipExercise(begin(), workout)!.slot).toBe(second.slot);

    let session = begin();
    for (const planned of workout.exercises.slice(1)) {
      session = jumpTo(session, workout, planned.slot);
      for (let i = 0; i < planned.sets; i += 1) session = endRest(completeSet(session, workout, set(), T0));
    }
    // Only the first lift is unfinished now, and it is the current one.
    expect(session.slot).toBe(first.slot);
    expect(skipExercise(session, workout)).toBeNull();
  });

  it('forgets the sets of an exercise that was swapped out', () => {
    const session = completeSet(begin(), workout, set(), T0);
    expect(clearSlot(session, first.slot).sets[first.slot]).toBeUndefined();
  });
});

describe('finishing', () => {
  it('is complete only when every set is done', () => {
    let session = begin();
    for (const planned of workout.exercises) {
      for (let i = 0; i < planned.sets; i += 1) {
        expect(isComplete(session, workout)).toBe(false);
        session = endRest(completeSet(session, workout, set(), T0));
      }
    }
    expect(isComplete(session, workout)).toBe(true);
    expect(session.phase).toBe('work');
  });

  it('logs only the exercises that were actually done', () => {
    let session = begin();
    session = endRest(completeSet(session, workout, set(10, 40), T0));
    session = endRest(completeSet(session, workout, set(9, 40), T0));
    session = endRest(completeSet(session, workout, set(7, 37.5), T0));

    const logs = sessionLogs(session, workout);
    expect(logs).toEqual([{ exerciseId: first.exerciseId, date: '2026-11-16', weightKg: 40, reps: [10, 9, 7] }]);
  });

  it('summarizes a session that ended early', () => {
    let session = begin();
    session = completeSet(session, workout, set(), T0 + 60 * SECOND);
    session = pause(session, T0 + 100 * SECOND);
    session = resume(session, T0 + 400 * SECOND);

    const summary = summarize(session, workout, T0 + 460 * SECOND);
    expect(summary).toMatchObject({ workoutName: 'Upper A', setsDone: 1, liftsDone: 1, liftsPlanned: 6 });
    expect(summary.durationMs).toBe(160 * SECOND);
    expect(summary.setsPlanned).toBe(workout.exercises.reduce((total, planned) => total + planned.sets, 0));
  });
});
