import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth';
import { Agent4ApiProvider, ApiError, type Agent4Api } from './api';
import { createMockApi } from './api/mockApi';
import { TraineeView } from './TraineeView';

const KEY = 'main-ui.dev-user';

function fakeApi(getApprovedSummary: Agent4Api['getApprovedSummary']): Agent4Api {
  return { getApprovedSummary } as Agent4Api;
}

function renderView(api: Agent4Api) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Agent4ApiProvider api={api}>
          <TraineeView />
        </Agent4ApiProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function signInAs(traineeId?: string) {
  sessionStorage.setItem(KEY, JSON.stringify({ name: 'anna', role: 'trainee', traineeId }));
}

beforeEach(() => sessionStorage.clear());

describe('trainee view', () => {
  it('asks for the signed-in trainee, with no ID box', async () => {
    signInAs('T-1001');
    const getApprovedSummary = vi.fn().mockRejectedValue(new ApiError(404, 'none'));
    renderView(fakeApi(getApprovedSummary));
    expect(await screen.findByText(/no results|not been assessed|no assessment/i)).toBeVisible();
    expect(getApprovedSummary).toHaveBeenCalledWith('T-1001');
    expect(screen.queryByLabelText('Trainee ID')).not.toBeInTheDocument();
  });

  it('says so when the account has no trainee ID', () => {
    signInAs();
    const getApprovedSummary = vi.fn();
    renderView(fakeApi(getApprovedSummary));
    expect(screen.getByText(/has no trainee ID/)).toBeVisible();
    expect(getApprovedSummary).not.toHaveBeenCalled();
  });

  it('shows the server error and retries', async () => {
    signInAs('T-1001');
    const getApprovedSummary = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, 'busy'))
      .mockRejectedValueOnce(new ApiError(404, 'none'));
    renderView(fakeApi(getApprovedSummary));
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(getApprovedSummary).toHaveBeenCalledTimes(2);
  });
});

describe('trainee view: approved report', () => {
  it('shows the approved report from getApprovedSummary, not getSummary', async () => {
    signInAs('T-06');
    const mock = createMockApi();
    await mock.submitReview('run-0006', {
      decision: 'approve',
      reviewer_ref: 'R-01',
      comment: null,
    });
    const getSummary = vi.fn();
    const api = { ...mock, getSummary } as Agent4Api;
    renderView(api);
    expect(await screen.findByRole('heading', { name: 'Trainee T-06' })).toBeVisible();
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('shows the empty message, not an error, when there is no approved report yet', async () => {
    signInAs('T-01'); // in the mock, T-01 is still pending review
    renderView(createMockApi());
    expect(await screen.findByText('No results yet for this trainee.')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
