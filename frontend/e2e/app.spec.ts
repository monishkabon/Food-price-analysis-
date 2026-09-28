import { test, expect } from '@playwright/test';

test('primary forecast journey reaches scenario comparison', async ({ page }) => {
  await page.goto('/overview');
  await expect(page.getByRole('heading', { name: /good morning/i })).toBeVisible();
  await page.getByRole('link', { name: /create forecast/i }).click();
  await page.getByRole('button', { name: /generate forecast/i }).click();
  await expect(page.getByText('Predicted price')).toBeVisible();
  await page.getByRole('link', { name: /compare scenarios/i }).click();
  await page.getByRole('spinbutton', { name: /Fuel price/ }).fill('340');
  await expect(page.getByText('Estimated price impact')).toBeVisible();
});

test('mobile navigation opens and changes route', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/overview');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Market Explorer' }).click();
  await expect(page.getByRole('heading', { name: 'Market Explorer' })).toBeVisible();
});
