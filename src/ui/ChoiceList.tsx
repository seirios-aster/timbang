import styles from './ChoiceList.module.css';

export interface Choice<T extends string | number> {
  value: T;
  title: string;
  detail?: string;
}

interface ChoiceListProps<T extends string | number> {
  /** Shared `name` of the radio inputs. */
  name: string;
  legend: string;
  hideLegend?: boolean;
  choices: Choice<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  /** `rows` stacks full-width options. `cells` puts them side by side. */
  layout?: 'rows' | 'cells';
}

/** A single-choice picker. Each option is a large, ledger-style row or cell. */
export function ChoiceList<T extends string | number>({
  name,
  legend,
  hideLegend = false,
  choices,
  value,
  onChange,
  layout = 'rows',
}: ChoiceListProps<T>) {
  return (
    <fieldset className={styles.group}>
      <legend className={hideLegend ? 'visually-hidden' : `eyebrow ${styles.legend}`}>{legend}</legend>
      <div className={layout === 'rows' ? styles.rows : styles.cells}>
        {choices.map((choice) => (
          <label key={choice.value} className={styles.option}>
            <input
              type="radio"
              className="visually-hidden"
              id={`${name}-${choice.value}`}
              name={name}
              checked={choice.value === value}
              onChange={() => onChange(choice.value)}
            />
            <span className={styles.body}>
              <span className={styles.title}>{choice.title}</span>
              {choice.detail && <span className={styles.detail}>{choice.detail}</span>}
            </span>
            <span className={styles.mark} aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
