import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';
import { PRESETS } from '../src/scene-engine';

test('complete versioned scene survives local project save and reload', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/studio');

  const source = structuredClone(PRESETS[0]);
  source.id = 'scene-persistence-roundtrip';
  source.name = 'Persistence round trip';
  source.durationSeconds = 90;
  const middleTargets = structuredClone(source.keyframes[0].targets);
  middleTargets.ceiling = { r: 41, g: 22, b: 7, w: 19 };
  middleTargets.reading = { r: 3, g: 8, b: 14, w: 27 };
  source.keyframes = [
    { ...source.keyframes[0], atSeconds: 0 },
    { atSeconds: 37, targets: middleTargets },
    { ...source.keyframes[source.keyframes.length - 1], atSeconds: 90 },
  ];

  await page.locator('input[aria-label="Import versioned scene JSON"]').setInputFiles({
    name: 'persistence-roundtrip.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(source)),
  });
  await expect(page.getByRole('status')).toContainText('imported and validated');
  await expect(page.getByRole('button', { name: /Persistence round trip/ })).toBeVisible();

  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('status')).toContainText('saved locally');

  const saved = await page.evaluate((sceneId) => {
    const projectId = localStorage.getItem('adigun-cabin-active-project:v1');
    const key = projectId && projectId !== 'default'
      ? `adigun-cabin-studio:v1:${projectId}`
      : 'adigun-cabin-studio:v1';
    const project = JSON.parse(localStorage.getItem(key) ?? '{}');
    return project.scenes?.find((scene: { id: string }) => scene.id === sceneId);
  }, source.id);
  expect(saved).toEqual(source);

  await page.reload();
  await page.getByRole('button', { name: /Persistence round trip/ }).click();
  await page.getByRole('button', { name: 'More studio actions' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export scene JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`${source.id}.adigun-scene.json`);

  const stream = await download.createReadStream();
  if (!stream) throw new Error('The reloaded scene export stream is unavailable.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const roundTrip = JSON.parse(Buffer.concat(chunks).toString('utf8')) as typeof source;
  expect(roundTrip).toMatchObject({ schemaVersion: source.schemaVersion, id: source.id, name: source.name, durationSeconds: source.durationSeconds });
  expect(roundTrip.keyframes).toHaveLength(source.keyframes.length);
  source.keyframes.forEach((frame, index) => {
    expect(roundTrip.keyframes[index].atSeconds).toBe(frame.atSeconds);
    for (const [zoneId, rgbw] of Object.entries(frame.targets)) expect(roundTrip.keyframes[index].targets[zoneId]).toEqual(rgbw);
  });
  expect(Object.keys(roundTrip.keyframes[0].targets).some((zoneId) => zoneId.startsWith('fixture:gulfstream-g650er:'))).toBe(true);
});
