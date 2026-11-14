import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'quiet';
  size?: 'md' | 'lg';
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'solid',
  size = 'md',
  block = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], block ? styles.block : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
