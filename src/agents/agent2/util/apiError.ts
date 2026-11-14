import { ApiError } from '../api/types';

export interface FieldError {
  /** Where the problem is, as the backend names it, e.g. "records[2].rating". */
  field: string;
  message: string;
}

/**
 * The valid `{ field, message }` entries of an API error's `details`. Anything else in there (other shapes, entries
 * missing a field or a message) is skipped rather than guessed at. The backend sends one entry per problem.
 */
export function fieldErrors(details: unknown): FieldError[] {
  if (!Array.isArray(details)) return [];
  const out: FieldError[] = [];
  for (const d of details) {
    const { field, message } = (d ?? {}) as { field?: unknown; message?: unknown };
    if (typeof field === 'string' && field.trim() && typeof message === 'string' && message.trim())
      out.push({ field: field.trim(), message: message.trim() });
  }
  return out;
}

export interface RunFailure {
  message: string;
  details: FieldError[];
}

/** Turn whatever a failed call threw into what the form shows: the main message plus any field-level problems. */
export function toRunFailure(e: unknown): RunFailure {
  if (e instanceof ApiError) return { message: e.message, details: fieldErrors(e.details) };
  return { message: e instanceof Error ? e.message : 'Something went wrong.', details: [] };
}
