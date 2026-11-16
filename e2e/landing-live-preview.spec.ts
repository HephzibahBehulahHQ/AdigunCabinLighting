import { expect, test } from '@playwright/test';

test('landing page loads the cabin GLB and runs its color, transition, and sound controls', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  const preview = page.getByTestId('landing-live-cabin');
  await expect(preview).toBeVisible();
  const canvas = preview.locator('canvas.cabin-webgl-canvas');
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(preview.getByText(/Gulfstream/i)).toBeVisible();

  const aurora = preview.getByRole('button', { name: 'Aurora lighting palette' });
  const sunset = preview.getByRole('button', { name: 'Sunset lighting palette' });
  await expect(aurora).toHaveAttribute('aria-pressed', 'true');
  await sunset.click();
  await expect(sunset).toHaveAttribute('aria-pressed', 'true');

  await preview.getByRole('button', { name: 'Play cabin light preview' }).click();
  await expect(preview.getByRole('button', { name: 'Pause cabin light preview' })).toBeVisible();
  await preview.getByRole('button', { name: 'Pause cabin light preview' }).click();
  await preview.getByRole('button', { name: 'Sound', exact: true }).click();
  await expect(preview.getByRole('button', { name: 'Sound on' })).toHaveAttribute('aria-pressed', 'true');

  await page.screenshot({ path: 'test-results/landing-live-3d-preview.png', fullPage: true });
});
