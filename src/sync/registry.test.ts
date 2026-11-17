import { describe, expect, it } from 'vitest';
import { canonical } from '@/domain/sync/canonical';
import { runSync, type Remote, type RemoteRow } from '@/domain/sync/engine';
import { useMealLogStore } from '@/state/mealLogStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useStepsStore } from '@/state/stepsStore';
import { useTrainingStore } from '@/state/trainingStore';
import { SYNCABLES, clearDeviceData, deviceHasData } from './registry';

function fakeCloud(): Remote {
  const rows: Record<string, RemoteRow> = {};
  let tick = 0;
  return {
    async fetchAll() {
      return structuredClone(rows);
    },
    async insert(store, data) {
      if (rows[store]) return 'exists';
      return (rows[store] = { data: structuredClone(data), updatedAt: String(++tick) });
    },
    async update(store, data, expected) {
      if (rows[store]?.updatedAt !== expected) return 'stale';
      return (rows[store] = { data: structuredClone(data), updatedAt: String(++tick) });
    },
  };
}

describe('the synced stores', () => {
  it('start out empty on a fresh install', () => {
    clearDeviceData();
    expect(deviceHasData()).toBe(false);
  });

  it('read back exactly what they were given, and are cleared by clearDeviceData', () => {
    clearDeviceData();
    useSettingsStore.getState().setUnits('imperial');
    useStepsStore.setState({ days: { '2026-11-16': 8200 } });
    expect(deviceHasData()).toBe(true);
    const steps = SYNCABLES.find((s) => s.key === 'steps')!;
    expect(canonical(steps.read())).toContain('8200');
    clearDeviceData();
    expect(useSettingsStore.getState().units).toBe('metric');
    expect(useStepsStore.getState().days).toEqual({});
    expect(deviceHasData()).toBe(false);
  });

  it('never send a workout in progress or other per-device state', () => {
    clearDeviceData();
    const training = SYNCABLES.find((s) => s.key === 'training')!;
    expect(Object.keys(training.read() as object).sort()).toEqual(
      ['deloadSnoozedUntil', 'deloadUntil', 'equipment', 'logs', 'swaps'].sort(),
    );
    const settings = SYNCABLES.find((s) => s.key === 'settings')!;
    expect(settings.read()).toEqual({ units: useSettingsStore.getState().units });
  });

  it('carry a real change from one device to another through the cloud', async () => {
    clearDeviceData();
    const cloud = fakeCloud();
    useStepsStore.setState({ days: { '2026-11-16': 9000 } });
    useSettingsStore.getState().setUnits('imperial');
    const first = await runSync(SYNCABLES, cloud, {});
    expect(first.pushed.sort()).toEqual(['settings', 'steps']);

    // A second, empty device signs in.
    clearDeviceData();
    const second = await runSync(SYNCABLES, cloud, {});
    expect(second.pulled.sort()).toEqual(['settings', 'steps']);
    expect(useStepsStore.getState().days).toEqual({ '2026-11-16': 9000 });
    expect(useSettingsStore.getState().units).toBe('imperial');
    expect(useMealLogStore.getState().days).toEqual({});
    expect(useTrainingStore.getState().session).toBeNull();
    clearDeviceData();
  });
});
