import type { ReactNode } from 'react';
import { BRAND } from '@/config/brand';
import { DAYS, fmtShortDate, todayIndex, todayIso } from '@/lib/date';
import { Icon, type IconName } from '@/ui/Icon';
import { ThemeToggle } from '@/ui/ThemeToggle';
import styles from './AppShell.module.css';
import type { Route } from './router';

const TABS: { route: Route; label: string; icon: IconName }[] = [
  { route: 'today', label: 'Today', icon: 'today' },
  { route: 'meals', label: 'Meals', icon: 'resibo' },
  { route: 'training', label: 'Training', icon: 'dumbbell' },
  { route: 'progress', label: 'Progress', icon: 'trend' },
];

interface AppShellProps {
  route: Route;
  children: ReactNode;
}

/** Page frame: brand header, the current screen, and the tab bar (a side rail on wide screens). */
export function AppShell({ route, children }: AppShellProps) {
  const today = `${DAYS[todayIndex()]?.short} · ${fmtShortDate(todayIso())}`;

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Main">
        <a className={styles.brand} href="#today">
          {BRAND.name}
        </a>
        <ul className={styles.tabs}>
          {TABS.map((tab) => (
            <li key={tab.route}>
              <a
                className={styles.tab}
                href={`#${tab.route}`}
                aria-current={tab.route === route ? 'page' : undefined}
              >
                <Icon name={tab.icon} />
                <span>{tab.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className={styles.navNote}>{BRAND.tagline}</p>
      </nav>

      <div className={styles.column}>
        <header className={styles.header}>
          <a className={styles.wordmark} href="#today">
            {BRAND.name}
          </a>
          <div className={styles.headerEnd}>
            <span className={`mono ${styles.date}`}>{today}</span>
            <a
              className={styles.targetLink}
              href="#target"
              aria-label="Your target and settings"
              aria-current={route === 'target' ? 'page' : undefined}
              title="Target and settings"
            >
              <Icon name="dial" size={20} />
            </a>
            <ThemeToggle />
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
