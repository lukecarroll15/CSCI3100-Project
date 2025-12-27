import { test, expect } from '@playwright/test';

test('smoke: signup, activate admin, create team, navigate', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto('/login');

  await page.getByRole('button', { name: /sign up/i }).click();

  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByRole('button', { name: /send sign-up code/i }).click();

  await page.getByPlaceholder('123456').fill('000000');
  await page.getByRole('button', { name: /create account/i }).click();

  await expect(page.getByText(/tasks due today/i)).toBeVisible();

  await page.getByPlaceholder('Enter Admin Key').fill('TEST-KEYS-0000');
  await page.getByRole('button', { name: /activate/i }).click();

  await expect(page.getByText(/finish team setup/i)).toBeVisible();
  await page.getByPlaceholder('e.g. Product Design').fill('Alpha Team');
  await page.getByRole('button', { name: /create team/i }).click();

  await page.getByRole('link', { name: /calendar/i }).click();
  await expect(page.getByRole('button', { name: /add task/i })).toBeVisible();

  await page.getByRole('link', { name: /files/i }).click();
  await expect(page.getByText(/all files/i)).toBeVisible();

  await page.getByRole('link', { name: /canvas/i }).click();
  await expect(page.getByText(/canvas/i)).toBeVisible();
});
