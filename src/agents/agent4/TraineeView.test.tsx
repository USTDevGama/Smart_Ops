import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth';
import { Agent4ApiProvider, ApiError, type Agent4Api } from './api';
import { TraineeView } from './TraineeView';

const KEY = 'main-ui.dev-user';

function fakeApi(getSummary: Agent4Api['getSummary']): Agent4Api {
  return { getSummary } as Agent4Api;
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
    const getSummary = vi.fn().mockRejectedValue(new ApiError(404, 'none'));
    renderView(fakeApi(getSummary));
    expect(await screen.findByText(/no results|not been assessed|no assessment/i)).toBeVisible();
    expect(getSummary).toHaveBeenCalledWith('T-1001');
    expect(screen.queryByLabelText('Trainee ID')).not.toBeInTheDocument();
  });

  it('says so when the account has no trainee ID', () => {
    signInAs();
    const getSummary = vi.fn();
    renderView(fakeApi(getSummary));
    expect(screen.getByText(/has no trainee ID/)).toBeVisible();
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('shows the server error and retries', async () => {
    signInAs('T-1001');
    const getSummary = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, 'busy'))
      .mockRejectedValueOnce(new ApiError(404, 'none'));
    renderView(fakeApi(getSummary));
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(getSummary).toHaveBeenCalledTimes(2);
  });
});
