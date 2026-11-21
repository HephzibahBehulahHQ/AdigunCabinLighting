import { expect, test } from '@playwright/test';

test('landing page loads the cabin GLB and runs its color, transition, and sound controls', async ({ page }) => {
  test.setTimeout(120_000);
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

test('guided landing study downloads a working scenario and opens the same edits in Studio', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start the lighting challenge' }).click();
  await page.locator('#lighting-challenge input[type="range"]').nth(1).focus();
  await page.keyboard.press('End');
  await page.getByRole('button', { name: 'Compare original' }).click();
  await page.getByRole('button', { name: 'Show my edit' }).click();
  await page.getByText('Inspect a light source', { exact: true }).click();
  await page.getByLabel('Fixture group').selectOption('left_sidewall');
  await expect(page.getByRole('button', { name: 'Show combined lighting' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Show combined lighting' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Download scenario' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.locator('.hero-art-wrap').screenshot({ path: 'test-results/landing-lighting-challenge.png' });

  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download scenario' }).click();
  const download = await downloadReady;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const data = Buffer.concat(chunks);
  const { validateScenarioPackage } = await import('../operator/scenario-package');
  const scenario = validateScenarioPackage(JSON.parse(data.toString('utf8')));
  const targets = scenario.scenes[0].keyframes.at(-1)!.targets;
  expect(targets.left_sidewall.r).toBe(100);
  expect(scenario.physicalOutputEnabled).toBe(false);

  await page.getByRole('button', { name: 'Edit my scene in Studio' }).click();
  await expect(page.locator('.scene-card.selected')).toContainText('My cabin lighting study');
  await page.locator('#zone-picker').selectOption('left_sidewall');
  await expect(page.getByRole('spinbutton', { name: 'R percent' })).toHaveValue('100');
  const storedScene = await page.evaluate(() => {
    const id = localStorage.getItem('adigun-cabin-active-project:v1');
    return JSON.parse(localStorage.getItem(`adigun-cabin-studio:v1:${id}`)!).scenes[0];
  });
  expect(storedScene).toEqual(scenario.scenes[0]);

  await page.getByLabel('Import scenario package JSON').setInputFiles({
    name: download.suggestedFilename(), mimeType: 'application/json', buffer: data,
  });
  await expect(page.getByRole('status').filter({ hasText: 'imported as a new local project' })).toBeVisible();
});

test('the challenge and fixture inspection follow all four landing languages', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  for (const [locale, title, start, inspect, group, download] of [
    ['en', 'Design your first cabin scene', 'Start the lighting challenge', 'Inspect a light source', 'Fixture group', 'Download scenario'],
    ['de', 'Gestalte deine erste Kabinenszene', 'Lichtaufgabe starten', 'Eine Lichtquelle untersuchen', 'Leuchtengruppe', 'Szenario herunterladen'],
    ['yo', 'Ṣe scene àgọ́ àkọ́kọ́ rẹ', 'Bẹ̀rẹ̀ ìdánwò ìmọ́lẹ̀', 'Ṣàyẹ̀wò orísun ìmọ́lẹ̀', 'Ẹgbẹ́ fìtílà', 'Ṣe ìgbàsílẹ̀ scenario'],
    ['pcm', 'Design your first cabin scene', 'Start the lighting challenge', 'Check one light source', 'Fixture group', 'Download scenario'],
  ]) {
    await page.locator('.landing-locale').selectOption(locale);
    await page.reload();
    const challenge = page.locator('#lighting-challenge');
    await expect(challenge).toHaveAttribute('lang', locale);
    await expect(challenge.getByRole('heading', { name: title })).toBeVisible();
    await challenge.getByRole('button', { name: start }).click();
    await expect(challenge.getByRole('button', { name: download })).toBeVisible();
    await challenge.getByText(inspect, { exact: true }).click();
    await challenge.getByRole('combobox', { name: group }).selectOption('ceiling_cove');
    await expect(challenge.locator('button[aria-pressed="true"]')).toBeVisible();
  }
});
