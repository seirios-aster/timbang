import type { ReactNode } from 'react';
import styles from './Stamp.module.css';

interface StampProps {
  tone?: 'ink' | 'green' | 'red' | 'blue';
  children: ReactNode;
}

/** A rubber-stamp label, like "PAID" on a receipt. Used for short status words. */
export function Stamp({ tone = 'ink', children }: StampProps) {
  return <span className={`${styles.stamp} ${styles[tone]}`}>{children}</span>;
}
