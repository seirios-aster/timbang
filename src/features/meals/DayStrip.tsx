import { DAYS, todayIndex } from '@/lib/date';
import styles from './DayStrip.module.css';

interface DayStripProps {
  selected: number;
  onSelect: (dayIndex: number) => void;
}

/** Monday to Sunday. Today carries a small red dot. */
export function DayStrip({ selected, onSelect }: DayStripProps) {
  const today = todayIndex();
  return (
    <div className={styles.strip} role="group" aria-label="Day of the week">
      {DAYS.map((day, index) => (
        <button
          key={day.short}
          type="button"
          className={styles.day}
          aria-pressed={index === selected}
          aria-label={index === today ? `${day.long}, today` : day.long}
          onClick={() => onSelect(index)}
        >
          {day.short}
          {index === today && <span className={styles.today} aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}
