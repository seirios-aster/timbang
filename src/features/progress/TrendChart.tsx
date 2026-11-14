import { useEffect, useRef, useState } from 'react';
import { daysBetween } from '@/domain/progress/trend';
import type { TrendPoint } from '@/domain/progress/types';
import { fmtShortDate } from '@/lib/date';
import { fmtDecimal } from '@/lib/format';
import styles from './TrendChart.module.css';

interface TrendChartProps {
  points: TrendPoint[];
  /** Planned change in kg per week, drawn as a dashed line from the first weigh-in. */
  plannedKgPerWeek: number;
}

const HEIGHT = 220;
const MARGIN = { top: 16, right: 44, bottom: 28, left: 36 };

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round, evenly spaced values that cover the range. */
function niceTicks(min: number, max: number): number[] {
  const span = max - min;
  const step = span <= 2 ? 0.5 : span <= 5 ? 1 : span <= 12 ? 2 : 5;
  const ticks: number[] = [];
  for (let value = Math.floor(min / step) * step; value <= max + step / 2; value += step) ticks.push(value);
  return ticks;
}

/**
 * Weight over time. Dots are the weigh-ins, the solid line is the smoothed
 * trend, and the dashed line is where the calorie target says you should be.
 */
export function TrendChart({ points, plannedKgPerWeek }: TrendChartProps) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return null;

  const totalDays = Math.max(1, daysBetween(first.date, last.date));
  const planAt = (date: string) => first.trendKg + (plannedKgPerWeek * daysBetween(first.date, date)) / 7;

  const values = points.flatMap((p) => [p.weightKg, p.trendKg, planAt(p.date)]);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0]!;
  const yMax = ticks[ticks.length - 1]!;

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (date: string) => MARGIN.left + (daysBetween(first.date, date) / totalDays) * innerWidth;
  const y = (kg: number) => MARGIN.top + (1 - (kg - yMin) / (yMax - yMin || 1)) * innerHeight;

  const trendPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.date)} ${y(p.trendKg)}`).join(' ');

  const pickNearest = (clientX: number, bounds: DOMRect) => {
    const pointerX = clientX - bounds.left;
    let nearest = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - pointerX) < Math.abs(x(points[nearest]!.date) - pointerX)) nearest = i;
    });
    setActive(nearest);
  };

  const shown = active !== null ? points[active] : undefined;
  const tooltipOnLeft = shown ? x(shown.date) > width / 2 : false;

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.legend}>
        <span className={styles.key}>
          <span className={styles.keyTrend} aria-hidden="true" /> Trend
        </span>
        <span className={styles.key}>
          <span className={styles.keyDot} aria-hidden="true" /> Weigh-in
        </span>
        <span className={styles.key}>
          <span className={styles.keyPlan} aria-hidden="true" /> Plan
        </span>
      </figcaption>

      <div className={styles.plot} ref={ref}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`Weight from ${fmtShortDate(first.date)} to ${fmtShortDate(last.date)}. Trend went from ${fmtDecimal(first.trendKg)} to ${fmtDecimal(last.trendKg)} kilograms. Every weigh-in is listed in the history below.`}
            className={styles.svg}
            onPointerMove={(event) => pickNearest(event.clientX, event.currentTarget.getBoundingClientRect())}
            onPointerDown={(event) => pickNearest(event.clientX, event.currentTarget.getBoundingClientRect())}
            onPointerLeave={() => setActive(null)}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} className={styles.grid} />
                <text x={MARGIN.left - 8} y={y(tick)} className={styles.yLabel}>
                  {tick}
                </text>
              </g>
            ))}

            <text x={MARGIN.left} y={HEIGHT - 8} className={styles.xLabel}>
              {fmtShortDate(first.date)}
            </text>
            <text x={width - MARGIN.right} y={HEIGHT - 8} className={styles.xLabelEnd}>
              {fmtShortDate(last.date)}
            </text>

            <line
              x1={x(first.date)}
              y1={y(planAt(first.date))}
              x2={x(last.date)}
              y2={y(planAt(last.date))}
              className={styles.plan}
            />
            <path d={trendPath} className={styles.trend} />

            {points.map((p) => (
              <circle key={p.date} cx={x(p.date)} cy={y(p.weightKg)} r={3.5} className={styles.dot} />
            ))}

            {/* The latest trend value is labeled directly, so the headline number needs no hover. */}
            <circle cx={x(last.date)} cy={y(last.trendKg)} r={5} className={styles.endDot} />
            <text x={x(last.date) + 9} y={y(last.trendKg)} className={styles.endLabel}>
              {fmtDecimal(last.trendKg)}
            </text>

            {shown && (
              <line x1={x(shown.date)} x2={x(shown.date)} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} className={styles.crosshair} />
            )}
          </svg>
        )}

        {shown && (
          <div
            className={styles.tooltip}
            style={tooltipOnLeft ? { right: width - x(shown.date) + 10 } : { left: x(shown.date) + 10 }}
          >
            <p className={styles.tooltipDate}>{fmtShortDate(shown.date)}</p>
            <p>
              <span className={styles.keyDot} aria-hidden="true" /> <strong>{fmtDecimal(shown.weightKg)}</strong> weigh-in
            </p>
            <p>
              <span className={styles.keyTrend} aria-hidden="true" /> <strong>{fmtDecimal(shown.trendKg)}</strong> trend
            </p>
            <p>
              <span className={styles.keyPlan} aria-hidden="true" /> <strong>{fmtDecimal(planAt(shown.date))}</strong> plan
            </p>
          </div>
        )}
      </div>
    </figure>
  );
}
