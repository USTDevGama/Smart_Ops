// Shared report loading logic: stored-first flow for trainee self-view and admin view.
// Tries to load the stored (persisted/approved) report first. Only if the server says
// REPORT_NOT_FOUND does it run the agent once to generate a fresh report.

import { ApiError, REPORT_NOT_FOUND, type Agent4Api, type Summary } from './api';
import { summaryErrorText } from './reportView';

export type Result =
  | { kind: 'loading' }
  | { kind: 'error'; text: string; stage: 'stored' | 'live' }
  | { kind: 'ok'; summary: Summary };

function errorText(error: unknown): string {
  return error instanceof ApiError
    ? `${summaryErrorText(error.status)} (${error.message})`
    : 'The results could not be loaded.';
}

async function runLive(api: Agent4Api, traineeId: string): Promise<Result> {
  try {
    return { kind: 'ok', summary: await api.getSummary(traineeId) };
  } catch (error) {
    return { kind: 'error', text: errorText(error), stage: 'live' };
  }
}

/** Stored report first; the live run only when the server says no report is stored. */
export async function loadReportFlow(
  api: Agent4Api,
  traineeId: string,
  skipStored: boolean,
): Promise<Result> {
  if (skipStored) return runLive(api, traineeId);
  try {
    return { kind: 'ok', summary: await api.getStoredSummary(traineeId) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.code === REPORT_NOT_FOUND) {
      return runLive(api, traineeId);
    }
    return { kind: 'error', text: errorText(error), stage: 'stored' };
  }
}
