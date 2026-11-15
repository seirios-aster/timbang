import { useSyncExternalStore } from 'react';

/**
 * Adding the app to the home screen.
 *
 * Android and desktop Chrome offer a real install prompt, which has to be saved
 * when the browser fires it. iPhones and iPads never fire it. There the person
 * adds the app themselves from the Share menu, so we show the steps instead.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let saved: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    saved = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    saved = null;
    installed = true;
    notify();
  });
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPads report as Macs, but a Mac has no touch screen.
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export type InstallState =
  | { kind: 'installed' }
  | { kind: 'prompt' }
  | { kind: 'ios'; inSafari: boolean }
  | { kind: 'none' };

function read(): string {
  if (installed || isStandalone()) return 'installed';
  if (saved) return 'prompt';
  if (isIos()) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent) ? 'ios-other' : 'ios-safari';
  return 'none';
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useInstall(): { state: InstallState; install: () => Promise<void> } {
  const value = useSyncExternalStore(subscribe, read, () => 'none');
  const state: InstallState =
    value === 'installed'
      ? { kind: 'installed' }
      : value === 'prompt'
        ? { kind: 'prompt' }
        : value === 'ios-safari'
          ? { kind: 'ios', inSafari: true }
          : value === 'ios-other'
            ? { kind: 'ios', inSafari: false }
            : { kind: 'none' };

  const install = async () => {
    if (!saved) return;
    await saved.prompt();
    await saved.userChoice;
    // A prompt can only be used once.
    saved = null;
    notify();
  };

  return { state, install };
}
