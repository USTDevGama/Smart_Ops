import styles from './FilePicker.module.css';

type Props = {
  /** Accessible name of the file input, e.g. "Resume file". */
  label: string;
  /** Button text shown on the picker. */
  buttonText?: string;
  accept?: string;
  /** The currently chosen file, if any. */
  file: File | null;
  onFile: (file: File | null) => void;
};

/**
 * Styled file chooser. The native input is visually hidden but stays focusable, so keyboard
 * users can Tab to the button and press Space or Enter to open the file dialog.
 */
export function FilePicker({ label, buttonText = 'Choose file', accept, file, onFile }: Props) {
  return (
    <div className={styles.wrap}>
      <label className={styles.button}>
        <input
          type="file"
          aria-label={label}
          accept={accept}
          className={styles.input}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {buttonText}
      </label>
      <span className={file ? styles.name : styles.empty} aria-live="polite">
        {file ? file.name : 'No file chosen'}
      </span>
    </div>
  );
}
