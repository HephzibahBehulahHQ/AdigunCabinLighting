import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { makeDefaultZones, PRESETS } from '../src/scene-engine';

const fixtureGroups = [
  ['windows', 'window-daylight', [60, 78, 100, 46]],
  ['left_sidewall', 'left-sidewall', [18, 76, 100, 12]],
  ['right_sidewall', 'right-sidewall', [100, 28, 68, 12]],
  ['handrail', 'handrail-bin-edge', [18, 92, 65, 12]],
  ['ceiling_cove', 'central-ceiling-recess', [58, 30, 100, 24]],
  ['monuments', 'service-monuments', [100, 74, 42, 62]],
  ['footwell', 'footwell-guidance', [10, 72, 86, 42]],
] as const;

test('model-tied cabin fixture groups and combined moods render in the existing Studio', async ({ page }) => {
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Cabin digital twin' })).toBeVisible();
  const previewDir = 'artifacts/lighting-fixtures';
  await mkdir(previewDir, { recursive: true });

  // Re-seed local browser state between renders. This isolates one RGBW group
  // without driving dozens of per-channel UI events or changing the product UI.
  await page.waitForTimeout(500);
  const { baseline, storageKey } = await page.evaluate(() => {
    const projectId = localStorage.getItem('adigun-cabin-active-project:v1') ?? 'default';
    const storageKey = projectId === 'default' ? 'adigun-cabin-studio:v1' : `adigun-cabin-studio:v1:${projectId}`;
    return { baseline: JSON.parse(localStorage.getItem(storageKey) ?? '{}'), storageKey };
  });
  expect(baseline.zones).toHaveLength(17);

  for (const [zoneId, file, values] of fixtureGroups) {
    const isolated = structuredClone(baseline) as typeof baseline;
    isolated.selectedZoneId = zoneId;
    isolated.zones = isolated.zones.map((zone: { id: string; rgbw: Record<string, number> }) => ({
      ...zone,
      rgbw: Object.fromEntries(Object.keys(zone.rgbw).map((channel) => [channel, 0])),
    }));
    const target = isolated.zones.find((zone: { id: string }) => zone.id === zoneId);
    expect(target, `missing fixture group ${zoneId}`).toBeTruthy();
    target.rgbw = { r: values[0], g: values[1], b: values[2], w: values[3] };
    await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: storageKey, state: isolated });
    // Keep the bootstrap tab open so its pagehide persistence cannot overwrite the isolated preview state.
    const previewPage = await page.context().newPage();
    await previewPage.setViewportSize({ width: 1600, height: 1000 });
    await previewPage.goto('/studio');
    await expect(previewPage.getByRole('heading', { name: 'Cabin digital twin' })).toBeVisible();
    const canvas = previewPage.locator('canvas.cabin-webgl-canvas');
    await expect(canvas).toHaveAttribute('data-cabin-profile', 'gulfstream-g650er');
    await expect.poll(async () => canvas.getAttribute('data-simulated-fixture-counts'), { timeout: 30_000 }).not.toBeNull();
    await previewPage.screenshot({ path: `${previewDir}/${file}.png`, fullPage: true });
    await previewPage.close();
  }

  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: storageKey, state: baseline });
  const previewPage = await page.context().newPage();
  await previewPage.setViewportSize({ width: 1600, height: 1000 });
  await previewPage.goto('/studio');
  await expect(previewPage.getByRole('heading', { name: 'Cabin digital twin' })).toBeVisible();
  const canvas = previewPage.locator('canvas.cabin-webgl-canvas');
  await expect.poll(async () => canvas.getAttribute('data-simulated-fixture-counts'), { timeout: 30_000 }).not.toBeNull();
  const counts = await canvas.evaluate((element) => JSON.parse(element.dataset.simulatedFixtureCounts ?? '{}') as Record<string, number | string>);
  expect(counts.windows).toBe(16);
  expect(await canvas.getAttribute('data-visible-windows')).toBe('16');
  expect(await canvas.getAttribute('data-excluded-window-glass-count')).toBe('20');
  expect(counts.leftSidewall).toBe(8);
  expect(counts.rightSidewall).toBe(8);
  expect(counts.cove).toBe(2);
  expect(counts.reading).toBe(0);
  expect(counts.handrail).toBeGreaterThan(0);
  expect(counts.monuments).toBeGreaterThan(0);
  expect(counts.spotlights).toBe(0);
  expect(counts.ceilingPanels).toBeUndefined();
  expect(counts.emergency).toBe(0);
  expect(counts.exit).toBe(0);
  expect(counts.placementBasis).toBe('vip-side-console-mesh-bounds');

  const music = previewPage.getByRole('button', { name: 'Mood music' });
  if (await music.getAttribute('aria-pressed') === 'true') await music.click();
  for (const mood of ['Aurora', 'Sunrise', 'Sunset']) {
    await previewPage.locator('.scene-card').filter({ hasText: mood }).click();
    await expect(previewPage.locator('.scene-card.selected')).toContainText(mood);
    if (mood === 'Aurora') {
      await previewPage.getByRole('button', { name: 'Play preview' }).click();
      await previewPage.waitForTimeout(1600);
    }
    await previewPage.screenshot({ path: `${previewDir}/mood-${mood.toLowerCase()}.png`, fullPage: true });
  }

  await previewPage.getByLabel('3D camera angle').selectOption('mid-cabin');
  await previewPage.locator('#cabin-view').screenshot({ path: `${previewDir}/camera-mid-cabin.png` });
  await canvas.hover();
  await previewPage.mouse.wheel(0, -160);
  await previewPage.mouse.move(730, 360); await previewPage.mouse.down(); await previewPage.mouse.move(780, 390, { steps: 4 }); await previewPage.mouse.up();
  await previewPage.locator('#cabin-view').screenshot({ path: `${previewDir}/camera-orbit-zoom.png` });
});

test('G650 inspector omits reading and spotlight zones without modeled fixtures', async ({ page }) => {
  test.setTimeout(60_000);
  const zones = makeDefaultZones().map((zone) => ({
    ...zone,
    rgbw: zone.id === 'monuments' ? { r: 100, g: 86, b: 64, w: 76 } : { r: 0, g: 0, b: 0, w: 0 },
  }));
  const state = {
    zones, scenes: PRESETS, intensity: 72, activeSceneId: 'aurora', selectedZoneId: 'monuments',
    projectName: 'Cabin 01', aircraftMeshId: 'gulfstream-g650er',
  };
  await page.addInitScript((saved) => {
    localStorage.setItem('adigun-cabin-studio:v1', JSON.stringify(saved));
    localStorage.removeItem('adigun-cabin-active-project:v1');
  }, state);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Cabin digital twin' })).toBeVisible();
  const canvas = page.locator('canvas.cabin-webgl-canvas');
  await expect(canvas).toHaveAttribute('data-cabin-profile', 'gulfstream-g650er');
  await expect.poll(async () => canvas.getAttribute('data-simulated-fixture-counts'), { timeout: 30_000 }).not.toBeNull();
  await expect(page.locator('#zone-picker option[value="reading"]')).toHaveCount(0);
  await expect(page.locator('#zone-picker option[value="spotlights"]')).toHaveCount(0);
  const counts = await canvas.evaluate((element) => JSON.parse(element.dataset.simulatedFixtureCounts ?? '{}') as Record<string, number>);
  expect(counts.reading).toBe(0);
  expect(counts.spotlights).toBe(0);
  await page.getByLabel('3D camera angle').selectOption('aft');
  await mkdir('artifacts/lighting-fixtures', { recursive: true });
  await page.locator('#cabin-view').screenshot({ path: 'artifacts/lighting-fixtures/spotlights-focused-final.png' });
});

test('window daylight uses passive tinted glazing and a separate source', async ({ page }) => {
  test.setTimeout(60_000);
  const zones = makeDefaultZones().map((zone) => ({
    ...zone,
    rgbw: zone.id === 'windows' ? { r: 60, g: 78, b: 100, w: 46 } : { r: 0, g: 0, b: 0, w: 0 },
  }));
  const state = {
    zones, scenes: PRESETS, intensity: 72, activeSceneId: 'aurora', selectedZoneId: 'windows',
    projectName: 'Cabin 01', aircraftMeshId: 'gulfstream-g650er',
  };
  await page.addInitScript((saved) => {
    localStorage.setItem('adigun-cabin-studio:v1', JSON.stringify(saved));
    localStorage.removeItem('adigun-cabin-active-project:v1');
  }, state);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio');
  const canvas = page.locator('canvas.cabin-webgl-canvas');
  await expect(page.getByRole('heading', { name: 'Cabin digital twin' })).toBeVisible();
  await expect.poll(async () => canvas.getAttribute('data-simulated-fixture-counts'), { timeout: 30_000 }).not.toBeNull();
  const counts = await canvas.evaluate((element) => JSON.parse(element.dataset.simulatedFixtureCounts ?? '{}') as Record<string, number>);
  expect(counts.windows).toBe(16);
  expect(await canvas.getAttribute('data-visible-windows')).toBe('16');
  expect(await canvas.getAttribute('data-excluded-window-glass-count')).toBe('20');
  await mkdir('artifacts/lighting-fixtures', { recursive: true });
  await page.locator('#cabin-view').screenshot({ path: 'artifacts/lighting-fixtures/window-daylight-reviewed.png' });
});


