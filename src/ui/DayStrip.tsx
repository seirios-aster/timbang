import { DAYS, todayIndex } from '@/lib/date';
import styles from './DayStrip.module.css';

interface DayStripProps {
  selected: number;
  onSelect: (dayIndex: number) => void;
  /**
   * A short line under each day, Monday to Sunday, such as the workout code.
   * A null entry marks an empty day and is drawn muted.
   */
  captions?: (string | null)[];
}

/** Monday to Sunday. Today carries a small red dot. */
export function DayStrip({ selected, onSelect, captions }: DayStripProps) {
  const today = todayIndex();
  return (
    <div className={styles.strip} role="group" aria-label="Day of the week">
      {DAYS.map((day, index) => {
        const caption = captions?.[index];
        const classes = [styles.day, captions ? styles.tall : '', captions && caption === null ? styles.empty : '']
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={day.short}
            type="button"
            className={classes}
            aria-pressed={index === selected}
            aria-label={index === today ? `${day.long}, today` : day.long}
            onClick={() => onSelect(index)}
          >
            {day.short}
            {captions && <span className={styles.caption}>{caption ?? '–'}</span>}
            {index === today && <span className={styles.today} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
