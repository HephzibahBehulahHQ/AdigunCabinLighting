import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Buffer } from 'node:buffer';
import { mkdir } from 'node:fs/promises';
import { PRESETS } from '../src/scene-engine';

test('landing opens the working Studio route', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Shape the cabin around the moment/i })).toBeVisible();
  const navigation = page.waitForNavigation();
  await page.getByRole('link', { name: 'Enter Cabin Studio' }).click();
  const response = await navigation;
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/studio\/?$/);
  await expect(page.getByText('SIMULATION ONLY')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cabin digital twin' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('zone RGBW edits persist and undo works', async ({ page }) => {
  await page.goto('/studio');
  const red = page.getByRole('spinbutton', { name: 'R percent' });
  await expect(red).toHaveValue('2');
  await page.getByRole('button', { name: 'Select Window surrounds' }).press('Enter');
  await page.getByRole('spinbutton', { name: 'R percent' }).fill('50');
  await page.getByRole('spinbutton', { name: 'R percent' }).press('Enter');
  await expect(page.getByRole('spinbutton', { name: 'R percent' })).toHaveValue('50');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('spinbutton', { name: 'R percent' })).not.toHaveValue('50');
  await page.getByRole('spinbutton', { name: 'R percent' }).fill('62');
  await page.getByRole('spinbutton', { name: 'R percent' }).press('Enter');
  await page.waitForTimeout(350);
  await page.reload();
  await page.getByRole('button', { name: 'Select Window surrounds' }).press('Enter');
  await expect(page.getByRole('spinbutton', { name: 'R percent' })).toHaveValue('62');
});

test('scene timeline scrubs and plays its actual transition', async ({ page }) => {
  await page.goto('/studio');
  const clock = page.locator('.time-readout');
  const timeline = page.getByRole('slider', { name: 'Scene timeline position' });
  await timeline.focus();
  await timeline.press('End');
  await expect(clock).toContainText('01:00');
  await page.getByRole('button', { name: 'Play preview' }).click();
  await expect(page.getByRole('button', { name: 'Pause preview' })).toBeVisible();
  await expect(clock).toHaveText(/00:0[1-9] \/ 01:00/, { timeout: 3000 });
});

test('manual setpoints follow the selected zone fade and can be committed', async ({ page }) => {
  await page.goto('/studio');
  const fade = page.locator('#fade');
  await fade.focus();
  await fade.press('Home');
  const red = page.getByRole('spinbutton', { name: 'R percent' });
  await red.fill('60');
  await red.press('Enter');
  const output = page.locator('.inspector-summary code');
  await expect(output).toHaveText('43 / 6 / 18 / 3');
  await page.getByRole('button', { name: /Apply & set keyframe/ }).click();
  await expect(page.getByRole('status')).toContainText('committed to Aurora at 00:00');
  await fade.press('End');
  await red.fill('0');
  await red.press('Enter');
  await expect(output).toHaveText('43 / 6 / 18 / 3');
  await expect(output).not.toHaveText('43 / 6 / 18 / 3', { timeout: 2500 });
});

test('scene file import is schema-validated and export downloads JSON', async ({ page }) => {
  await page.goto('/studio');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'boarding.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(PRESETS[0])),
  });
  await expect(page.getByRole('button', { name: /Boarding/ })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  expect((await download).suggestedFilename()).toBe('boarding.adigun-scene.json');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":9}'),
  });
  await expect(page.getByRole('status')).toContainText('Unsupported scene schema version');
});

test('Studio stays usable at a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Cabin digital twin' })).toBeVisible();
  await page.getByRole('button', { name: 'Zone mapping' }).click();
  await expect(page.getByRole('slider', { name: 'R channel' })).toBeVisible();
  const metrics = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, innerWidth: innerWidth, innerHeight: innerHeight }));
  expect(metrics.width).toBeLessThanOrEqual(metrics.innerWidth);
  expect(metrics.height).toBeLessThanOrEqual(metrics.innerHeight);
});

test('public routes have no WCAG 2.2 AA violations', async ({ page }) => {
  for (const route of ['/', '/studio']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((violation) => route + ': ' + violation.id + ' ' + violation.help)).toEqual([]);
  }
});

test('cabin map shapes respond to pointer selection', async ({ page }) => {
  await page.goto('/studio');
  await page.locator('.windows-zone path').nth(1).click();
  await expect(page.getByRole('heading', { name: 'Window surrounds' })).toBeVisible();
});

test('Studio fits one viewport with docked panels at all required desktop sizes', async ({ page }) => {
  const directory = 'artifacts/screenshots';
  await mkdir(directory, { recursive: true });
  await page.goto('/studio');
  for (const { width, height } of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: `${directory}/studio-${width}x${height}.png`, fullPage: false });
    const metrics = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      width: innerWidth,
      height: innerHeight,
      regions: ['.studio-topbar', '.sim-banner', '.studio-rail', '.studio-main', '.cabin-panel', '.inspector', '.studio-statusbar'].map((selector) => {
        const { x, y, width: w, height: h } = document.querySelector(selector)!.getBoundingClientRect();
        return { selector, x, y, right: x + w, bottom: y + h, width: w, height: h };
      }),
    }));
    expect(metrics.documentWidth, `${width}x${height} horizontal document overflow`).toBeLessThanOrEqual(width);
    expect(metrics.documentHeight, `${width}x${height} vertical document overflow`).toBeLessThanOrEqual(height);
    expect(metrics.regions.every((region) => region.x >= -1 && region.y >= -1 && region.right <= width + 1 && region.bottom <= height + 1), `${width}x${height} dock region outside viewport`).toBe(true);
    const [top, banner, rail, main, cabin, inspector, status] = metrics.regions;
    expect(top.bottom).toBeLessThanOrEqual(banner.y + 1);
    expect(banner.bottom).toBeLessThanOrEqual(main.y + 1);
    expect(rail.right).toBeLessThanOrEqual(main.x + 1);
    expect(cabin.right).toBeLessThanOrEqual(inspector.x + 1);
    expect(main.bottom).toBeLessThanOrEqual(status.y + 1);
    await expect(page.getByRole('button', { name: 'Zone mapping' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Apply & set keyframe/ })).toBeVisible();
    await expect(page.locator('.cabin-legend')).toBeVisible();
    const cabinFit = await page.evaluate(() => {
      const panel = document.querySelector('.cabin-panel')!.getBoundingClientRect();
      const legend = document.querySelector('.cabin-legend')!.getBoundingClientRect();
      const stage = document.querySelector('.cabin-stage')!.getBoundingClientRect();
      const zonesFit = [...document.querySelectorAll('.cabin-stage .cabin-zone')].every((zone) => {
        const rect = zone.getBoundingClientRect();
        return rect.left >= stage.left - 1 && rect.top >= stage.top - 1 && rect.right <= stage.right + 1 && rect.bottom <= stage.bottom + 1;
      });
      return { legendFits: legend.bottom <= panel.bottom + 1, zonesFit };
    });
    expect(cabinFit.legendFits, `${width}x${height} cabin legend clipped`).toBe(true);
    expect(cabinFit.zonesFit, `${width}x${height} cabin map zones clipped`).toBe(true);
  }
});

test('Studio menus open without moving the canvas and close with Escape', async ({ page }) => {
  await page.goto('/studio');
  const canvas = page.locator('#cabin-view');
  const before = await canvas.boundingBox();
  await page.getByRole('button', { name: 'More studio actions' }).click();
  await expect(page.getByRole('menuitem', { name: /Export current scene/ })).toBeVisible();
  expect(await canvas.boundingBox()).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: /Export current scene/ })).toBeHidden();
});

