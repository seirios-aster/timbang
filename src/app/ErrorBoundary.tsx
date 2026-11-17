import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/**
 * If a screen crashes, show a way out instead of a blank page. The person's saved data is untouched,
 * so reloading, or going back to the start, is safe.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Nothing is sent anywhere. This only leaves a trace in the browser's console for whoever is debugging.
    console.error('Screen crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className={styles.page} role="alert">
        <p className="eyebrow">Something went wrong</p>
        <h1 className={`display ${styles.title}`}>That screen broke</h1>
        <p className={styles.text}>Your saved data is safe. Reloading usually fixes it. If it happens again, the details are in the browser console.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => window.location.reload()}>
            Reload
          </button>
          <a className={styles.link} href="#today" onClick={() => window.setTimeout(() => window.location.reload(), 0)}>
            Go to Today
          </a>
        </div>
      </main>
    );
  }
}
