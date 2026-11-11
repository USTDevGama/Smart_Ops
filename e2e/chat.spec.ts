import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, name: string, role: 'Trainee' | 'Admin') {
  await page.goto('/login');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Role').selectOption(role);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

test('trainee: upload resume, start chat, send answer, end chat', async ({ page }) => {
  await signIn(page, 'anna', 'Trainee');
  await page.getByRole('button', { name: /Stakeholder Roleplay/ }).click();
  await expect(page.getByText('Running on mock data')).toBeVisible();

  // Resume upload (mock extraction takes about 2 seconds)
  await expect(page.getByText('No file chosen')).toBeVisible();
  await page.getByLabel('Resume file').setInputFiles({
    name: 'cv.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Five years in delivery management.'),
  });
  await expect(page.getByText('cv.txt')).toBeVisible();
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByText('Uploaded. We are reading it now.')).toBeVisible();
  await expect(page.getByText('Ready', { exact: true }).first()).toBeVisible({ timeout: 10_000 });

  // Start the chat
  await page.getByRole('link', { name: 'Chat with the client' }).click();
  const start = page.getByRole('button', { name: 'Start the chat' });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByRole('heading', { name: /Chat with verma-strict/ })).toBeVisible();
  await expect(page.getByText(/I am Ms\. Verma/)).toBeVisible();
  await expect(page.getByText(/Your messages:/)).toContainText('0 of 6');

  // Send an answer (the mock treats 60+ characters as a good answer)
  const answer =
    'We are sorry the vendor delivery was late. The recovery plan is confirmed for Friday with an owner.';
  await page.getByLabel('Your answer').fill(answer);
  await page.getByLabel('Your answer').press('Enter'); // Enter sends
  await expect(page.getByText(/Your messages:/)).toContainText('1 of 6', { timeout: 5_000 });
  await expect(page.getByText(answer, { exact: true })).toBeVisible();
  await expect(page.getByText('This message was not saved')).toHaveCount(0);

  // End the chat (asks for confirmation first; "Keep chatting" backs out)
  await page.getByRole('button', { name: 'End the chat' }).click();
  const dialog = page.getByRole('dialog', { name: 'End this chat?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep chatting' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'End the chat' }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'End the chat' }).click();
  await dialog.getByRole('button', { name: 'End chat', exact: true }).click();
  await expect(page.getByText('You ended the chat.')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Back to the start' })).toBeVisible();
  await expect(page.getByLabel('Your answer')).toHaveCount(0);
});

test('admin sees only admin pages', async ({ page }) => {
  await signIn(page, 'boss', 'Admin');
  await page.getByRole('button', { name: /Stakeholder Roleplay/ }).click();
  await expect(page.getByRole('link', { name: 'Set the stage' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'My resume' })).toHaveCount(0);
});
