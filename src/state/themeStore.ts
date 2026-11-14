import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage, storageKey } from './storage';

/**
 * Available themes. Each id matches a `[data-theme]` block in src/styles/tokens.css,
 * except the first, which is the default look defined on `:root`.
 * `chrome` is the color phones use for the browser bar around the page.
 */
export const THEMES = [
  { id: 'light', label: 'Light', chrome: '#e4e8f0' },
  { id: 'dark', label: 'Dark', chrome: '#0a0f24' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

const DEFAULT_THEME: ThemeId = 'light';

interface ThemeState {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: storageKey('theme'),
      storage: appStorage<Pick<ThemeState, 'theme'>>(),
      partialize: ({ theme }) => ({ theme }),
    },
  ),
);

/** The theme after the given one, wrapping around. With two themes this is a simple toggle. */
export function nextTheme(current: ThemeId): (typeof THEMES)[number] {
  const index = THEMES.findIndex((theme) => theme.id === current);
  return THEMES[(index + 1) % THEMES.length]!;
}

/** Puts the theme on the page. Call once at startup and again whenever it changes. */
export function applyTheme(id: ThemeId) {
  const theme = THEMES.find((candidate) => candidate.id === id) ?? THEMES[0];
  document.documentElement.dataset.theme = theme.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.chrome);
}
