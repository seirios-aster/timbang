import { useEffect } from 'react';

/**
 * Small wrappers around device features. Each one fails quietly, because
 * support varies between phones and browsers and none of them is essential.
 */

/** A short buzz and a beep, for when a rest timer runs out and the phone is not in hand. */
export function signalTimerDone() {
  try {
    navigator.vibrate?.([220, 120, 220]);
  } catch {
    // Not supported. The screen still shows the timer has ended.
  }

  try {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
    oscillator.onended = () => void context.close();
  } catch {
    // Sound is blocked or unavailable.
  }
}

/** Keeps the screen from sleeping while `active` is true, where the browser allows it. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = () => {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (cancelled) void sentinel.release();
          else lock = sentinel;
        })
        .catch(() => {
          // Denied, for example on low battery. The session works without it.
        });
    };

    // The lock is dropped whenever the page is hidden, so ask again when it comes back.
    const onVisible = () => document.visibilityState === 'visible' && request();
    request();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}
