import { useEffect, useRef, useState } from 'react';
import { daysBetween } from '@/domain/progress/trend';
import { fmtShortDate } from '@/lib/date';
import { fmtKg } from '@/lib/format';
import styles from './TrendChart.module.css';

export interface LiftPoint {
  date: string;
  value: number;
  /** A line of detail for the tooltip, such as "42.5 kg × 10, 9, 9". */
  detail: string;
}

interface LiftChartProps {
  points: LiftPoint[];
  /** What the value is, for the tooltip and the description: "est. max" or "reps". */
  measure: string;
  unit: string;
}

const HEIGHT = 180;
const MARGIN = { top: 16, right: 48, bottom: 26, left: 38 };

function niceTicks(min: number, max: number): number[] {
  const span = Math.max(max - min, 1);
  const step = [1, 2, 2.5, 5, 10, 20, 25, 50, 100].find((candidate) => span / candidate <= 4) ?? 100;
  const ticks: number[] = [];
  for (let value = Math.floor(min / step) * step; value <= max + step / 2; value += step) ticks.push(value);
  return ticks;
}

/** One lift over time, a point per session. The latest value is labeled directly. */
export function LiftChart({ points, measure, unit }: LiftChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return null;

  const totalDays = Math.max(1, daysBetween(first.date, last.date));
  const values = points.map((point) => point.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0]!;
  const yMax = ticks[ticks.length - 1]!;

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (date: string) => MARGIN.left + (daysBetween(first.date, date) / totalDays) * innerWidth;
  const y = (value: number) => MARGIN.top + (1 - (value - yMin) / (yMax - yMin || 1)) * innerHeight;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.date)} ${y(p.value)}`).join(' ');

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
    <div className={styles.plot} ref={ref} style={{ minHeight: HEIGHT }}>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${measure} from ${fmtShortDate(first.date)} to ${fmtShortDate(last.date)}: ${fmtKg(first.value)} to ${fmtKg(last.value)} ${unit}. Every session is listed below.`}
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
          <text x={MARGIN.left} y={HEIGHT - 6} className={styles.xLabel}>
            {fmtShortDate(first.date)}
          </text>
          <text x={width - MARGIN.right} y={HEIGHT - 6} className={styles.xLabelEnd}>
            {fmtShortDate(last.date)}
          </text>

          <path d={path} className={styles.trend} />
          {points.map((p) => (
            <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={3.5} className={styles.dot} />
          ))}
          <circle cx={x(last.date)} cy={y(last.value)} r={5} className={styles.endDot} />
          <text x={x(last.date) + 9} y={y(last.value)} className={styles.endLabel}>
            {fmtKg(Math.round(last.value * 10) / 10)}
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
            <strong>
              {fmtKg(Math.round(shown.value * 10) / 10)} {unit}
            </strong>{' '}
            {measure}
          </p>
          <p>{shown.detail}</p>
        </div>
      )}
    </div>
  );
}
