import { test, expect, type Page } from '@playwright/test';

// Agent 4 (skill-gap diagnostic) on mock data. T-01 has a partial result: Peer feedback and
// Roleplay are pending, G05 is "not covered" and G12 has no entry. T-06 is complete.

async function openResults(page: Page, traineeId: string) {
  await page.goto('/login');
  await page.getByLabel('Your name').fill('tester');
  await page.getByLabel('Role').selectOption('Trainee');
  await page.getByLabel('Trainee ID').fill(traineeId);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('link', { name: /Adaptive Skill-Gap Diagnostic Agent/ }).click();
}

for (const [label, size] of [
  ['desktop', { width: 1280, height: 900 }],
  ['compact', { width: 390, height: 800 }],
] as const) {
  test(`partial result with not covered and not available goals (${label})`, async ({ page }) => {
    await page.setViewportSize(size);
    await openResults(page, 'T-01');

    await expect(page.getByRole('heading', { name: 'Trainee T-01' })).toBeVisible();
    await expect(
      page.getByText(
        'Showing the results received so far. Still waiting for Peer feedback and Roleplay.',
      ),
    ).toBeVisible();

    const scores = page.locator('div[aria-label="Scores by goal"]');
    const g05 = scores.locator('div', { hasText: /^G05 Testing own work/ }).first();
    await expect(g05).toBeVisible();
    await expect(scores.getByText('Not covered', { exact: true })).toBeVisible();
    await expect(scores.getByText('Not available', { exact: true })).toBeVisible();

    // The label is fully inside the page: no horizontal scroll, text not clipped.
    const noScore = scores.getByText('Not available', { exact: true });
    const box = await noScore.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(size.width);

    // Source tags: T-01 only has interview data.
    await expect(scores.getByText('Interview').first()).toBeVisible();
    await expect(scores.getByText('Roleplay')).toHaveCount(0);
  });
}

test('a complete result shows no pending note and the Peer feedback and Roleplay tags', async ({
  page,
}) => {
  await openResults(page, 'T-06');
  await expect(page.getByRole('heading', { name: 'Trainee T-06' })).toBeVisible();
  await expect(page.getByText(/Showing the results received so far/)).toHaveCount(0);
  const scores = page.locator('div[aria-label="Scores by goal"]');
  await expect(scores.getByText('Roleplay').first()).toBeVisible();
  await expect(scores.getByText('Peer feedback').first()).toBeVisible();
});

test('an unknown trainee gets the no-results message', async ({ page }) => {
  await openResults(page, 'T-77');
  await expect(page.getByText('No results yet for this trainee.')).toBeVisible();
});
