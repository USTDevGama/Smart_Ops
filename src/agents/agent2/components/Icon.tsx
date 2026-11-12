import errorMark from '../assets/icons/IconErrorMark12.svg';
import warningMark from '../assets/icons/IconWarningMark12.svg';

/**
 * Icons from the design kit (DESIGN_SPEC.md §6). Pixel-designed at 12px: render at exactly that size.
 * `clear` inherits the text colour. The status marks keep their fixed fills.
 */
export function ClearIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M8.30756 9.15625L6.00092 6.84961L3.69427 9.15625C3.6385 9.21249 3.57208 9.25665 3.49896 9.28711C3.42585 9.31757 3.3477 9.33398 3.26849 9.33398C3.18929 9.33398 3.11114 9.31757 3.03802 9.28711C2.96491 9.25665 2.89849 9.21249 2.84271 9.15625C2.73096 9.04383 2.66693 8.89093 2.66693 8.73242C2.66693 8.57391 2.73096 8.42296 2.84271 8.31055L5.15131 6L2.84271 3.68945C2.78648 3.63368 2.74036 3.56726 2.7099 3.49414C2.67944 3.42103 2.66498 3.34288 2.66498 3.26367C2.66498 3.18446 2.67944 3.10632 2.7099 3.0332C2.74036 2.96009 2.78648 2.89367 2.84271 2.83789C2.95513 2.72614 3.10608 2.66406 3.26459 2.66406C3.4231 2.66406 3.576 2.72614 3.68842 2.83789L6.00092 5.15039L8.31342 2.83984C8.42583 2.72809 8.57873 2.66406 8.73724 2.66406C8.89576 2.66406 9.0467 2.72809 9.15912 2.83984C9.21536 2.89562 9.26147 2.96204 9.29193 3.03516C9.32239 3.10827 9.33685 3.18642 9.33685 3.26562C9.33685 3.34483 9.32239 3.42298 9.29193 3.49609C9.26147 3.56921 9.21536 3.63563 9.15912 3.69141L6.85052 6L9.15912 8.31055C9.27131 8.42353 9.33546 8.57711 9.3349 8.73633C9.33434 8.89555 9.27015 9.04797 9.15717 9.16016C9.04418 9.27234 8.8906 9.33455 8.73138 9.33398C8.57217 9.33342 8.41974 9.26923 8.30756 9.15625Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ErrorMarkIcon() {
  return (
    <img src={errorMark} width={12} height={12} alt="" aria-hidden="true" className="shrink-0" />
  );
}

export function WarningMarkIcon() {
  return (
    <img src={warningMark} width={12} height={12} alt="" aria-hidden="true" className="shrink-0" />
  );
}

/** No success or info icons were supplied (spec §9). A 12px circle in the status colour stands in until they are. */
export function DotIcon({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3 w-3 shrink-0 rounded-full bg-current ${className}`}
    />
  );
}
