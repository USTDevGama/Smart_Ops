import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth';
import { Agent4ApiProvider, ApiError, type Agent4Api, type TraineeRow } from './api';
import { createMockApi } from './api/mockApi';
import { TraineeView } from './TraineeView';

const KEY = 'main-ui.dev-user';

// Every call is a spy. A call the test does not expect fails loudly instead of returning nothing.
function fakeApi(parts: Partial<Agent4Api>): Agent4Api {
  const unexpected = (name: string) => vi.fn().mockRejectedValue(new Error(`unexpected ${name}`));
  return {
    getApprovedSummary: unexpected('getApprovedSummary'),
    getSummary: unexpected('getSummary'),
    listTrainees: unexpected('listTrainees'),
    assess: unexpected('assess'),
    ...parts,
  } as Agent4Api;
}

const notApproved = () => vi.fn().mockRejectedValue(new ApiError(404, 'No approved report yet'));
const rows = (status: TraineeRow['status']) =>
  vi.fn().mockResolvedValue([{ trainee_id: 'T-1001', status, last_run_at: null }]);

function renderView(api: Agent4Api, strict = false) {
  const tree = (
    <MemoryRouter>
      <AuthProvider>
        <Agent4ApiProvider api={api}>
          <TraineeView />
        </Agent4ApiProvider>
      </AuthProvider>
    </MemoryRouter>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

function signInAs(traineeId?: string) {
  sessionStorage.setItem(KEY, JSON.stringify({ name: 'anna', role: 'trainee', traineeId }));
}

async function resultFor(traineeId: string) {
  return { ...(await createMockApi().getSummary('T-06')), trainee_id: traineeId };
}

beforeEach(() => sessionStorage.clear());

describe('trainee view', () => {
  it('says so when the account has no trainee ID', () => {
    signInAs();
    const getApprovedSummary = vi.fn();
    renderView(fakeApi({ getApprovedSummary }));
    expect(screen.getByText(/has no trainee ID/)).toBeVisible();
    expect(getApprovedSummary).not.toHaveBeenCalled();
  });

  it('shows the server error and retries', async () => {
    signInAs('T-1001');
    const getApprovedSummary = vi.fn().mockRejectedValue(new ApiError(503, 'busy'));
    renderView(fakeApi({ getApprovedSummary }));
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(getApprovedSummary).toHaveBeenCalledTimes(2));
  });
});

describe('trainee view: running the agent', () => {
  it('A: an existing approved report is shown and the agent is not run', async () => {
    signInAs('T-06');
    const mock = createMockApi();
    await mock.submitReview('run-0006', {
      decision: 'approve',
      reviewer_ref: 'R-01',
      comment: null,
    });
    const getSummary = vi.fn();
    const assess = vi.fn();
    renderView({ ...mock, getSummary, assess } as Agent4Api);
    expect(await screen.findByRole('heading', { name: 'Trainee T-06' })).toBeVisible();
    expect(getSummary).not.toHaveBeenCalled();
    expect(assess).not.toHaveBeenCalled();
  });

  it('B: a trainee with no run is assessed once and the result is shown', async () => {
    signInAs('T-1001');
    const getSummary = vi.fn().mockResolvedValue(await resultFor('T-1001'));
    renderView(
      fakeApi({ getApprovedSummary: notApproved(), listTrainees: rows(null), getSummary }),
    );
    expect(await screen.findByRole('heading', { name: 'Trainee T-1001' })).toBeVisible();
    expect(screen.queryByText(/No results yet/)).not.toBeInTheDocument();
    expect(getSummary).toHaveBeenCalledTimes(1);
    expect(getSummary).toHaveBeenCalledWith('T-1001');
  });

  it('B: runs the agent once even when React runs the effect twice', async () => {
    signInAs('T-1001');
    const getSummary = vi.fn().mockResolvedValue(await resultFor('T-1001'));
    renderView(
      fakeApi({ getApprovedSummary: notApproved(), listTrainees: rows(null), getSummary }),
      true,
    );
    expect(await screen.findByRole('heading', { name: 'Trainee T-1001' })).toBeVisible();
    expect(getSummary).toHaveBeenCalledTimes(1);
  });

  it('C: a failed agent run shows the failure, not "no results"', async () => {
    signInAs('T-1001');
    renderView(
      fakeApi({
        getApprovedSummary: notApproved(),
        listTrainees: rows(null),
        getSummary: vi.fn().mockRejectedValue(new ApiError(503, 'checks failed')),
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again.');
    expect(screen.queryByText(/No results yet/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  it.each(['failed', 'pending_review', 'running', 'rejected'] as const)(
    'a previous %s run is not re-run on its own',
    async (status) => {
      signInAs('T-1001');
      const getSummary = vi.fn();
      renderView(
        fakeApi({ getApprovedSummary: notApproved(), listTrainees: rows(status), getSummary }),
      );
      await waitFor(() => expect(screen.queryByLabelText('Loading results')).toBeNull());
      expect(getSummary).not.toHaveBeenCalled();
    },
  );

  it('C: a previous failed run is shown as a failure', async () => {
    signInAs('T-1001');
    renderView(
      fakeApi({
        getApprovedSummary: notApproved(),
        listTrainees: rows('failed'),
        getSummary: vi.fn(),
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/run failed/);
  });

  it('D: a trainee who is not in the trainee database gets a not-found message', async () => {
    signInAs('T-9999');
    const getSummary = vi.fn();
    renderView(
      fakeApi({ getApprovedSummary: notApproved(), listTrainees: rows(null), getSummary }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('a trainee with no scores sees that the scores are missing', async () => {
    signInAs('T-1001');
    renderView(
      fakeApi({
        getApprovedSummary: notApproved(),
        listTrainees: rows(null),
        getSummary: vi.fn().mockRejectedValue(new ApiError(404, 'No results yet for this trainee')),
      }),
    );
    expect(await screen.findByText(/scores have not been recorded/)).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('a run waiting for review shows the waiting message', async () => {
    signInAs('T-1001');
    renderView(
      fakeApi({
        getApprovedSummary: notApproved(),
        listTrainees: rows('pending_review'),
        getSummary: vi.fn(),
      }),
    );
    expect(await screen.findByText(/waiting for review/)).toBeVisible();
  });

  it('the mock: a run still pending review shows the waiting message, not an error', async () => {
    signInAs('T-01');
    renderView(createMockApi());
    expect(await screen.findByText(/waiting for review/)).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
