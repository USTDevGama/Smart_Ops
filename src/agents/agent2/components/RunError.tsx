import type { RunFailure } from '../util/apiError';
import Alert from './Alert';

/**
 * Why a run could not start, kept next to the input form until the person changes the input or tries again.
 * Shows the backend's main message, then every field-level problem as a list ("records[2].rating: Field required").
 */
export default function RunError({
  failure,
  className = '',
}: {
  failure: RunFailure;
  className?: string;
}) {
  const { message, details } = failure;
  return (
    <Alert kind="error" className={className}>
      <p className="font-medium">{message}</p>
      {details.length > 0 && (
        <>
          <p className="mt-2 text-xs text-body" id="run-error-fields">
            {details.length === 1 ? '1 problem to fix:' : `${details.length} problems to fix:`}
          </p>
          <ul
            aria-labelledby="run-error-fields"
            className="mt-1 max-h-56 list-disc space-y-1 overflow-y-auto pl-5"
          >
            {details.map((d, i) => (
              <li key={`${d.field}-${i}`} className="break-words">
                <code className="font-mono text-xs">{d.field}</code>: {d.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </Alert>
  );
}
