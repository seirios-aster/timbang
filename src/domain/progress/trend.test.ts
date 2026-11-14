import { describe, expect, it } from 'vitest';
import { daysBetween, paceReport, trend, weeklyRate } from './trend';
import type { WeighIn } from './types';

/** Weigh-ins every `gap` days, changing by `perWeek` kg each week. */
function series(start: number, perWeek: number, count: number, gap = 2): WeighIn[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(2026, 0, 1 + i * gap)).toISOString().slice(0, 10);
    return { id: String(i), date, weightKg: start + (perWeek * i * gap) / 7 };
  });
}

describe('daysBetween', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2026-01-01', '2026-01-08')).toBe(7);
    expect(daysBetween('2026-02-27', '2026-03-01')).toBe(2);
  });
});

describe('trend', () => {
  it('smooths out a one-day spike', () => {
    const entries = series(70, 0, 6, 1);
    entries[3] = { ...entries[3]!, weightKg: 72 };
    const points = trend(entries);
    expect(points[3]!.trendKg).toBeLessThan(70.5);
    expect(points[5]!.trendKg).toBeCloseTo(70.2, 0);
  });

  it('follows a steady loss without lagging', () => {
    const points = trend(series(70, -0.5, 10));
    for (const point of points) expect(point.trendKg).toBeCloseTo(point.weightKg, 5);
  });

  it('sorts entries by date', () => {
    const points = trend([...series(70, -0.5, 4)].reverse());
    expect(points.map((p) => p.date)).toEqual([...points.map((p) => p.date)].sort());
  });
});

describe('weeklyRate', () => {
  it('needs at least a week of data', () => {
    expect(weeklyRate(series(70, -0.5, 2))).toBeUndefined();
    expect(weeklyRate(series(70, -0.5, 3, 1))).toBeUndefined();
  });

  it('measures the weekly change', () => {
    expect(weeklyRate(series(70, -0.5, 10))).toBeCloseTo(-0.5, 5);
    expect(weeklyRate(series(60, 0.3, 10))).toBeCloseTo(0.3, 5);
  });
});

describe('paceReport', () => {
  it('asks for more data first', () => {
    expect(paceReport(series(70, -0.5, 2), -0.5).status).toBe('needsData');
  });

  it('recognises a cut that is on pace', () => {
    expect(paceReport(series(70, -0.45, 10), -0.5).status).toBe('onPace');
  });

  it('flags losing too fast or too slowly', () => {
    expect(paceReport(series(70, -1.1, 10), -0.5).status).toBe('tooFast');
    expect(paceReport(series(70, -0.1, 10), -0.5).status).toBe('tooSlow');
  });

  it('flags moving the wrong way', () => {
    expect(paceReport(series(70, 0.4, 10), -0.5).status).toBe('wrongWay');
    expect(paceReport(series(70, -0.4, 10), 0.3).status).toBe('wrongWay');
  });

  it('treats small drift as steady when maintaining', () => {
    expect(paceReport(series(70, 0.05, 10), 0).status).toBe('onPace');
    expect(paceReport(series(70, 0.5, 10), 0).status).toBe('wrongWay');
  });
});
