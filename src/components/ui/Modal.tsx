import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Modal.module.css';

type Props = {
  open: boolean;
  title: string;
  /** Called on Escape, backdrop click or when the dialog closes for any reason. Parent sets `open` to false. */
  onClose: () => void;
  children: ReactNode;
  /** Buttons, right-aligned. */
  footer?: ReactNode;
};

/**
 * Modal dialog on the native <dialog> element: focus is trapped inside, Escape closes it, and the
 * page behind is inert. The title is the accessible name.
 */
export function Modal({ open, title, onClose, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={styles.dialog}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dialog itself (not its content) is a click on the backdrop.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.body}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </dialog>
  );
}
