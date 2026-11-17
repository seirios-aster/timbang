import { describe, expect, it } from 'vitest';
import { canonical } from './canonical';
import { createSerialRunner, runSync, type Remote, type RemoteRow, type Syncable, type SyncMeta } from './engine';
import { mergeCustomFoods, mergeMealLog, mergeProgress, mergeSteps, mergeTraining, preferRemote, unionBy } from './merge';

/** A cloud that lives in memory. Each write gets the next version number as its timestamp. */
function fakeCloud(initial: Record<string, unknown> = {}) {
  let version = 0;
  const rows: Record<string, RemoteRow> = {};
  const next = () => `v${(version += 1)}`;
  for (const [store, data] of Object.entries(initial)) rows[store] = { data, updatedAt: next() };
  const calls = { insert: 0, update: 0, fetch: 0 };
  let interfere: (() => void) | null = null;

  const remote: Remote = {
    async fetchAll() {
      calls.fetch += 1;
      return JSON.parse(JSON.stringify(rows)) as Record<string, RemoteRow>;
    },
    async insert(store, data) {
      calls.insert += 1;
      interfere?.();
      interfere = null;
      if (rows[store]) return 'exists';
      rows[store] = { data: JSON.parse(JSON.stringify(data)), updatedAt: next() };
      return rows[store]!;
    },
    async update(store, data, expected) {
      calls.update += 1;
      interfere?.();
      interfere = null;
      if (rows[store]?.updatedAt !== expected) return 'stale';
      rows[store] = { data: JSON.parse(JSON.stringify(data)), updatedAt: next() };
      return rows[store]!;
    },
  };
  return {
    remote,
    rows,
    calls,
    /** Run something just before the next write, as if another device got in first. */
    beforeNextWrite: (fn: () => void) => (interfere = fn),
    writeAsOtherDevice: (store: string, data: unknown) => (rows[store] = { data, updatedAt: next() }),
  };
}

/** A device with one kind of data: a list of weigh-ins. */
function device(entries: { date: string; kg: number }[] = []) {
  let state: unknown = { entries };
  const meta: SyncMeta = {};
  const syncable: Syncable = {
    key: 'progress',
    read: () => state,
    write: (data) => (state = data),
    isEmpty: (data) => ((data as { entries: unknown[] }).entries ?? []).length === 0,
    merge: mergeProgress,
  };
  return {
    syncables: [syncable],
    meta,
    get entries() {
      return (state as { entries: { date: string; kg: number }[] }).entries;
    },
    set entries(entries: { date: string; kg: number }[]) {
      state = { entries };
    },
  };
}

describe('canonical form', () => {
  it('ignores key order', () => {
    expect(canonical({ b: 1, a: { d: [1, { z: 1, y: 2 }], c: 2 } })).toBe(canonical({ a: { c: 2, d: [1, { y: 2, z: 1 }] }, b: 1 }));
  });
});

describe('syncing one device', () => {
  it('sends what is on the device the first time, and nothing when there is none', async () => {
    const cloud = fakeCloud();
    const full = device([{ date: '2026-11-01', kg: 70 }]);
    expect((await runSync(full.syncables, cloud.remote, full.meta)).pushed).toEqual(['progress']);
    expect(cloud.rows.progress!.data).toEqual({ entries: [{ date: '2026-11-01', kg: 70 }] });

    const empty = device();
    const emptyCloud = fakeCloud();
    expect((await runSync(empty.syncables, emptyCloud.remote, empty.meta)).pushed).toEqual([]);
    expect(Object.keys(emptyCloud.rows)).toEqual([]);
  });

  it('does not send again when nothing changed', async () => {
    const cloud = fakeCloud();
    const phone = device([{ date: '2026-11-01', kg: 70 }]);
    await runSync(phone.syncables, cloud.remote, phone.meta);
    const writes = cloud.calls.insert + cloud.calls.update;
    await runSync(phone.syncables, cloud.remote, phone.meta);
    expect(cloud.calls.insert + cloud.calls.update).toBe(writes);
  });

  it('sends a change made later', async () => {
    const cloud = fakeCloud();
    const phone = device([{ date: '2026-11-01', kg: 70 }]);
    await runSync(phone.syncables, cloud.remote, phone.meta);
    phone.entries = [...phone.entries, { date: '2026-11-02', kg: 69.8 }];
    expect((await runSync(phone.syncables, cloud.remote, phone.meta)).pushed).toEqual(['progress']);
    expect((cloud.rows.progress!.data as { entries: unknown[] }).entries).toHaveLength(2);
  });

  it('sends a deletion, since a deletion is a change', async () => {
    const cloud = fakeCloud();
    const phone = device([{ date: '2026-11-01', kg: 70 }, { date: '2026-11-02', kg: 69 }]);
    await runSync(phone.syncables, cloud.remote, phone.meta);
    phone.entries = [{ date: '2026-11-01', kg: 70 }];
    await runSync(phone.syncables, cloud.remote, phone.meta);
    expect((cloud.rows.progress!.data as { entries: unknown[] }).entries).toHaveLength(1);
  });
});

describe('syncing two devices', () => {
  it('brings data onto a new, empty device', async () => {
    const cloud = fakeCloud();
    const phone = device([{ date: '2026-11-01', kg: 70 }]);
    await runSync(phone.syncables, cloud.remote, phone.meta);

    const tablet = device();
    const result = await runSync(tablet.syncables, cloud.remote, tablet.meta);
    expect(result.pulled).toEqual(['progress']);
    expect(tablet.entries).toEqual([{ date: '2026-11-01', kg: 70 }]);
  });

  it('carries a change from one device to the other, deletions included', async () => {
    const cloud = fakeCloud();
    const phone = device([{ date: '2026-11-01', kg: 70 }, { date: '2026-11-02', kg: 69 }]);
    const tablet = device();
    await runSync(phone.syncables, cloud.remote, phone.meta);
    await runSync(tablet.syncables, cloud.remote, tablet.meta);

    phone.entries = [{ date: '2026-11-01', kg: 70 }];
    await runSync(phone.syncables, cloud.remote, phone.meta);
    await runSync(tablet.syncables, cloud.remote, tablet.meta);
    expect(tablet.entries).toEqual([{ date: '2026-11-01', kg: 70 }]);
  });

  it('merges when both devices changed, and keeps both changes', async () => {
    const cloud = fakeCloud();
    const phone = device([{ date: '2026-11-01', kg: 70 }]);
    const tablet = device();
    await runSync(phone.syncables, cloud.remote, phone.meta);
    await runSync(tablet.syncables, cloud.remote, tablet.meta);

    phone.entries = [...phone.entries, { date: '2026-11-02', kg: 69.5 }];
    tablet.entries = [...tablet.entries, { date: '2026-11-03', kg: 69.2 }];
    await runSync(phone.syncables, cloud.remote, phone.meta);
    const result = await runSync(tablet.syncables, cloud.remote, tablet.meta);

    expect(result.merged).toEqual(['progress']);
    const dates = tablet.entries.map((entry) => entry.date).sort();
    expect(dates).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
    // The merged result went back to the cloud, so the phone gets it too.
    await runSync(phone.syncables, cloud.remote, phone.meta);
    expect(phone.entries.map((entry) => entry.date).sort()).toEqual(dates);
  });

  it('merges the first time a device with its own data meets an account that has data', async () => {
    const cloud = fakeCloud({ progress: { entries: [{ date: '2026-10-01', kg: 71 }] } });
    const phone = device([{ date: '2026-11-01', kg: 70 }]);
    await runSync(phone.syncables, cloud.remote, phone.meta);
    expect(phone.entries.map((entry) => entry.date).sort()).toEqual(['2026-10-01', '2026-11-01']);
    expect((cloud.rows.progress!.data as { entries: unknown[] }).entries).toHaveLength(2);
  });

  it('tries again when another device writes in between', async () => {
    const cloud = fakeCloud();
    const phone = device([{ date: '2026-11-01', kg: 70 }]);
    await runSync(phone.syncables, cloud.remote, phone.meta);

    phone.entries = [...phone.entries, { date: '2026-11-02', kg: 69.5 }];
    cloud.beforeNextWrite(() => cloud.writeAsOtherDevice('progress', { entries: [{ date: '2026-11-01', kg: 70 }, { date: '2026-11-09', kg: 68 }] }));
    await runSync(phone.syncables, cloud.remote, phone.meta);

    // Nothing was lost: the other device's entry and ours are both in the cloud.
    const dates = (cloud.rows.progress!.data as { entries: { date: string }[] }).entries.map((entry) => entry.date).sort();
    expect(dates).toEqual(['2026-11-01', '2026-11-02', '2026-11-09']);
  });
});

describe('running one sync at a time', () => {
  it('folds requests that arrive during a run into one more run', async () => {
    let runs = 0;
    let release: () => void = () => undefined;
    const run = createSerialRunner(async () => {
      runs += 1;
      await new Promise<void>((resolve) => (release = resolve));
    });
    const first = run();
    void run();
    void run();
    release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    release();
    await first;
    expect(runs).toBe(2);
  });
});

describe('merge rules', () => {
  it('unions by key with the cloud winning ties', () => {
    expect(unionBy([{ id: 'a', v: 1 }, { id: 'b', v: 1 }], [{ id: 'b', v: 2 }, { id: 'c', v: 2 }], (item) => item.id)).toEqual([
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'c', v: 2 },
    ]);
  });

  it('takes the cloud copy of a setting but keeps values the cloud lacks', () => {
    expect(preferRemote({ units: 'metric', extra: 1 }, { units: 'imperial', extra: null })).toEqual({ units: 'imperial', extra: 1 });
  });

  it('combines two copies of one day of eating', () => {
    const local = { days: { '2026-11-16': { meals: { m1: { status: 'eaten' } }, extras: [{ id: 'x', name: 'Turon' }] } } };
    const remote = { days: { '2026-11-16': { meals: { m2: { status: 'skipped' } }, extras: [{ id: 'y', name: 'Milk tea' }] }, '2026-11-15': { meals: {}, extras: [] } } };
    const merged = mergeMealLog(local, remote) as { days: Record<string, { meals: object; extras: unknown[] }> };
    expect(Object.keys(merged.days['2026-11-16']!.meals).sort()).toEqual(['m1', 'm2']);
    expect(merged.days['2026-11-16']!.extras).toHaveLength(2);
    expect(Object.keys(merged.days)).toHaveLength(2);
  });

  it('keeps training logs from both sides and the cloud copy of a log for the same lift and day', () => {
    const local = { equipment: 'gym', swaps: { 'a:0': 'x' }, logs: [{ exerciseId: 'bench-press', date: '2026-11-01', reps: [8] }] };
    const remote = { equipment: 'dumbbells', swaps: { 'b:1': 'y' }, logs: [{ exerciseId: 'bench-press', date: '2026-11-01', reps: [10] }, { exerciseId: 'back-squat', date: '2026-11-02', reps: [8] }] };
    const merged = mergeTraining(local, remote) as { equipment: string; swaps: object; logs: { reps: number[] }[] };
    expect(merged.equipment).toBe('dumbbells');
    expect(Object.keys(merged.swaps)).toHaveLength(2);
    expect(merged.logs).toHaveLength(2);
    expect(merged.logs[0]!.reps).toEqual([10]);
  });

  it('merges steps by day, weigh-ins by date, and custom foods by id', () => {
    expect(mergeSteps({ days: { a: 1 }, goal: 8000 }, { days: { b: 2 }, goal: 9000 })).toEqual({ days: { a: 1, b: 2 }, goal: 9000 });
    expect((mergeProgress({ entries: [{ date: 'd1' }] }, { entries: [{ date: 'd2' }] }) as { entries: unknown[] }).entries).toHaveLength(2);
    expect((mergeCustomFoods({ foods: [{ id: 'custom-1' }] }, { foods: [{ id: 'custom-2' }] }) as { foods: unknown[] }).foods).toHaveLength(2);
  });
});
