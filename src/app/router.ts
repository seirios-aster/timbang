import { useCallback, useSyncExternalStore } from 'react';

/**
 * A tiny hash router. Each screen is a plain `#name`, which works on any static
 * host and keeps the back button and shareable links working.
 */
export const ROUTES = ['target', 'meals', 'progress', 'start'] as const;
export type Route = (typeof ROUTES)[number];

const DEFAULT_ROUTE: Route = 'target';

function readRoute(): Route {
  const name = window.location.hash.replace(/^#/, '');
  return (ROUTES as readonly string[]).includes(name) ? (name as Route) : DEFAULT_ROUTE;
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): [Route, (route: Route) => void] {
  const route = useSyncExternalStore(subscribe, readRoute, () => DEFAULT_ROUTE);
  const go = useCallback((next: Route) => {
    window.location.hash = next;
    window.scrollTo({ top: 0 });
  }, []);
  return [route, go];
}
