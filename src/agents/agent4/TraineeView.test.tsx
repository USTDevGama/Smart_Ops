import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth';
import { Agent4ApiProvider, ApiError, REPORT_NOT_FOUND, type Agent4Api, type Summary } from './api';
import { normalizeSummary } from './api/httpApi';
import { createMockApi } from './api/mockApi';
import { buildReportPdf } from './reportPdf';
import { TraineeView } from './TraineeView';

const KEY = 'main-ui.dev-user';

function renderView(parts: Partial<Agent4Api>, strict = false) {
  const api = { ...createMockApi(), ...parts } as Agent4Api;
  const tree = (
    <MemoryRouter>
      <AuthProvider>
        <Agent4ApiProvider api={api}>
          <TraineeView />
        </Agent4ApiProvider>
      </AuthProvider>
    </MemoryRouter>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

const notFound = () => new ApiError(404, 'No stored report.', REPORT_NOT_FOUND);

// Captures what the download tries to save, without opening a real save dialog.
function stubDownload() {
  const clicked: string[] = [];
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this.download);
  });
  return { clicked };
}

function signInAs(traineeId?: string) {
  sessionStorage.setItem(KEY, JSON.stringify({ name: 'anna', role: 'trainee', traineeId }));
}

async function resultFor(traineeId: string): Promise<Summary> {
  return { ...(await createMockApi().getSummary('T-06')), trainee_id: traineeId };
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('trainee view: stored report first', () => {
  it('says so when the account has no trainee ID', () => {
    signInAs();
    const getStoredSummary = vi.fn();
    renderView({ getStoredSummary });
    expect(screen.getByText(/has no trainee ID/)).toBeVisible();
    expect(getStoredSummary).not.toHaveBeenCalled();
  });

  it('shows a stored report and does not call /summary', async () => {
    signInAs('T-1001');
    const getStoredSummary = vi.fn().mockResolvedValue(await resultFor('T-1001'));
    const getSummary = vi.fn();
    renderView({ getStoredSummary, getSummary });
    expect(await screen.findByRole('heading', { name: 'Trainee T-1001' })).toBeVisible();
    expect(getStoredSummary).toHaveBeenCalledTimes(1);
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('runs /summary exactly once on REPORT_NOT_FOUND and shows the fresh result', async () => {
    signInAs('T-1001');
    const getStoredSummary = vi.fn().mockRejectedValue(notFound());
    const getSummary = vi.fn().mockResolvedValue(await resultFor('T-1001'));
    renderView({ getStoredSummary, getSummary });
    expect(await screen.findByRole('heading', { name: 'Trainee T-1001' })).toBeVisible();
    expect(getSummary).toHaveBeenCalledTimes(1);
  });

  it('a real stored-summary error is shown and /summary is not called', async () => {
    signInAs('T-1001');
    const getStoredSummary = vi.fn().mockRejectedValue(new ApiError(500, 'database down'));
    const getSummary = vi.fn();
    renderView({ getStoredSummary, getSummary });
    expect(await screen.findByRole('alert')).toHaveTextContent('database down');
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('a 404 without the REPORT_NOT_FOUND code is an error, not "no result"', async () => {
    signInAs('T-1001');
    const getStoredSummary = vi.fn().mockRejectedValue(new ApiError(404, 'Not Found'));
    const getSummary = vi.fn();
    renderView({ getStoredSummary, getSummary });
    expect(await screen.findByRole('alert')).toHaveTextContent('Not Found');
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('shows a /summary failure with Try again, and Try again calls /summary again', async () => {
    signInAs('T-1001');
    const getStoredSummary = vi.fn().mockRejectedValue(notFound());
    const getSummary = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, 'checks failed'))
      .mockResolvedValue(await resultFor('T-1001'));
    renderView({ getStoredSummary, getSummary });
    expect(await screen.findByRole('alert')).toHaveTextContent('checks failed');
    expect(screen.queryByRole('heading', { name: 'Trainee T-1001' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(getSummary).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('heading', { name: 'Trainee T-1001' })).toBeVisible();
    expect(getStoredSummary).toHaveBeenCalledTimes(1);
  });

  it('React Strict Mode does not create duplicate live runs', async () => {
    signInAs('T-1001');
    const getStoredSummary = vi.fn().mockRejectedValue(notFound());
    const getSummary = vi.fn().mockResolvedValue(await resultFor('T-1001'));
    renderView({ getStoredSummary, getSummary }, true);
    expect(await screen.findByRole('heading', { name: 'Trainee T-1001' })).toBeVisible();
    expect(getStoredSummary).toHaveBeenCalledTimes(1);
    expect(getSummary).toHaveBeenCalledTimes(1);
  });

  it('missing historical overview and optional fields do not crash the page', async () => {
    signInAs('T-1001');
    const partial = normalizeSummary({
      run_id: 'run-old',
      trainee_id: 'T-1001',
      status: 'approved',
      gap_threshold: 2,
      assessed_count: 0,
      goal_count: 12,
    });
    renderView({ getStoredSummary: vi.fn().mockResolvedValue(partial) });
    expect(await screen.findByRole('heading', { name: 'Trainee T-1001' })).toBeVisible();
    expect(screen.getByText('No overview is saved with this report.')).toBeVisible();
  });
});

describe('trainee view: download', () => {
  async function downloadFrom(source: 'stored' | 'fresh') {
    signInAs('T-1001');
    const shown = await resultFor('T-1001');
    const getSummary = vi.fn().mockResolvedValue(shown);
    const getStoredSummary = vi.fn();
    if (source === 'stored') getStoredSummary.mockResolvedValue(shown);
    else getStoredSummary.mockRejectedValue(notFound());
    const downloadReport = vi.fn().mockResolvedValue(new Blob(['pdf']));
    const files = stubDownload();
    renderView({ getStoredSummary, getSummary, downloadReport });
    await screen.findByRole('heading', { name: 'Trainee T-1001' });
    const summaryCalls = getSummary.mock.calls.length;
    const storedCalls = getStoredSummary.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Download report' }));
    await waitFor(() => expect(files.clicked).toHaveLength(1));
    return {
      shown,
      getSummary,
      getStoredSummary,
      downloadReport,
      files,
      summaryCalls,
      storedCalls,
    };
  }

  it.each(['stored', 'fresh'] as const)(
    'downloads the displayed %s report without a new run',
    async (source) => {
      const r = await downloadFrom(source);
      expect(r.downloadReport).toHaveBeenCalledTimes(1);
      expect(r.downloadReport).toHaveBeenCalledWith(r.shown);
      expect(r.files.clicked[0]).toBe(`ASGD_T-1001_${r.shown.run_id}.pdf`);
      // The click made no further read or run.
      expect(r.getSummary).toHaveBeenCalledTimes(r.summaryCalls);
      expect(r.getStoredSummary).toHaveBeenCalledTimes(r.storedCalls);
    },
  );

  it('shows a visible error when the download fails', async () => {
    signInAs('T-1001');
    const files = stubDownload();
    renderView({
      getStoredSummary: vi.fn().mockResolvedValue(await resultFor('T-1001')),
      downloadReport: vi.fn().mockRejectedValue(new ApiError(503, 'x')),
    });
    await screen.findByRole('heading', { name: 'Trainee T-1001' });
    await userEvent.click(screen.getByRole('button', { name: 'Download report' }));
    expect(await screen.findByText(/PDF engine/)).toBeVisible();
    expect(files.clicked).toHaveLength(0);
  });

  it('builds a PDF from a report with no overview and no optional lists', () => {
    const bare = normalizeSummary({ run_id: 'r1', trainee_id: 'T-1', status: 'approved' });
    expect(() => buildReportPdf(bare)).not.toThrow();
    expect(buildReportPdf(bare).size).toBeGreaterThan(0);
  });
});
