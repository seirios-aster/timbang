import { nextTheme, useThemeStore } from '@/state/themeStore';
import { Icon } from './Icon';
import styles from './ThemeToggle.module.css';

/** Switches to the next theme. The icon shows what a tap will switch to. */
export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const next = nextTheme(theme);

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => setTheme(next.id)}
      aria-label={`Switch to ${next.label.toLowerCase()} theme`}
      title={`${next.label} theme`}
    >
      <Icon name={next.id === 'dark' ? 'moon' : 'sun'} size={20} />
    </button>
  );
}
