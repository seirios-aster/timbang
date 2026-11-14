import type { ReactNode } from 'react';
import { BRAND } from '@/config/brand';
import { DAYS, fmtShortDate, todayIndex, todayIso } from '@/lib/date';
import { Icon, type IconName } from '@/ui/Icon';
import styles from './AppShell.module.css';
import type { Route } from './router';

const TABS: { route: Route; label: string; icon: IconName }[] = [
  { route: 'target', label: 'Target', icon: 'dial' },
  { route: 'meals', label: 'Meals', icon: 'resibo' },
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
        <a className={styles.brand} href="#target">
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
          <a className={styles.wordmark} href="#target">
            {BRAND.name}
          </a>
          <span className={`mono ${styles.date}`}>{today}</span>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
