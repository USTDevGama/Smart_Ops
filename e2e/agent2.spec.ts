import { test, expect, type Page } from '@playwright/test';

// Agent 2 (Bias Flagging Agent) on mock data. Mock-only: remove with the mock parts before the demo
// (see src/agents/agent2/README.md).

async function signIn(page: Page, name: string, role: 'Trainee' | 'Admin') {
  await page.goto('/login');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Role').selectOption(role);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

test('home shows the card for both roles and opens agent2', async ({ page }) => {
  for (const role of ['Trainee', 'Admin'] as const) {
    await signIn(page, 'tester', role);
    await page.getByRole('button', { name: /Bias Flagging Agent/ }).click();
    await expect(page).toHaveURL(/\/agents\/agent2$/);
    await page.evaluate(() => sessionStorage.clear());
  }
});

test('trainee sees only the run page and can run and review', async ({ page }) => {
  await signIn(page, 'tester', 'Trainee');
  await page.getByRole('button', { name: /Bias Flagging Agent/ }).click();
  await expect(page.getByRole('heading', { name: 'Bias Flagging Agent', level: 1 })).toBeVisible();
  await expect(page.getByText('Running on mock data')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'New run' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'History' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Flag management' })).toHaveCount(0);
  await expect(page.getByLabel('Your name')).toHaveCount(0); // no sign-in inside the agent

  // unknown sub-route goes back to the run page
  await page.goto('/agents/agent2/admin/flags');
  await expect(page.getByRole('tab', { name: 'New run' })).toBeVisible();

  // use the sample file, run, review every finding, get the output
  await page.getByRole('button', { name: 'Use sample file' }).click();
  await page.getByRole('button', { name: 'Run agent' }).click();
  const output = page.getByLabel('Output JSON');
  await expect(async () => {
    // accept every item not yet decided (the number of review items depends on the run)
    const undecided = page
      .getByRole('group', { name: /^Decision for / })
      .getByRole('button', { name: 'Accept', pressed: false });
    if (await undecided.count()) {
      await undecided.first().click();
    }
    await expect(output).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 45_000 });

  // the output is human readable: one card per flag (description, trainee, source, explanation), then the raw JSON last
  const details = page.getByRole('region', { name: 'Output details' });
  await expect(details.getByRole('heading', { name: /^Detected flags \(\d+\)$/ })).toBeVisible();
  const card = details
    .locator('li', { has: page.getByText('Explanation', { exact: true }) })
    .first();
  await expect(card.getByText('Confidence', { exact: true })).toBeVisible();
  await expect(card.getByText('Description', { exact: true })).toBeVisible();
  await expect(card.getByText('Trainee', { exact: true })).toBeVisible();
  await expect(card.getByText('Source', { exact: true })).toBeVisible();
  await expect(card.getByText('Explanation', { exact: true })).toBeVisible();
  await expect(card.getByText('Not available')).toHaveCount(0); // the description was found in the flags list
  await expect(details.getByRole('heading', { name: 'Trainee goal scores' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Escalate' })).toHaveCount(0);
  await expect(details.getByRole('heading', { name: 'Raw JSON' })).toBeVisible();

  // History lists the runs
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'Flag management' })).toHaveCount(0);
  // each run is titled by its batch id, not by the uploaded file name
  await expect(page.getByText(/^Batch B-\d{4}$/).first()).toBeVisible();
  await expect(page.getByText('sample-input.json')).toHaveCount(0);
});

test('a rejected input keeps the main message and every field problem next to the form', async ({
  page,
}) => {
  await signIn(page, 'tester', 'Trainee');
  await page.getByRole('button', { name: /Bias Flagging Agent/ }).click();
  const bad = {
    records: [
      { id: 'FB-001', reviewer: 'R-01', trainee: 'T-01', rating: 2, comment: 'Fine record' },
      { id: 'FB-002', reviewer: 'R-01', trainee: 'T-01', rating: 2, comment: 'Fine record too' },
      { id: 'FB-003', reviewer: 'R-01', trainee: 'T-01', comment: 'Missing a rating' },
    ],
  };
  await page.getByTestId('file-input').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(bad)),
  });
  await page.getByRole('button', { name: 'Run agent' }).click();

  const alert = page.getByRole('alert').filter({ hasText: 'The input is not valid' });
  await expect(alert).toContainText('1 problem found');
  const items = alert.getByRole('listitem');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toHaveText('records[2].rating: Field required');

  // it stays until the input changes (not a toast that disappears)
  await page.waitForTimeout(5_500);
  await expect(alert).toBeVisible();
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(alert).toHaveCount(0);
});

test('plain text and the sample both pass the input check', async ({ page }) => {
  await signIn(page, 'tester', 'Trainee');
  await page.getByRole('button', { name: /Bias Flagging Agent/ }).click();
  await expect(page.getByText(/placeholders: reviewer “Unknown reviewer”/)).toBeVisible();

  // text with two paragraphs: the placeholders make each record valid, so the run starts
  await page
    .getByLabel('Text to check')
    .fill('First comment about delivery.\n\nSecond comment about tone.');
  await page.getByRole('button', { name: 'Run agent' }).click();
  await expect(page.getByText(/^Batch B-\d{4}$/)).toBeVisible();
  await expect(page.getByText('The input is not valid')).toHaveCount(0);
});

test('admin sees only flag management: add, deactivate, delete', async ({ page }) => {
  await signIn(page, 'tester', 'Admin');
  await page.getByRole('button', { name: /Bias Flagging Agent/ }).click();
  await expect(page.getByRole('heading', { name: 'Flag management' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'New run' })).toHaveCount(0);

  await page.goto('/agents/agent2/anything');
  await expect(page.getByRole('heading', { name: 'Flag management' })).toBeVisible();

  await page.getByRole('button', { name: '+ Add flag' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add flag' });
  await dialog.getByLabel('Name').fill('e2e-test-flag');
  await dialog.getByLabel(/Description/).fill('A flag created by the browser test.');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('e2e-test-flag', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Deactivate e2e-test-flag' }).click();
  await expect(page.getByRole('button', { name: 'Activate e2e-test-flag' })).toBeVisible();
  const row = page.getByRole('row', { name: /e2e-test-flag/ });
  await expect(row.getByText('Inactive')).toBeVisible();

  await row.getByRole('button', { name: 'Delete' }).click();
  await page
    .getByRole('dialog', { name: 'Delete flag?' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByText('e2e-test-flag', { exact: true })).toHaveCount(0);
});
