import { describe, expect, it } from 'vitest';
import { averageRir, effortFor } from './effort';
import { getExercise } from './exercises';
import { adviseLoad } from './loads';
import { buildProgram, estimateMinutes } from './program';
import { nextSessionPreview, sessionVerdict, strainReport } from './progression';
import { completeSet, endRest, sessionLogs, startSession, summarize } from './session';
import type { ExerciseLog, Lifter } from './types';

const lifter: Lifter = { sex: 'male', experience: 'beginner', weightKg: 70, heightCm: 170 };
const bench = getExercise('bench-press');
const range = { repsMin: 6, repsMax: 10 };
const log = (reps: number[], rir?: number[], weightKg = 40, date = '2026-11-10', exerciseId = 'bench-press'): ExerciseLog => ({
  exerciseId,
  date,
  weightKg,
  reps,
  ...(rir ? { rir } : {}),
});

describe('effort', () => {
  it('counts unrated sets as two left', () => {
    expect(averageRir(log([8, 8, 8]))).toBe(2);
    expect(averageRir(log([8, 8, 8], [3, 1, 0]))).toBeCloseTo(4 / 3, 5);
  });

  it('names an effort level', () => {
    expect(effortFor(3).label).toBe('Easy');
    expect(effortFor(0).label).toBe('Max');
    expect(effortFor(1.4).label).toBe('Hard');
  });
});

describe('progressive overload with effort', () => {
  it('goes up when every set reached the top with reps to spare', () => {
    expect(adviseLoad(bench, range, log([10, 10, 10], [2, 2, 1]), lifter)).toMatchObject({ basis: 'up', weightKg: 42.5, targetReps: 6 });
  });

  it('takes a double step when the top came easily', () => {
    expect(adviseLoad(bench, range, log([10, 10, 10], [3, 3, 3]), lifter)).toMatchObject({ basis: 'up', weightKg: 45 });
  });

  it('holds when the top was reached by grinding', () => {
    const advice = adviseLoad(bench, range, log([10, 10, 10], [0, 0, 1]), lifter);
    expect(advice).toMatchObject({ basis: 'hold', weightKg: 40 });
    expect(advice.note).toContain('limit');
  });

  it('steps up before the top when the sets felt easy', () => {
    expect(adviseLoad(bench, range, log([8, 8, 7], [3, 3, 3]), lifter)).toMatchObject({ basis: 'up', weightKg: 42.5 });
  });

  it('holds and names a rep target when reps are in the range', () => {
    expect(adviseLoad(bench, range, log([9, 8, 7], [2, 1, 1]), lifter)).toMatchObject({ basis: 'hold', weightKg: 40, targetReps: 8 });
  });

  it('backs off when a set fell short, however it felt', () => {
    expect(adviseLoad(bench, range, log([8, 6, 4], [3, 3, 3]), lifter)).toMatchObject({ basis: 'down', weightKg: 35 });
  });

  it('acts as before when no effort was recorded', () => {
    expect(adviseLoad(bench, range, log([10, 10, 10]), lifter)).toMatchObject({ basis: 'up', weightKg: 42.5 });
    expect(adviseLoad(bench, range, log([9, 9, 8]), lifter)).toMatchObject({ basis: 'hold' });
  });

  it('plans an easier week lighter and not harder', () => {
    const easy = adviseLoad(bench, range, log([10, 10, 10], [2, 2, 2]), lifter, 'kg', { deload: true });
    expect(easy.basis).toBe('deload');
    expect(easy.weightKg).toBe(35); // 90% of 40, rounded to the bar
    expect(adviseLoad(getExercise('push-up'), range, log([10, 10, 10], undefined, 0, '2026-11-10', 'push-up'), lifter, 'kg', { deload: true }).weightKg).toBeNull();
  });
});

describe('easier weeks in the program', () => {
  it('drops a set from each lift, but never below two', () => {
    const normal = buildProgram(4, 'intermediate', 'gym')!.week[0]!;
    const easy = buildProgram(4, 'intermediate', 'gym', {}, { deload: true })!.week[0]!;
    normal.exercises.forEach((planned, i) => {
      expect(easy.exercises[i]!.sets).toBe(Math.max(2, planned.sets - 1));
    });
    expect(estimateMinutes(easy)).toBeLessThan(estimateMinutes(normal));
  });
});

describe('recording effort in a session', () => {
  const workout = buildProgram(3, 'beginner', 'gym')!.week[0]!;
  const first = workout.exercises[0]!;

  it('saves the effort of each set into the log', () => {
    let session = startSession(workout, 0, '2026-11-16', 0);
    session = endRest(completeSet(session, workout, { weightKg: 40, reps: 8, rir: 3 }, 0));
    session = endRest(completeSet(session, workout, { weightKg: 40, reps: 8, rir: 1 }, 0));
    const logs = sessionLogs(session, workout);
    expect(logs[0]).toMatchObject({ exerciseId: first.exerciseId, reps: [8, 8], rir: [3, 1] });
  });

  it('leaves effort out when none was given', () => {
    let session = startSession(workout, 0, '2026-11-16', 0);
    session = endRest(completeSet(session, workout, { weightKg: 40, reps: 8 }, 0));
    expect(sessionLogs(session, workout)[0]).not.toHaveProperty('rir');
  });

  it('lists the lifts done so next session can be planned', () => {
    let session = startSession(workout, 0, '2026-11-16', 0);
    session = completeSet(session, workout, { weightKg: 40, reps: 8 }, 0);
    expect(summarize(session, workout, 1000).lifts).toEqual([{ exerciseId: first.exerciseId, repsMin: first.repsMin, repsMax: first.repsMax }]);
  });
});

describe('next session and how this one went', () => {
  const lifts = [
    { exerciseId: 'bench-press', repsMin: 6, repsMax: 10 },
    { exerciseId: 'barbell-row', repsMin: 6, repsMax: 10 },
  ];

  it('works out each lift from what was just logged', () => {
    const logs = [log([10, 10, 10], [2, 2, 2], 40, '2026-11-16'), log([8, 7, 7], [1, 1, 0], 30, '2026-11-16', 'barbell-row')];
    const next = nextSessionPreview(lifts, logs, lifter, 'kg');
    expect(next.map((item) => item.advice.basis)).toEqual(['up', 'hold']);
  });

  it('calls a session strong when most lifts go up', () => {
    const logs = [log([10, 10, 10], [2, 2, 2], 40, '2026-11-16'), log([10, 10, 10], [2, 2, 2], 30, '2026-11-16', 'barbell-row')];
    const verdict = sessionVerdict(nextSessionPreview(lifts, logs, lifter, 'kg'), logs, '2026-11-16');
    expect(verdict.headline).toBe('Strong session');
  });

  it('calls it tough when weights were too heavy', () => {
    const logs = [log([5, 4, 3], [0, 0, 0], 40, '2026-11-16'), log([4, 4, 3], [0, 0, 0], 30, '2026-11-16', 'barbell-row')];
    expect(sessionVerdict(nextSessionPreview(lifts, logs, lifter, 'kg'), logs, '2026-11-16').headline).toBe('A tough one');
  });
});

describe('strainReport', () => {
  it('needs several rated sets before saying anything', () => {
    expect(strainReport([log([8, 8, 8], [0, 0, 0], 40, '2026-11-14')], '2026-11-15').level).toBe('normal');
  });

  it('flags a run of sets taken to the limit', () => {
    const logs = [
      log([8, 8, 8], [0, 0, 0], 40, '2026-11-12'),
      log([7, 7, 6], [0, 1, 0], 30, '2026-11-12', 'barbell-row'),
      log([8, 8, 8], [0, 0, 0], 20, '2026-11-14', 'overhead-press'),
    ];
    const report = strainReport(logs, '2026-11-15');
    expect(report.level).toBe('tired');
    expect(report.reasons[0]).toContain('limit');
  });

  it('flags lifts that got worse at the same weight', () => {
    const logs = [
      log([10, 10, 10], undefined, 40, '2026-11-05'),
      log([8, 7, 7], undefined, 40, '2026-11-12'),
      log([10, 10, 9], undefined, 30, '2026-11-05', 'barbell-row'),
      log([8, 8, 7], undefined, 30, '2026-11-12', 'barbell-row'),
    ];
    expect(strainReport(logs, '2026-11-14').level).toBe('tired');
  });

  it('sees a fresh lifter when sets are leaving plenty in the tank', () => {
    const logs = [log([8, 8, 8], [3, 3, 3], 40, '2026-11-12'), log([8, 8, 8], [3, 3, 2], 30, '2026-11-13', 'barbell-row'), log([8, 8, 8], [3, 3, 3], 20, '2026-11-14', 'overhead-press')];
    expect(strainReport(logs, '2026-11-15').level).toBe('fresh');
  });
});
