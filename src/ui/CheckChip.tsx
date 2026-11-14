import styles from './CheckChip.module.css';

interface CheckChipProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** A small on/off toggle shown as a chip. */
export function CheckChip({ id, label, checked, onChange }: CheckChipProps) {
  return (
    <label className={styles.chip}>
      <input
        id={id}
        type="checkbox"
        className="visually-hidden"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.box} aria-hidden="true" />
      {label}
    </label>
  );
}
