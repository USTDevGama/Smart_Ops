import type { ReactNode } from 'react';
import { DotIcon, ErrorMarkIcon, WarningMarkIcon } from './Icon';

export type AlertKind = 'success' | 'info' | 'warning' | 'error';

/**
 * DESIGN_SPEC section 5.5: strong colour for the icon, subtle for the background, mid for the border, heading colour
 * for the text (warning-strong fails contrast as text). Status is icon + text + colour, never colour alone (section 7).
 */
const box: Record<AlertKind, string> = {
  success: 'border-success-mid bg-success-subtle',
  info: 'border-info-mid bg-info-subtle',
  warning: 'border-warning-mid bg-warning-subtle',
  error: 'border-error-mid bg-error-subtle',
};
const label: Record<AlertKind, string> = {
  success: 'Success',
  info: 'Information',
  warning: 'Warning',
  error: 'Error',
};

function Glyph({ kind }: { kind: AlertKind }) {
  if (kind === 'error') return <ErrorMarkIcon />;
  if (kind === 'warning') return <WarningMarkIcon />;
  return <DotIcon className={kind === 'success' ? 'text-success' : 'text-info'} />;
}

export default function Alert({
  kind = 'info',
  children,
  className = '',
}: {
  kind?: AlertKind;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-sm border p-3 text-sm text-heading ${box[kind]} ${className}`}
    >
      <span className="mt-1 inline-flex">
        <Glyph kind={kind} />
      </span>
      <span className="sr-only">{label[kind]}: </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
