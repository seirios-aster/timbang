import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Small line above the title. */
  eyebrow?: string;
  children: ReactNode;
}

/**
 * A panel that slides up from the bottom on phones and sits centered on wide screens.
 * Built on the native dialog element, which handles focus and the Escape key.
 */
export function Sheet({ open, onClose, title, eyebrow, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className={styles.panel}>
          <header className={styles.header}>
            <div className={styles.heading}>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <h2 className={`display ${styles.title}`}>{title}</h2>
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </button>
          </header>
          <div className={styles.content}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
