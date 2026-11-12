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
    const groups = page.getByRole('group', { name: /^Decision for / });
    if (await groups.count()) {
      await groups.first().getByRole('button', { name: 'Accept' }).click();
    }
    await expect(output).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 45_000 });

  // the output is human readable: flag cards (sources, review, trainee), then the raw JSON last
  const details = page.getByRole('region', { name: 'Output details' });
  await expect(details.getByRole('heading', { name: /^Detected flags \(\d+\)$/ })).toBeVisible();
  const card = details.locator('li', { has: page.getByText('Sources', { exact: true }) }).first();
  await expect(card.getByText('Confidence', { exact: true })).toBeVisible();
  await expect(card.getByText('Trainee', { exact: true })).toBeVisible();
  await expect(card.getByText('Review', { exact: true })).toBeVisible();
  await expect(details.getByRole('heading', { name: 'Trainee goal scores' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Escalate' })).toHaveCount(0);
  await expect(details.getByRole('heading', { name: 'Raw JSON' })).toBeVisible();

  // History lists the runs
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'Flag management' })).toHaveCount(0);
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
