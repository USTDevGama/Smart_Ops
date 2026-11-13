// Checks the real HTTP client against the contract in the backend handoff: the paths, the body of
// the PDF request, and the error statuses. The network is replaced by a stub, so this runs offline.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api';
import { createHttpApi } from './httpApi';
import type { Summary } from './types';

const SUMMARY: Summary = {
  run_id: '5936cacf-0000-0000-0000-000000000000',
  status: 'pending_review',
  trainee_id: 'SYN-02',
  overview: 'Plain text overview from the agent.',
  assessed_count: 11,
  goal_count: 12,
  gap_threshold: 2,
  scores: [
    { goal: 'G08', label: 'Handling client pressure', score: 2, sources: ['C_scores.G08=2'] },
  ],
  gaps: [
    {
      goal: 'G08',
      label: 'Handling client pressure',
      score: 2,
      evidence: ['C_scores.G08=2'],
      outcome_match: 'partial',
      exercises: [{ id: 'EX-08', title: 'Client pushback practice', minutes: 40 }],
      outcomes: [{ id: 'O11', wording: 'Balancing technical execution.', match: 'partial' }],
      why: 'Plain text reason.',
    },
  ],
  strong: [{ goal: 'G11', label: 'Teamwork', score: 5 }],
  not_assessed: [{ goal: 'G12', label: 'Independent learning' }],
  review_required: true,
  versions: { rules: '0.1.0', mapping: '0.2.0', content_library: 'builtin:sha256:x' },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const api = createHttpApi(() => ({}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('summary', () => {
  it('calls the summary path through the proxy and returns the body as sent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SUMMARY));
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.getSummary('SYN-02');

    expect(fetchMock.mock.calls[0][0]).toBe('/agent4-api/v1/trainees/SYN-02/summary');
    expect(result.overview).toBe('Plain text overview from the agent.');
    expect(result.gaps[0].why).toBe('Plain text reason.');
  });

  it('turns a 409 into an ApiError with the status kept', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ detail: 'section missing' }, 409)),
    );
    await expect(api.getSummary('SYN-02')).rejects.toMatchObject({
      status: 409,
    });
    await expect(api.getSummary('SYN-02')).rejects.toBeInstanceOf(ApiError);
  });
});
