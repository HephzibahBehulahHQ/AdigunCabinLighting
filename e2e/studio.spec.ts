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
  await expect(page.getByText('SIM · OFFLINE')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cabin digital twin' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('zone RGBW edits persist and undo works', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/studio');
  const red = page.getByRole('spinbutton', { name: 'R percent' });
  await expect(red).toHaveValue('2');
  await page.locator('#zone-picker').selectOption('windows');
  await page.getByRole('spinbutton', { name: 'R percent' }).fill('50');
  await page.getByRole('spinbutton', { name: 'R percent' }).press('Enter');
  await expect(page.getByRole('spinbutton', { name: 'R percent' })).toHaveValue('50');
  await page.getByRole('button', { name: 'More studio actions' }).click();
  await page.getByRole('menuitem', { name: 'Undo' }).click();
  await expect(page.getByRole('spinbutton', { name: 'R percent' })).not.toHaveValue('50');
  await page.getByRole('spinbutton', { name: 'R percent' }).fill('62');
  await page.getByRole('spinbutton', { name: 'R percent' }).press('Enter');
  await page.waitForTimeout(350);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#zone-picker').selectOption('windows');
  await expect(page.getByRole('spinbutton', { name: 'R percent' })).toHaveValue('62');
});

test('scene timeline scrubs and plays its actual transition', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/studio');
  const clock = page.locator('.time-readout');
  const timeline = page.getByRole('slider', { name: 'Scene timeline position' });
  await timeline.focus();
  await timeline.press('End');
  await expect(clock).toContainText('01:00');
  await page.getByRole('button', { name: 'Play preview' }).click();
  await expect(page.getByRole('button', { name: 'Pause preview' })).toBeVisible();
  await expect.poll(async () => Number(await timeline.inputValue()), { timeout: 15_000 }).toBeGreaterThan(0);
});

test('manual setpoints follow the selected zone fade and can be committed', async ({ page }) => {
  await page.goto('/studio');
  const fade = page.locator('#fade');
  await fade.focus();
  await fade.press('Home');
  await expect(fade).toHaveValue('0');
  const red = page.getByRole('spinbutton', { name: 'R percent' });
  await red.fill('60');
  await red.press('Enter');
  const output = page.locator('.inspector-summary code');
  await expect(output).toHaveText('43 / 6 / 18 / 3');
  await page.getByRole('button', { name: /Apply & set keyframe/ }).click();
  await expect(page.getByRole('status')).toContainText('committed to Aurora at 00:00');
  await fade.press('Home');
  await fade.press('ArrowRight');
  await fade.press('ArrowRight');
  await fade.press('ArrowRight');
  await expect(fade).toHaveValue('3');
  const beforeFade = Number((await output.innerText()).split(' / ')[0]);
  await red.fill('0');
  await red.press('Enter');
  await expect(red).toHaveValue('0');
  await expect.poll(async () => Number((await output.innerText()).split(' / ')[0]), { timeout: 10_000 }).toBeLessThan(beforeFade);
});

test('scene file import and export preserves the complete versioned keyframe sequence', async ({ page }) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: '2D', exact: true }).click();
  const source = JSON.parse(JSON.stringify(PRESETS[0]));
  const sceneFile = page.locator('input[type="file"]');
  await sceneFile.setInputFiles({
    name: 'boarding.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(source)),
  });
  await expect(page.getByRole('button', { name: /Boarding/ })).toBeVisible();
  await expect(sceneFile).toHaveValue('');

  const pngDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  expect((await pngDownload).suggestedFilename()).toBe('adigun-zone-map-3840x2160.png');

  const readDownload = async () => {
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'More studio actions' }).click();
    await page.getByRole('menuitem', { name: 'Export scene JSON' }).click();
    const download = await downloadEvent;
    const stream = await download.createReadStream();
    if (!stream) throw new Error('The exported scene download stream is unavailable.');
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return { name: download.suggestedFilename(), bytes: Buffer.concat(chunks) };
  };

  const firstExport = await readDownload();
  expect(firstExport.name).toBe('boarding.adigun-scene.json');
  expect(JSON.parse(firstExport.bytes.toString('utf8'))).toEqual(source);

  await sceneFile.setInputFiles({
    name: 'roundtrip.json', mimeType: 'application/json', buffer: firstExport.bytes,
  });
  await expect(sceneFile).toHaveValue('');
  const secondExport = await readDownload();
  expect(secondExport.bytes.toString('utf8')).toBe(firstExport.bytes.toString('utf8'));

  await sceneFile.setInputFiles({
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

test('desktop workspace navigation focuses and marks each fixed panel', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio');
  const destinations = [
    ['Cabin overview', '#cabin-view'],
    ['Zone mapping', '#zone-inspector'],
    ['Choreography', '#timeline'],
    ['Scene library', '#scene-library'],
  ] as const;
  for (const [label, target] of destinations) {
    const nav = page.getByRole('button', { name: label });
    await nav.click();
    await expect(nav).toHaveAttribute('aria-current', 'page');
    await expect(page.locator(target)).toBeFocused();
    await expect(page.locator(target)).toHaveCSS('border-top-color', /^rgba\(34, 211, 238,/);
  }
});

test('transition preview changes cabin output with optional motion and sound cues', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio');
  const motion = page.getByRole('button', { name: 'Camera motion preview' });
  const sound = page.getByRole('button', { name: 'Audio keyframe cues' });
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
  await motion.click();
  await expect(motion).toHaveAttribute('aria-pressed', 'true');
  await motion.click();
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Play preview' }).click();
  await expect(page.getByRole('button', { name: 'Pause preview' })).toBeVisible();
  const initialTime = await page.locator('.time-readout').innerText();
  await expect.poll(async () => page.locator('.time-readout').innerText()).not.toBe(initialTime);
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
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.locator('.windows-zone path').nth(1).click();
  await expect(page.getByRole('heading', { name: 'Window surrounds' })).toBeVisible();
});

test('new cabin zones, scenes, and browser-local projects are usable', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/studio');
  await expect(page.getByRole('img', { name: 'Interactive 3D configurable reference aircraft cabin' })).toBeVisible();
  const renderSize = await page.locator('canvas.cabin-webgl-canvas').evaluate((canvas: HTMLCanvasElement) => ({ width: canvas.width, height: canvas.height }));
  expect(renderSize.width).toBeGreaterThan(0);
  expect(renderSize.height).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Cabin layout').selectOption('widebody');
  await expect(page.locator('.cabin-profile-summary')).toContainText('9 seats/row');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin3d-root')).toHaveAttribute('data-cabin-layout', 'widebody');
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await expect(page.getByLabel('Length (m)')).toHaveValue('27.6');
  await page.getByLabel('Length (m)').fill('22.4');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await expect(page.getByLabel('Length (m)')).toHaveValue('22.4');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await page.locator('#zone-picker').selectOption('toilet');
  await expect(page.getByRole('heading', { name: 'Lavatory' })).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept('Test scene'));
  await page.getByRole('button', { name: 'Create new scene' }).click();
  await expect(page.getByRole('button', { name: /Test scene/ })).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept('Project Test'));
  await page.getByRole('button', { name: 'Create new project' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('adigun-cabin-projects:v1') ?? '[]').some((project: { name: string }) => project.name === 'Project Test'))).toBe(true);
  await page.waitForTimeout(350);
  page.once('dialog', (dialog) => {
    const index = dialog.message().split('\n').findIndex((line) => line.includes('Project Test'));
    void dialog.accept(String(index));
  });
  await page.getByRole('button', { name: 'Open project' }).click();
  await expect.poll(() => page.evaluate(() => {
    const id = localStorage.getItem('adigun-cabin-active-project:v1');
    return id ? JSON.parse(localStorage.getItem(`adigun-cabin-studio:v1:${id}`) ?? '{}').projectName : '';
  })).toBe('Project Test');
  await page.getByRole('button', { name: 'More studio actions' }).click();
  const cabinDownload = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export cabin view · 4K PNG' }).click();
  const downloadedCabin = await cabinDownload;
  expect(downloadedCabin.suggestedFilename()).toBe('adigun-configurable-reference-cabin-3840x2160.png');
  const cabinStream = await downloadedCabin.createReadStream();
  if (!cabinStream) throw new Error('The exported cabin PNG stream is unavailable.');
  const cabinChunks: Buffer[] = [];
  for await (const chunk of cabinStream) cabinChunks.push(Buffer.from(chunk));
  const cabinPng = Buffer.concat(cabinChunks);
  expect(cabinPng.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect(cabinPng.readUInt32BE(16)).toBe(3840);
  expect(cabinPng.readUInt32BE(20)).toBe(2160);
  await expect(page.getByRole('status')).toContainText(/3D 4K: \d+ ms; ≥31\.6 MiB per RGBA surface \(peak unknown\)/);
});

test('Change cabin switches the 3D reference geometry from the left rail', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.locator('.cabin3d-root')).toHaveAttribute('data-cabin-layout', 'singleAisle');
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Cabin layout').selectOption('regional');
  await expect(page.locator('.cabin-profile-summary')).toContainText('4 seats/row');
  await expect(page.getByLabel('Length (m)')).toHaveValue('12.8');
  await expect(page.getByLabel('Interior width (m)')).toHaveValue('3.25');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin3d-root')).toHaveAttribute('data-cabin-layout', 'regional');

  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Cabin layout').selectOption('widebody');
  await expect(page.locator('.cabin-profile-summary')).toContainText('9 seats/row');
  await expect(page.getByLabel('Length (m)')).toHaveValue('27.6');
  await expect(page.getByLabel('Interior width (m)')).toHaveValue('5.75');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin3d-root')).toHaveAttribute('data-cabin-layout', 'widebody');
  await expect(page.locator('.cabin3d-badge')).toContainText('Wide cabin');
});

test('A350-900 reference loads source-backed cabin dimensions and the derived 315-seat plan', async ({ page }) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Cabin layout').selectOption('a350900');
  await expect(page.locator('.cabin-profile-summary')).toContainText('315 passengers');
  await expect(page.locator('.cabin-profile-summary')).toContainText('48 business');
  await expect(page.locator('.cabin-profile-summary')).toContainText('267 economy');
  await expect(page.getByLabel('Cabin length (m)')).toHaveValue('51.04');
  await expect(page.getByLabel('Max cabin width (m)')).toHaveValue('5.71');
  await expect(page.getByLabel('Cabin length (m)')).toBeDisabled();
  await expect(page.getByLabel('Seat rows')).toBeDisabled();
  await expect(page.locator('.cabin-profile-note')).toContainText('row distribution are derived');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin3d-root')).toHaveAttribute('data-cabin-layout', 'a350900');
  await expect(page.locator('.cabin3d-root')).toHaveAttribute('data-rendered-seat-count', '315');
  await expect(page.locator('.cabin3d-badge')).toContainText('A350-900');
  await expect(page.locator('.cabin3d-badge')).toContainText('Not an aircraft-specific fit');
});

test('A330-300 reference loads source-backed dimensions and its derived 300-seat plan', async ({ page }) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Cabin layout').selectOption('a330300');
  await expect(page.locator('.cabin-profile-summary')).toContainText('300 passengers');
  await expect(page.locator('.cabin-profile-summary')).toContainText('36 business');
  await expect(page.locator('.cabin-profile-summary')).toContainText('264 economy');
  await expect(page.getByLabel('Cabin length (m)')).toHaveValue('50.36');
  await expect(page.getByLabel('Max cabin width (m)')).toHaveValue('5.26');
  await expect(page.getByLabel('Cabin length (m)')).toBeDisabled();
  await expect(page.getByLabel('Seat rows')).toBeDisabled();
  await expect(page.locator('.cabin-profile-note')).toContainText('derived for display');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin3d-root')).toHaveAttribute('data-cabin-layout', 'a330300');
  await expect(page.locator('.cabin3d-root')).toHaveAttribute('data-rendered-seat-count', '300');
  await expect(page.locator('.cabin3d-badge')).toContainText('A330-300');
  await expect(page.locator('.cabin3d-badge')).toContainText('Not an aircraft-specific fit');
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
      regions: ['.studio-topbar', '.studio-rail', '.studio-main', '.cabin-panel', '.inspector'].map((selector) => {
        const { x, y, width: w, height: h } = document.querySelector(selector)!.getBoundingClientRect();
        return { selector, x, y, right: x + w, bottom: y + h, width: w, height: h };
      }),
    }));
    expect(metrics.documentWidth, `${width}x${height} horizontal document overflow`).toBeLessThanOrEqual(width);
    expect(metrics.documentHeight, `${width}x${height} vertical document overflow`).toBeLessThanOrEqual(height);
    expect(metrics.regions.every((region) => region.x >= -1 && region.y >= -1 && region.right <= width + 1 && region.bottom <= height + 1), `${width}x${height} dock region outside viewport`).toBe(true);
    const [top, rail, main, cabin, inspector] = metrics.regions;
    expect(top.bottom).toBeLessThanOrEqual(main.y + 1);
    expect(rail.right).toBeLessThanOrEqual(main.x + 1);
    expect(cabin.right).toBeLessThanOrEqual(inspector.x + 1);
    expect(main.bottom).toBeLessThanOrEqual(height + 1);
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

test('3D camera presets change angle inside the existing cabin viewer without moving its docked panel', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/studio');
  const stage = page.locator('.cabin-stage');
  const before = await stage.boundingBox();
  await page.getByLabel('3D camera angle').selectOption('aft');
  await expect(page.locator('.cabin3d-canvas')).toHaveAttribute('data-camera-view', 'aft');
  const aft = await stage.boundingBox();
  expect(aft?.x).toBeCloseTo(before?.x ?? 0, 1);
  expect(aft?.y).toBeCloseTo(before?.y ?? 0, 1);
  expect(aft?.width).toBeCloseTo(before?.width ?? 0, 1);
  expect(aft?.height).toBeCloseTo(before?.height ?? 0, 1);
  await page.getByLabel('Reset cabin camera view').click();
  await page.getByLabel('3D camera angle').selectOption('window-row');
  await expect(page.locator('.cabin3d-canvas')).toHaveAttribute('data-camera-view', 'window-row');
});

test('Studio menus open without moving the canvas and close with Escape', async ({ page }) => {
  await page.goto('/studio');
  const canvas = page.locator('#cabin-view');
  const before = await canvas.boundingBox();
  await page.getByRole('button', { name: 'More studio actions' }).click();
  await expect(page.getByRole('menuitem', { name: /Export scene JSON/ })).toBeVisible();
  expect(await canvas.boundingBox()).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: /Export scene JSON/ })).toBeHidden();
});


