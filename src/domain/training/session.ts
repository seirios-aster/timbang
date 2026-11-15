import { DEFAULT_RIR } from './effort';
import type { LiftRecord } from './stats';
import type { ExerciseLog, Workout } from './types';

/**
 * A guided workout session: one set at a time, with a rest timer between sets.
 *
 * Every function here is pure and takes the current time as an argument, so the
 * rules can be tested without a clock. Times are milliseconds since the epoch.
 * The session is stored, so it survives a page reload or a locked phone.
 */

export interface SetEntry {
  /** Weight used, in kg. Null for bodyweight exercises. */
  weightKg: number | null;
  /** Reps done, or seconds for timed holds. */
  reps: number;
  /** Reps left after the set, as the person judged it. */
  rir?: number;
}

export type SessionPhase = 'work' | 'rest';

export interface Session {
  workoutId: string;
  /** Weekday of the workout, Monday = 0. */
  dayIndex: number;
  /** Local calendar date the session started, YYYY-MM-DD. */
  date: string;
  startedAt: number;
  /** Slot of the exercise being done now. */
  slot: number;
  phase: SessionPhase;
  /** When the current rest ends. Null outside a rest. */
  restEndsAt: number | null;
  /** When the session was paused. Null while running. */
  pausedAt: number | null;
  /** Total time spent paused so far. */
  pausedMs: number;
  /** Active session time, in ms, when the current set began. The set clock counts from here. */
  setStartMs: number;
  /** Sets completed so far, by exercise slot. */
  sets: Record<number, SetEntry[]>;
}

export interface SessionSummary {
  workoutName: string;
  date: string;
  /** Active time, not counting pauses. */
  durationMs: number;
  setsDone: number;
  setsPlanned: number;
  liftsDone: number;
  liftsPlanned: number;
  /** The lifts that had sets done, with their rep ranges, so next session can be worked out from them. */
  lifts?: { exerciseId: string; repsMin: number; repsMax: number }[];
  /** Personal records set in this session. Filled in when the session is saved. */
  records?: LiftRecord[];
}

const setsDoneFor = (session: Session, slot: number) => session.sets[slot]?.length ?? 0;

function plannedFor(workout: Workout, slot: number) {
  return workout.exercises.find((planned) => planned.slot === slot);
}

/** The first exercise that still has sets left, looking after `afterSlot` first, then from the top. */
export function nextIncompleteSlot(session: Session, workout: Workout, afterSlot?: number): number | null {
  const incomplete = workout.exercises.filter((planned) => setsDoneFor(session, planned.slot) < planned.sets);
  if (incomplete.length === 0) return null;
  const later = afterSlot === undefined ? undefined : incomplete.find((planned) => planned.slot > afterSlot);
  return (later ?? incomplete[0]!).slot;
}

export function startSession(workout: Workout, dayIndex: number, date: string, now: number): Session {
  return {
    workoutId: workout.id,
    dayIndex,
    date,
    startedAt: now,
    slot: workout.exercises[0]?.slot ?? 0,
    phase: 'work',
    restEndsAt: null,
    pausedAt: null,
    pausedMs: 0,
    setStartMs: 0,
    sets: {},
  };
}

export const isPaused = (session: Session) => session.pausedAt !== null;

/** True once every set of every exercise is done. */
export function isComplete(session: Session, workout: Workout): boolean {
  return nextIncompleteSlot(session, workout) === null;
}

/**
 * Records a finished set and starts the rest that follows it.
 * When the exercise has sets left, the rest leads into its next set. Otherwise it
 * leads into the next exercise that still has work to do.
 */
export function completeSet(session: Session, workout: Workout, entry: SetEntry, now: number): Session {
  const planned = plannedFor(workout, session.slot);
  if (!planned) return session;

  const sets = { ...session.sets, [session.slot]: [...(session.sets[session.slot] ?? []), entry] };
  const next: Session = { ...session, sets };

  const moreHere = sets[session.slot]!.length < planned.sets;
  const nextSlot = moreHere ? session.slot : nextIncompleteSlot(next, workout, session.slot);

  // Nothing left: stay put, with no rest to wait out. The caller finishes the session.
  if (nextSlot === null) return { ...next, phase: 'work', restEndsAt: null };

  return { ...next, slot: nextSlot, phase: 'rest', restEndsAt: now + planned.restSec * 1000 };
}

/** Ends the rest, whether the timer ran out or the person skipped it. */
export function endRest(session: Session, now: number): Session {
  return { ...session, phase: 'work', restEndsAt: null, setStartMs: elapsed(session, now) };
}

/** Adds time to the current rest. A negative amount shortens it. */
export function extendRest(session: Session, ms: number, now: number): Session {
  if (session.phase !== 'rest' || session.restEndsAt === null) return session;
  return { ...session, restEndsAt: Math.max(now, session.restEndsAt + ms) };
}

/** Milliseconds of rest left. While paused, the countdown is frozen. */
export function restRemaining(session: Session, now: number): number {
  if (session.phase !== 'rest' || session.restEndsAt === null) return 0;
  return Math.max(0, session.restEndsAt - (session.pausedAt ?? now));
}

export function pause(session: Session, now: number): Session {
  return isPaused(session) ? session : { ...session, pausedAt: now };
}

/** Resumes, pushing the rest timer back by however long the pause lasted. */
export function resume(session: Session, now: number): Session {
  if (session.pausedAt === null) return session;
  const pausedFor = now - session.pausedAt;
  return {
    ...session,
    pausedAt: null,
    pausedMs: session.pausedMs + pausedFor,
    restEndsAt: session.restEndsAt === null ? null : session.restEndsAt + pausedFor,
  };
}

/** Active time so far, not counting pauses. */
export function elapsed(session: Session, now: number): number {
  return (session.pausedAt ?? now) - session.startedAt - session.pausedMs;
}

/** Time on the current set, not counting pauses. */
export function setElapsed(session: Session, now: number): number {
  return Math.max(0, elapsed(session, now) - (session.setStartMs ?? 0));
}

/** Switches to another exercise, for when the equipment is taken. Any running rest is dropped. */
export function jumpTo(session: Session, workout: Workout, slot: number, now: number): Session {
  if (!plannedFor(workout, slot)) return session;
  return { ...session, slot, phase: 'work', restEndsAt: null, setStartMs: elapsed(session, now) };
}

/** Moves past the current exercise without finishing its sets. Returns null when nothing else is left. */
export function skipExercise(session: Session, workout: Workout, now: number): Session | null {
  const others = workout.exercises.filter(
    (planned) => planned.slot !== session.slot && setsDoneFor(session, planned.slot) < planned.sets,
  );
  const next = others.find((planned) => planned.slot > session.slot) ?? others[0];
  return next ? jumpTo(session, workout, next.slot, now) : null;
}

/** Clears the sets logged for a slot. Used when its exercise is swapped for another mid-session. */
export function clearSlot(session: Session, slot: number): Session {
  const sets = { ...session.sets };
  delete sets[slot];
  return { ...session, sets };
}

/** The weight used on the most sets. Ties go to the earlier one. */
function mainWeight(entries: SetEntry[]): number | null {
  const counts = new Map<number | null, number>();
  let best: number | null = entries[0]?.weightKg ?? null;
  for (const entry of entries) {
    const count = (counts.get(entry.weightKg) ?? 0) + 1;
    counts.set(entry.weightKg, count);
    if (count > (counts.get(best) ?? 0)) best = entry.weightKg;
  }
  return best;
}

/** One log per exercise that had at least one set done. These feed the weight guidance next time. */
export function sessionLogs(session: Session, workout: Workout): ExerciseLog[] {
  return workout.exercises.flatMap((planned) => {
    const entries = session.sets[planned.slot] ?? [];
    if (entries.length === 0) return [];
    const rated = entries.some((entry) => entry.rir !== undefined);
    return [
      {
        exerciseId: planned.exerciseId,
        date: session.date,
        weightKg: mainWeight(entries),
        reps: entries.map((entry) => entry.reps),
        ...(rated ? { rir: entries.map((entry) => entry.rir ?? DEFAULT_RIR) } : {}),
      },
    ];
  });
}

export function summarize(session: Session, workout: Workout, now: number): SessionSummary {
  const done = workout.exercises.map((planned) => Math.min(planned.sets, setsDoneFor(session, planned.slot)));
  return {
    workoutName: workout.name,
    date: session.date,
    durationMs: elapsed(session, now),
    setsDone: done.reduce((a, b) => a + b, 0),
    setsPlanned: workout.exercises.reduce((total, planned) => total + planned.sets, 0),
    liftsDone: done.filter((count) => count > 0).length,
    liftsPlanned: workout.exercises.length,
    lifts: workout.exercises
      .filter((planned) => setsDoneFor(session, planned.slot) > 0)
      .map((planned) => ({ exerciseId: planned.exerciseId, repsMin: planned.repsMin, repsMax: planned.repsMax })),
  };
}
