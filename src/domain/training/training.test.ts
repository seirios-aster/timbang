import { describe, expect, it } from 'vitest';
import type { Experience } from '../nutrition/types';
import { EXERCISES, getExercise } from './exercises';
import { adviseLoad, lastLog, platesPerSide, roundLoad, startingLoad } from './loads';
import { alternatives, buildProgram, estimateMinutes, nextWorkout, swapKey } from './program';
import { splitForDays } from './splits';
import type { Equipment, ExerciseLog, Lifter } from './types';

const EQUIPMENT: Equipment[] = ['gym', 'dumbbells', 'bodyweight'];
const LEVELS: Experience[] = ['beginner', 'intermediate', 'advanced'];

const lifter: Lifter = { sex: 'male', experience: 'beginner', weightKg: 70, heightCm: 170 };

describe('splitForDays', () => {
  it('has no program for zero days', () => {
    expect(splitForDays(0)).toBeNull();
    expect(buildProgram(0, 'beginner', 'gym')).toBeNull();
  });

  it('trains on exactly the number of days asked for', () => {
    for (let days = 1; days <= 6; days += 1) {
      const split = splitForDays(days)!;
      expect(split.week).toHaveLength(7);
      expect(split.week.filter(Boolean)).toHaveLength(days);
    }
  });

  it('plans seven days as six, keeping a rest day', () => {
    expect(splitForDays(7)!.week.filter(Boolean)).toHaveLength(6);
  });

  it('moves from full body to upper/lower to push/pull/legs as days go up', () => {
    expect(splitForDays(3)!.name).toBe('Full body');
    expect(splitForDays(4)!.name).toBe('Upper / Lower');
    expect(splitForDays(6)!.name).toBe('Push / Pull / Legs');
  });
});

describe('buildProgram', () => {
  for (const equipment of EQUIPMENT) {
    for (let days = 1; days <= 6; days += 1) {
      it(`builds complete workouts: ${days} days, ${equipment}`, () => {
        const program = buildProgram(days, 'intermediate', equipment)!;
        const workouts = program.week.filter((workout) => workout !== null);
        expect(workouts).toHaveLength(days);

        for (const workout of workouts) {
          expect(workout.exercises.length, workout.name).toBeGreaterThanOrEqual(4);
          const ids = workout.exercises.map((planned) => planned.exerciseId);
          expect(new Set(ids).size, `${workout.name} repeats an exercise`).toBe(ids.length);
          for (const planned of workout.exercises) {
            const exercise = getExercise(planned.exerciseId);
            expect(exercise.equipment, exercise.name).toContain(equipment);
            expect(exercise.pattern).toBe(planned.pattern);
            expect(planned.repsMax).toBeGreaterThan(planned.repsMin);
          }
        }
      });
    }
  }

  it('gives beginners fewer accessory sets and advanced lifters more main sets', () => {
    const sets = (experience: Experience, tier: string) =>
      buildProgram(4, experience, 'gym')!.week[0]!.exercises.find((planned) => planned.tier === tier)!.sets;
    expect(sets('beginner', 'accessory')).toBeLessThan(sets('intermediate', 'accessory'));
    expect(sets('advanced', 'main')).toBeGreaterThan(sets('beginner', 'main'));
    for (const level of LEVELS) expect(sets(level, 'main')).toBeGreaterThanOrEqual(3);
  });

  it('times holds in seconds', () => {
    const program = buildProgram(3, 'beginner', 'gym')!;
    const plank = program.week[0]!.exercises.find((planned) => planned.exerciseId === 'plank')!;
    expect([plank.repsMin, plank.repsMax]).toEqual([30, 60]);
  });

  it('keeps a swap, and ignores one that does not fit', () => {
    const base = buildProgram(4, 'beginner', 'gym')!.week[0]!;
    const first = base.exercises[0]!;
    const option = alternatives(base, first, 'gym')[0]!;
    expect(option.pattern).toBe(first.pattern);

    const swapped = buildProgram(4, 'beginner', 'gym', { [swapKey(base.id, first.slot)]: option.id })!.week[0]!;
    expect(swapped.exercises[0]!.exerciseId).toBe(option.id);

    const ignored = buildProgram(4, 'beginner', 'gym', { [swapKey(base.id, first.slot)]: 'leg-curl' })!.week[0]!;
    expect(ignored.exercises[0]!.exerciseId).toBe(first.exerciseId);
  });

  it('estimates a sensible session length', () => {
    for (const workout of buildProgram(4, 'intermediate', 'gym')!.week) {
      if (!workout) continue;
      const minutes = estimateMinutes(workout);
      expect(minutes).toBeGreaterThanOrEqual(30);
      expect(minutes).toBeLessThanOrEqual(75);
    }
  });

  it('finds the next training day from a rest day', () => {
    const program = buildProgram(3, 'beginner', 'gym')!; // Mon, Wed, Fri
    expect(nextWorkout(program, 1)).toMatchObject({ inDays: 1, workout: { id: 'full-b' } });
    expect(nextWorkout(program, 4)).toMatchObject({ inDays: 3, workout: { id: 'full-a' } });
  });
});

describe('exercise catalog', () => {
  it('gives every weighted exercise a starting ratio', () => {
    for (const exercise of EXERCISES) {
      if (exercise.load === 'bodyweight') expect(exercise.startRatio, exercise.id).toBeUndefined();
      else expect(exercise.startRatio, exercise.id).toBeGreaterThan(0);
    }
  });
});

describe('roundLoad', () => {
  it('rounds to what the equipment can be set to', () => {
    expect(roundLoad(41, 'barbell')).toBe(40);
    expect(roundLoad(12, 'barbell')).toBe(20); // never less than the empty bar
    expect(roundLoad(7.4, 'dumbbell')).toBe(7);
    expect(roundLoad(13, 'dumbbell')).toBe(12.5);
    expect(roundLoad(32, 'machine')).toBe(30);
  });
});

describe('startingLoad', () => {
  const bench = getExercise('bench-press');
  const squat = getExercise('back-squat');

  it('scales with body weight and experience', () => {
    expect(startingLoad(bench, lifter)).toBe(32.5); // 70 * 0.45 = 31.5
    expect(startingLoad(bench, { ...lifter, experience: 'advanced' })!).toBeGreaterThan(50);
    expect(startingLoad(bench, { ...lifter, weightKg: 55 })!).toBeLessThan(32.5);
  });

  it('starts women lighter, and less so on lower-body lifts', () => {
    const woman: Lifter = { ...lifter, sex: 'female' };
    const benchShare = startingLoad(bench, woman)! / startingLoad(bench, lifter)!;
    const squatShare = startingLoad(squat, woman)! / startingLoad(squat, lifter)!;
    expect(benchShare).toBeLessThan(squatShare);
  });

  it('does not keep climbing for very heavy people', () => {
    expect(startingLoad(squat, { ...lifter, weightKg: 130 })).toBe(startingLoad(squat, { ...lifter, weightKg: 110 }));
  });

  it('has no weight for bodyweight exercises', () => {
    expect(startingLoad(getExercise('push-up'), lifter)).toBeNull();
  });
});

describe('adviseLoad', () => {
  const bench = getExercise('bench-press');
  const squat = getExercise('back-squat');
  const range = { repsMin: 6, repsMax: 10 };
  const log = (weightKg: number | null, reps: number[], exerciseId = 'bench-press'): ExerciseLog => ({
    exerciseId,
    date: '2026-11-10',
    weightKg,
    reps,
  });

  it('starts from an estimate when nothing is logged', () => {
    expect(adviseLoad(bench, range, undefined, lifter)).toMatchObject({ basis: 'start', weightKg: 32.5 });
  });

  it('adds weight once every set reaches the top of the range', () => {
    expect(adviseLoad(bench, range, log(40, [10, 10, 10]), lifter)).toMatchObject({ basis: 'up', weightKg: 42.5 });
    expect(adviseLoad(squat, range, log(60, [10, 11, 10], 'back-squat'), lifter)).toMatchObject({
      basis: 'up',
      weightKg: 65,
    });
  });

  it('holds the weight while reps are inside the range', () => {
    expect(adviseLoad(bench, range, log(40, [10, 9, 7]), lifter)).toMatchObject({ basis: 'hold', weightKg: 40 });
  });

  it('backs off when a set falls under the range', () => {
    expect(adviseLoad(bench, range, log(40, [7, 5, 4]), lifter)).toMatchObject({ basis: 'down', weightKg: 35 });
  });

  it('never suggests less than the empty bar', () => {
    expect(adviseLoad(bench, range, log(20, [4, 3, 3]), lifter).weightKg).toBe(20);
  });

  it('progresses bodyweight exercises by reps', () => {
    const pushUp = getExercise('push-up');
    expect(adviseLoad(pushUp, range, log(null, [10, 10, 10], 'push-up'), lifter)).toMatchObject({
      basis: 'up',
      weightKg: null,
    });
    expect(adviseLoad(pushUp, range, log(null, [8, 7, 6], 'push-up'), lifter).basis).toBe('hold');
  });
});

describe('lastLog', () => {
  const logs: ExerciseLog[] = [
    { exerciseId: 'bench-press', date: '2026-11-03', weightKg: 37.5, reps: [10, 10, 10] },
    { exerciseId: 'bench-press', date: '2026-11-10', weightKg: 40, reps: [8, 8, 7] },
    { exerciseId: 'back-squat', date: '2026-11-11', weightKg: 60, reps: [8, 8, 8] },
  ];

  it('finds the most recent session for an exercise', () => {
    expect(lastLog(logs, 'bench-press')?.weightKg).toBe(40);
    expect(lastLog(logs, 'deadlift')).toBeUndefined();
  });

  it('can look only before a date', () => {
    expect(lastLog(logs, 'bench-press', '2026-11-10')?.weightKg).toBe(37.5);
  });
});

describe('platesPerSide', () => {
  it('loads the fewest plates per side', () => {
    expect(platesPerSide(20)).toEqual({ perSide: [], leftoverKg: 0 });
    expect(platesPerSide(60)).toEqual({ perSide: [20], leftoverKg: 0 });
    expect(platesPerSide(42.5)).toEqual({ perSide: [10, 1.25], leftoverKg: 0 });
    expect(platesPerSide(100)).toEqual({ perSide: [25, 15], leftoverKg: 0 });
  });

  it('reports weight it cannot make', () => {
    expect(platesPerSide(21)).toEqual({ perSide: [], leftoverKg: 1 });
  });
});
