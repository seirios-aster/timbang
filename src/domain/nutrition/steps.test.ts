import { describe, expect, it } from 'vitest';
import { suggestCalibration } from './calibration';
import { stepAverage, lifestyleFromSteps } from './steps';
import { computeTargets } from './targets';
import type { Profile } from './types';
import type { WeighIn } from '../progress/types';

const profile: Profile = { sex: 'male', age: 25, heightCm: 170, weightKg: 70, lifestyle: 'desk', trainingDays: 4, experience: 'intermediate', goal: 'lose' };

function weighIns(startKg: number, perWeek: number, count: number, gap = 2): WeighIn[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i),
    date: new Date(Date.UTC(2026, 9, 1 + i * gap)).toISOString().slice(0, 10),
    weightKg: startKg + (perWeek * i * gap) / 7,
  }));
}

describe('step averages', () => {
  it('averages the logged days in the last week', () => {
    expect(stepAverage({ '2026-11-15': 6000, '2026-11-14': 8000, '2026-11-13': 7000, '2026-11-12': 7000 }, '2026-11-15')).toEqual({ average: 7000, days: 4 });
  });

  it('needs four days, and ignores old days', () => {
    expect(stepAverage({ '2026-11-15': 6000, '2026-11-14': 8000, '2026-11-13': 7000 }, '2026-11-15')).toBeNull();
    expect(stepAverage({ '2026-11-15': 6000, '2026-11-14': 8000, '2026-11-13': 7000, '2026-11-01': 9000 }, '2026-11-15')).toBeNull();
  });

  it('maps a daily average to a lifestyle level', () => {
    expect(lifestyleFromSteps(3000)).toBe('desk');
    expect(lifestyleFromSteps(6500)).toBe('mixed');
    expect(lifestyleFromSteps(8200)).toBe('onFeet');
    expect(lifestyleFromSteps(12000)).toBe('manual');
  });
});

describe('calibrating calories from weigh-ins', () => {
  const planned = computeTargets(profile).weeklyChangeKg; // a cut, so negative

  it('stays quiet without enough data', () => {
    expect(suggestCalibration(weighIns(70, -0.4, 4), planned)).toBeNull();
    expect(suggestCalibration(weighIns(70, -0.4, 6, 1), planned)).toBeNull();
  });

  it('stays quiet when the scale matches the plan', () => {
    expect(suggestCalibration(weighIns(70, planned, 10), planned)).toBeNull();
  });

  it('lowers the estimate when weight is not falling as planned', () => {
    const result = suggestCalibration(weighIns(70, planned + 0.3, 10), planned)!;
    expect(result.maintenanceDeltaKcal).toBeLessThan(0);
    expect(Math.abs(result.maintenanceDeltaKcal) % 50).toBe(0);
  });

  it('raises the estimate when weight falls faster than planned', () => {
    expect(suggestCalibration(weighIns(70, planned - 0.3, 10), planned)!.maintenanceDeltaKcal).toBeGreaterThan(0);
  });

  it('never moves the estimate by more than 300 at once', () => {
    expect(Math.abs(suggestCalibration(weighIns(70, 0.6, 10), planned)!.maintenanceDeltaKcal)).toBe(300);
  });

  it('only uses weigh-ins after the last correction', () => {
    const entries = weighIns(70, planned + 0.3, 10);
    expect(suggestCalibration(entries, planned, entries[8]!.date)).toBeNull();
  });
});

describe('a calibrated target', () => {
  it('moves maintenance, and the cut follows it', () => {
    const base = computeTargets(profile);
    const adjusted = computeTargets({ ...profile, calorieAdjustment: -200, calibratedOn: '2026-11-01' });
    expect(adjusted.calibrationKcal).toBe(-200);
    expect(adjusted.maintenance).toBe(base.maintenance - 200);
    // The cut keeps the same shape: 20% under the corrected maintenance.
    expect(adjusted.calories / adjusted.maintenance).toBeCloseTo(0.8, 1);
    expect(adjusted.weeklyChangeKg).toBeCloseTo(base.weeklyChangeKg * (adjusted.maintenance / base.maintenance), 1);
  });
});
