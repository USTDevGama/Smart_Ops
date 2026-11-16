import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth';
import { Agent4ApiProvider, ApiError, type Agent4Api, type Summary } from './api';
import { createMockApi } from './api/mockApi';
import { TraineeView } from './TraineeView';

const KEY = 'main-ui.dev-user';

function renderView(parts: Partial<Agent4Api>) {
  const api = { ...createMockApi(), ...parts } as Agent4Api;
  render(
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

async function resultFor(traineeId: string): Promise<Summary> {
  return { ...(await createMockApi().getSummary('T-06')), trainee_id: traineeId };
}

beforeEach(() => sessionStorage.clear());

describe('trainee view: live results', () => {
  it('says so when the account has no trainee ID', () => {
    signInAs();
    const getSummary = vi.fn();
    renderView({ getSummary });
    expect(screen.getByText(/has no trainee ID/)).toBeVisible();
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('calls /summary on open, not /approved-summary, and renders the result', async () => {
    signInAs('T-1001');
    const getSummary = vi.fn().mockResolvedValue(await resultFor('T-1001'));
    const getApprovedSummary = vi.fn();
    renderView({ getSummary, getApprovedSummary });
    expect(await screen.findByRole('heading', { name: 'Trainee T-1001' })).toBeVisible();
    expect(getSummary).toHaveBeenCalledTimes(1);
    expect(getSummary).toHaveBeenCalledWith('T-1001');
    expect(getApprovedSummary).not.toHaveBeenCalled();
  });

  it('shows the error with Try again, and Try again calls /summary again', async () => {
    signInAs('T-1001');
    const getSummary = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, 'checks failed'))
      .mockResolvedValue(await resultFor('T-1001'));
    const getApprovedSummary = vi.fn();
    renderView({ getSummary, getApprovedSummary });
    expect(await screen.findByRole('alert')).toHaveTextContent('checks failed');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(getSummary).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('heading', { name: 'Trainee T-1001' })).toBeVisible();
    expect(getApprovedSummary).not.toHaveBeenCalled();
  });

  it('missing optional report fields do not blank the screen', async () => {
    signInAs('T-1001');
    const full = await resultFor('T-1001');
    const partial = {
      ...full,
      report: undefined,
      recommendations: undefined,
    } as unknown as Summary;
    renderView({ getSummary: vi.fn().mockResolvedValue(partial) });
    expect(await screen.findByRole('heading', { name: 'Trainee T-1001' })).toBeVisible();
  });
});
