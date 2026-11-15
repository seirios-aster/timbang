import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
  // The dialog reports every close, including the ones we cause by setting `open` to false. Those
  // are not the person closing it, so they must not call `onClose` again.
  const closedByProp = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      closedByProp.current = true;
      dialog.close();
    }
  }, [open]);

  // Drawn at the end of the page, outside whatever screen opened it. Otherwise a sheet opened from a
  // dark board or a paper slip would inherit that surface's colors, and could end up see-through.
  return createPortal(
    <dialog
      ref={ref}
      className={styles.sheet}
      onClose={() => {
        if (closedByProp.current) {
          closedByProp.current = false;
          return;
        }
        onClose();
      }}
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
    </dialog>,
    document.body,
  );
}
