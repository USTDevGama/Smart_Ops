import { test, expect, type Page } from '@playwright/test';

/**
 * Agent 3 against the REAL Smart_Ops_Pod3 API (fake LLM, SQLite, demo data).
 * Start the backend first (docs/agent3-api-and-mocks.md). These tests skip when it is not running.
 * Tests run in order: the admin review checks the chat the trainee test created.
 */
test.describe.configure({ mode: 'serial' });

const API = 'http://localhost:8000';
const run = Date.now().toString(36);
const trainee = `e2e-${run}`;

test.beforeAll(async ({ request }) => {
  const res = await request.get(`${API}/api/v1/meta`).catch(() => null);
  test.skip(
    !res?.ok(),
    'The Pod3 backend is not running on :8000. See docs/agent3-api-and-mocks.md.',
  );
});

async function signIn(page: Page, name: string, role: 'Trainee' | 'Admin') {
  await page.goto('/login');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Role').selectOption(role);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('link', { name: /Stakeholder Roleplay/ }).click();
  await expect(page.getByText('Running on mock data')).toHaveCount(0); // proves the real API is used
}

test('trainee: resume, chat and end against the real API', async ({ page }) => {
  await signIn(page, trainee, 'Trainee');

  // Resume goes queued -> extracting -> ready on the server
  await page.getByLabel('Resume file').setInputFiles({
    name: 'cv.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Five years in delivery management. Led a vendor recovery programme.'),
  });
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByText('Ready', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  // Uploading the same file again is recognised by the server (HTTP 200, "reused")
  await page.getByLabel('Resume file').setInputFiles({
    name: 'cv.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Five years in delivery management. Led a vendor recovery programme.'),
  });
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByText(/uploaded this file before/)).toBeVisible();

  // Start a chat: the client speaks first
  await page.getByRole('link', { name: 'Chat with the client' }).click();
  const start = page.getByRole('button', { name: 'Start the chat' });
  await expect(start).toBeEnabled({ timeout: 10_000 });
  // Pick the demo character explicitly: other tests (and earlier runs) publish more of them.
  await page.getByLabel('Client', { exact: true }).selectOption('verma-strict');
  await start.click();
  await expect(page.getByRole('heading', { name: /Chat with verma-strict/ })).toBeVisible();
  const bubbles = page.getByRole('list', { name: 'Chat transcript' }).getByRole('listitem');
  await expect(bubbles).toHaveCount(1);
  await expect(page.getByText(/Your messages:/)).toContainText(/0 of \d+/);

  // Send an answer with Enter: the trainee message and the client's reply are both saved
  const answer =
    'I should have told you sooner. The recovery plan is confirmed for Friday and I own it.';
  await page.getByLabel('Your answer').fill(answer);
  await page.getByLabel('Your answer').press('Enter');
  await expect(page.getByText(/Your messages:/)).toContainText(/1 of \d+/, { timeout: 15_000 });
  await expect(bubbles).toHaveCount(3);
  await expect(page.getByText(answer, { exact: true })).toBeVisible();
  await expect(page.getByText('This message was not saved')).toHaveCount(0);

  // End the chat from the modal
  await page.getByRole('button', { name: 'End the chat' }).click();
  await page
    .getByRole('dialog', { name: 'End this chat?' })
    .getByRole('button', { name: 'End chat', exact: true })
    .click();
  await expect(page.getByText('You ended the chat.')).toHaveCount(1); // shown once, not twice
  const report = page.getByRole('region', { name: 'Report' });
  await expect(report).toBeVisible();
  // The backend runs on its fake model here, so no report can be made. The panel says so once,
  // in plain words for a trainee, without the raw server error or a server setting name.
  await expect(report.getByText('The report cannot be prepared right now')).toBeVisible();
  await expect(report.getByText(/PODC_LLM_PROVIDER/)).toHaveCount(0);
  await expect(report.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to the start' })).toBeVisible();

  // The chat now shows up in "Your earlier chats"
  await page.getByRole('button', { name: 'Back to the start' }).click();
  await expect(page.getByRole('combobox', { name: 'Earlier chat' })).toContainText('verma-strict');
});

test('admin: sees the setup data and reviews the trainee chat', async ({ page }) => {
  await signIn(page, `admin-${run}`, 'Admin');
  await expect(page.getByRole('link', { name: 'My resume' })).toHaveCount(0);

  // Set the stage: character card, situations, demand document come from the server
  await expect(page.getByText('verma-strict').first()).toBeVisible();
  await page.getByRole('tab', { name: /Situations/ }).click();
  await expect(page.getByRole('cell', { name: 'vendor-delay' })).toBeVisible();
  await page.getByRole('tab', { name: /Demand document/ }).click();
  await expect(page.getByText('project_demand.txt')).toBeVisible();
  await expect(page.getByText('In use')).toBeVisible();

  // Review chats: find the trainee's chat and open it
  await page.getByRole('link', { name: 'Review chats' }).click();
  await page.getByLabel('Trainee name').fill(trainee);
  const row = page.getByRole('row', { name: new RegExp(trainee) });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Open' }).click();
  await expect(
    page.getByRole('heading', { name: new RegExp(`${trainee} with verma-strict`) }),
  ).toBeVisible();
  await expect(page.getByText('Score notes (admin only)').first()).toBeVisible();
});

test('admin: creates and publishes a character card', async ({ page }) => {
  const key = `e2e-${run}`;
  await signIn(page, `admin-${run}`, 'Admin');
  await page.getByText('New character card').click();
  await page.getByLabel('Key', { exact: true }).fill(key);
  await page.getByRole('button', { name: 'Save as version 1 (draft)' }).click();
  await expect(page.getByText(`Saved "${key}" as version 1 (draft).`)).toBeVisible();

  await page.getByRole('button', { name: 'Publish this version' }).click();
  await expect(page.getByText('v1 is published.')).toBeVisible();

  // A published version never changes: start v2 from it, edit the draft, save, publish
  const card = page
    .locator('details')
    .filter({ hasText: key })
    .filter({
      has: page.getByRole('button', { name: 'Start a new version from the latest' }),
    });
  await card.getByRole('button', { name: 'Start a new version from the latest' }).click();
  await expect(page.getByText('Started v2 as a draft.')).toBeVisible();
  await card.getByLabel('Name', { exact: true }).fill('Ms. Verma (edited)');
  await card.getByRole('button', { name: 'Save the draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  await card.getByRole('button', { name: 'Publish this version' }).click();
  await expect(page.getByText('v2 is published.')).toBeVisible();

  // v1 is now retired and read-only
  await card.getByLabel('Version').selectOption({ label: 'v1 · retired' });
  await expect(card.getByText('A retired version never changes.')).toBeVisible();
});

test('admin: loads situations and manages demand documents', async ({ page }) => {
  await signIn(page, `admin-${run}`, 'Admin');

  await page.getByRole('tab', { name: /Situations/ }).click();
  await page.getByRole('button', { name: 'Load the situations' }).click();
  await expect(page.getByText(/\d+ new, \d+ updated, \d+ unchanged\./)).toBeVisible();

  await page.getByRole('tab', { name: /Demand document/ }).click();
  const name = `demand-${run}.txt`;
  await page.getByLabel('Demand document', { exact: true }).setInputFiles({
    name,
    mimeType: 'text/plain',
    buffer: Buffer.from(`Deliver the recovery plan within a week. Run ${run}.`),
  });
  await page.getByRole('button', { name: 'Upload the demand document' }).click();
  const mine = page.locator('details').filter({ hasText: name });
  await expect(mine).toBeVisible();
  await expect(mine.getByText('Ready', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('In use')).toHaveCount(1); // the newest ready document

  // A document that chats use cannot be deleted: the server says no and the UI shows why
  const used = page.locator('details').filter({ hasText: 'project_demand.txt' });
  await used.locator('summary').click();
  await used.getByRole('button', { name: 'Delete' }).click();
  await expect(used.getByRole('alert')).toBeVisible();

  // A document nothing uses can be deleted
  await mine.locator('summary').click();
  await mine.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});
