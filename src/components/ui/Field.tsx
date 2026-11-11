import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon } from './Icon';
import styles from './Field.module.css';

type FieldShellProps = {
  label: string;
  helper?: string;
  error?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
};

function FieldShell({ label, helper, error, children }: FieldShellProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  const message = error ?? helper;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({ id, describedBy: message ? msgId : undefined, invalid: !!error })}
      {message && (
        <p id={msgId} className={error ? styles.error : styles.helper}>
          {error && <Icon name="error" />}
          {message}
        </p>
      )}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  helper?: string;
  error?: string;
};

export function Input({ label, helper, error, className, ...rest }: InputProps) {
  return (
    <FieldShell label={label} helper={helper} error={error}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`${styles.control} ${invalid ? styles.invalid : ''} ${className ?? ''}`}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string;
  helper?: string;
  error?: string;
};

export function Textarea({ label, helper, error, className, ...rest }: TextareaProps) {
  return (
    <FieldShell label={label} helper={helper} error={error}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`${styles.control} ${styles.textarea} ${invalid ? styles.invalid : ''} ${className ?? ''}`}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string;
  helper?: string;
  error?: string;
};

export function Select({ label, helper, error, className, children, ...rest }: SelectProps) {
  return (
    <FieldShell label={label} helper={helper} error={error}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`${styles.control} ${invalid ? styles.invalid : ''} ${className ?? ''}`}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}
