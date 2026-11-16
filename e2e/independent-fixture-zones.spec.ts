import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { makeDefaultZones, PRESETS } from '../src/scene-engine';

test('GLB locator fixtures remain cabin-specific, individually selectable, and independently editable', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript((state) => {
    localStorage.setItem('adigun-cabin-studio:v1', JSON.stringify(state));
    localStorage.removeItem('adigun-cabin-active-project:v1');
  }, {
    zones: makeDefaultZones(), scenes: PRESETS, intensity: 72, activeSceneId: 'aurora', selectedZoneId: 'ceiling',
    projectName: 'Cabin 01', aircraftMeshId: 'gulfstream-g650er',
  });
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Cabin digital twin' })).toBeVisible();
  const canvas = page.locator('canvas.cabin-webgl-canvas');
  await expect(canvas).toHaveAttribute('data-cabin-profile', 'gulfstream-g650er');
  await expect.poll(async () => canvas.getAttribute('data-fixture-source-positions'), { timeout: 30_000 }).not.toBeNull();

  const sourceOptions = page.locator('#zone-picker option[value^="fixture:gulfstream-g650er:left_sidewall:"]');
  await expect(sourceOptions).toHaveCount(9); // Eight authored locator anchors plus the actual strip mesh.
  await expect(page.locator('#zone-picker option[value="reading"]')).toHaveCount(0);
  await expect(page.locator('#zone-picker option[value="toilet"]')).toHaveCount(0);

  const sourcePoints = await canvas.evaluate((element) => JSON.parse(element.dataset.fixtureSourcePositions ?? '[]') as { id: string; x: number; y: number; depth: number; visibleInFrustum: boolean }[]);
  const leftPoint = sourcePoints.find((point) => point.id.includes(':left_sidewall:left-sidewall-fixture-1:') && point.visibleInFrustum && point.x > .04 && point.x < .96 && point.y > .04 && point.y < .96);
  expect(leftPoint, 'a left authored anchor projects into the active cabin view').toBeTruthy();
  const canvasBounds = await canvas.boundingBox();
  expect(canvasBounds).not.toBeNull();
  await page.mouse.dblclick(canvasBounds!.x + leftPoint!.x * canvasBounds!.width, canvasBounds!.y + leftPoint!.y * canvasBounds!.height);
  await expect(page.locator('#zone-picker')).toHaveValue(leftPoint!.id);

  const leftId = leftPoint!.id;
  await page.getByRole('spinbutton', { name: 'R percent' }).fill('100');
  await expect(page.getByRole('spinbutton', { name: 'R percent' })).toHaveValue('100');
  const secondId = await sourceOptions.evaluateAll((options, selected) => options.map((option) => (option as HTMLOptionElement).value).find((id) => id !== selected), leftId);
  expect(secondId).toBeTruthy();
  await page.locator('#zone-picker').selectOption(secondId!);
  await page.getByRole('spinbutton', { name: 'R percent' }).fill('0');
  await page.getByRole('spinbutton', { name: 'B percent' }).fill('100');
  await expect(page.getByRole('spinbutton', { name: 'B percent' })).toHaveValue('100');
  await page.locator('#zone-picker').selectOption(leftId);
  await expect(page.getByRole('spinbutton', { name: 'R percent' })).toHaveValue('100');
  await page.locator('#zone-picker').selectOption(secondId!);
  await expect(page.getByRole('spinbutton', { name: 'B percent' })).toHaveValue('100');
  await page.getByRole('button', { name: 'Save project' }).click();

  await expect.poll(async () => page.evaluate(({ a, b }) => {
    const saved = JSON.parse(localStorage.getItem('adigun-cabin-studio:v1') ?? '{}');
    return [saved.zones.find((zone: { id: string }) => zone.id === a)?.rgbw, saved.zones.find((zone: { id: string }) => zone.id === b)?.rgbw];
  }, { a: leftId, b: secondId! })).toEqual([
    expect.objectContaining({ r: 100 }),
    expect.objectContaining({ r: 0, b: 100 }),
  ]);

  await mkdir('artifacts/lighting-fixtures', { recursive: true });
  await page.screenshot({ path: 'artifacts/lighting-fixtures/independent-sidewall-sources.png', fullPage: true });
});
