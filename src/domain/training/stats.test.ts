import { describe, expect, it } from 'vitest';
import { allLiftStats, estimateOneRepMax, findRecords, liftStats, trainingTotals, weightForReps } from './stats';
import type { ExerciseLog } from './types';

const log = (exerciseId: string, date: string, weightKg: number | null, reps: number[]): ExerciseLog => ({
  exerciseId,
  date,
  weightKg,
  reps,
});

const history: ExerciseLog[] = [
  log('bench-press', '2026-10-05', 40, [10, 9, 8]),
  log('bench-press', '2026-10-12', 42.5, [8, 8, 7]),
  log('bench-press', '2026-10-19', 42.5, [10, 9, 9]),
  log('back-squat', '2026-10-06', 60, [8, 8, 8]),
  log('db-curl', '2026-10-05', 8, [12, 12]),
  log('push-up', '2026-10-07', null, [12, 10, 9]),
];

describe('estimateOneRepMax', () => {
  it('uses the Epley formula', () => {
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 1);
    expect(estimateOneRepMax(60, 5)).toBeCloseTo(70, 5);
  });

  it('treats a single rep as the max itself', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it('stops growing past twelve reps, where the estimate gets rough', () => {
    expect(estimateOneRepMax(50, 25)).toBe(estimateOneRepMax(50, 12));
  });

  it('is zero when nothing was lifted', () => {
    expect(estimateOneRepMax(0, 10)).toBe(0);
    expect(estimateOneRepMax(50, 0)).toBe(0);
  });

  it('reverses into a weight for a rep count', () => {
    const max = estimateOneRepMax(60, 5);
    expect(weightForReps(max, 5)).toBeCloseTo(60, 5);
    expect(weightForReps(max, 1)).toBe(max);
    expect(weightForReps(max, 10)).toBeLessThan(60);
  });
});

describe('liftStats', () => {
  const bench = liftStats(history, 'bench-press')!;

  it('orders sessions oldest first', () => {
    expect(bench.sessions.map((session) => session.date)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
    expect(bench.last.date).toBe('2026-10-19');
  });

  it('finds the heaviest session, preferring more reps at the same weight', () => {
    expect(bench.heaviest).toMatchObject({ weightKg: 42.5, topReps: 10, date: '2026-10-19' });
  });

  it('finds the highest estimated max', () => {
    expect(bench.strongest!.date).toBe('2026-10-19');
    expect(bench.strongest!.oneRepMaxKg).toBeCloseTo(42.5 * (1 + 10 / 30), 5);
  });

  it('adds up volume, doubling for a pair of dumbbells', () => {
    expect(bench.sessions[0]!.volumeKg).toBe(40 * 27);
    expect(liftStats(history, 'db-curl')!.totalVolumeKg).toBe(8 * 24 * 2);
  });

  it('tracks bodyweight lifts by reps, with no weight or max', () => {
    const pushUp = liftStats(history, 'push-up')!;
    expect(pushUp.heaviest).toBeNull();
    expect(pushUp.strongest).toBeNull();
    expect(pushUp.mostReps.topReps).toBe(12);
    expect(pushUp.totalVolumeKg).toBe(0);
  });

  it('is null for a lift never logged', () => {
    expect(liftStats(history, 'deadlift')).toBeNull();
  });
});

describe('totals', () => {
  it('lists lifts with the most recently trained first', () => {
    expect(allLiftStats(history)[0]!.exercise.id).toBe('bench-press');
    expect(allLiftStats(history)).toHaveLength(4);
  });

  it('counts days, lifts, sets and volume', () => {
    const totals = trainingTotals(history);
    expect(totals).toMatchObject({ days: 5, lifts: 4, sets: 17 });
    expect(totals.volumeKg).toBeGreaterThan(4000);
  });
});

describe('findRecords', () => {
  it('reports more weight on the bar', () => {
    const added = [log('bench-press', '2026-10-26', 45, [6, 6, 5])];
    expect(findRecords(history, added)).toEqual([{ exerciseId: 'bench-press', kind: 'weight', value: 45, previous: 42.5 }]);
  });

  it('reports more reps at the same weight as a strength record', () => {
    const added = [log('bench-press', '2026-10-26', 42.5, [12, 10, 10])];
    expect(findRecords(history, added)[0]).toMatchObject({ kind: 'strength', exerciseId: 'bench-press' });
  });

  it('reports more reps on a bodyweight lift', () => {
    const added = [log('push-up', '2026-10-26', null, [15, 12, 10])];
    expect(findRecords(history, added)).toEqual([{ exerciseId: 'push-up', kind: 'reps', value: 15, previous: 12 }]);
  });

  it('stays quiet for a first session or a weaker one', () => {
    expect(findRecords(history, [log('deadlift', '2026-10-26', 80, [8, 8, 8])])).toEqual([]);
    expect(findRecords(history, [log('bench-press', '2026-10-26', 40, [8, 8, 8])])).toEqual([]);
  });

  it('ignores an earlier log from the same day being replaced', () => {
    const before = [...history, log('bench-press', '2026-10-26', 45, [6, 6, 6])];
    const added = [log('bench-press', '2026-10-26', 45, [6, 6, 6])];
    expect(findRecords(before, added)[0]).toMatchObject({ kind: 'weight', value: 45 });
  });
});
