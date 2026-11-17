/**
 * Combining two copies of the same data when both changed since they last agreed. The rule is the
 * same everywhere: keep what only one side has, and where both have the same item, the cloud copy wins.
 * Settings-like data simply takes the cloud copy.
 *
 * Deleting on one device and changing on another can bring a deleted item back. That is the price of
 * never losing something someone entered.
 */

type Obj = Record<string, unknown>;

const asObj = (value: unknown): Obj => (value !== null && typeof value === 'object' ? (value as Obj) : {});
const asArr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** A list of items merged by a key. Items only in `local` stay, and for items in both, `remote` wins. */
export function unionBy<T>(local: readonly T[], remote: readonly T[], keyOf: (item: T) => string): T[] {
  const merged = new Map<string, T>();
  for (const item of local) merged.set(keyOf(item), item);
  for (const item of remote) merged.set(keyOf(item), item);
  return [...merged.values()];
}

/** Data that is one decision, not a list: the cloud copy is taken, with local values filling gaps. */
export function preferRemote(local: unknown, remote: unknown): Record<string, unknown> {
  const result: Obj = { ...asObj(local) };
  for (const [key, value] of Object.entries(asObj(remote))) {
    if (value !== null && value !== undefined) result[key] = value;
  }
  return result;
}

/** What was eaten, by date. Two copies of one day are combined: marks from both, extras from both. */
export function mergeMealLog(local: unknown, remote: unknown): unknown {
  const localDays = asObj(asObj(local).days);
  const remoteDays = asObj(asObj(remote).days);
  const days: Obj = { ...localDays };
  for (const [date, remoteDay] of Object.entries(remoteDays)) {
    const mine = asObj(localDays[date]);
    const theirs = asObj(remoteDay);
    days[date] = {
      ...mine,
      ...theirs,
      meals: { ...asObj(mine.meals), ...asObj(theirs.meals) },
      extras: unionBy(asArr(mine.extras), asArr(theirs.extras), (extra) => String((extra as Obj).id)),
    };
  }
  return { days };
}

export function mergeTraining(local: unknown, remote: unknown): unknown {
  const mine = asObj(local);
  const theirs = asObj(remote);
  return {
    ...preferRemote(mine, theirs),
    swaps: { ...asObj(mine.swaps), ...asObj(theirs.swaps) },
    logs: unionBy(asArr(mine.logs), asArr(theirs.logs), (log) => `${(log as Obj).exerciseId}|${(log as Obj).date}`),
  };
}

export function mergeProgress(local: unknown, remote: unknown): unknown {
  return {
    entries: unionBy(asArr(asObj(local).entries), asArr(asObj(remote).entries), (entry) => String((entry as Obj).date)),
  };
}

export function mergeSteps(local: unknown, remote: unknown): unknown {
  return {
    ...preferRemote(local, remote),
    days: { ...asObj(asObj(local).days), ...asObj(asObj(remote).days) },
  };
}

export function mergeCustomFoods(local: unknown, remote: unknown): unknown {
  return { foods: unionBy(asArr(asObj(local).foods), asArr(asObj(remote).foods), (food) => String((food as Obj).id)) };
}
