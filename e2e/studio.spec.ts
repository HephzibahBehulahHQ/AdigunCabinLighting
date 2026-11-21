import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Buffer } from 'node:buffer';
import { mkdir } from 'node:fs/promises';
import { PRESETS } from '../src/scene-engine';
import { createDefaultScenario } from '../operator/scenario-package';

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

test('landing page locale selector switches every public landing section', async ({ page }) => {
  await page.goto('/');
  const locale = page.locator('.landing-locale');
  const landing = page.locator('main.landing');

  await locale.selectOption('de');
  await expect(landing).toHaveAttribute('lang', 'de');
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gestalten Sie die Kabine für den Moment.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gestaltungsabsicht, klar abgegrenzt.' })).toBeVisible();

  await locale.selectOption('yo');
  await expect(landing).toHaveAttribute('lang', 'yo');
  await expect(page.getByRole('heading', { name: 'Ṣètò àgọ́ náà fún àkókò kọ̀ọ̀kan.' })).toBeVisible();
  await expect(landing).toContainText('Kò sopọ̀ mọ́ ọkọ̀ òfurufú');

  await locale.selectOption('pcm');
  await expect(landing).toHaveAttribute('lang', 'pcm');
  await expect(page.getByRole('heading', { name: 'Set the cabin light make e fit the moment.' })).toBeVisible();
  await expect(landing).toContainText('E no connect to aircraft');

  await locale.selectOption('en');
  await expect(landing).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: /Shape the cabin around the moment/i })).toBeVisible();
});

test('selected landing language carries into core Studio panels without adding controls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/studio');
  const fixedPanels = ['.studio-topbar', '.studio-rail', '#cabin-view', '#timeline', '#scene-library', '#zone-inspector'];
  const englishBoxes = await Promise.all(fixedPanels.map((selector) => page.locator(selector).boundingBox()));

  await page.goto('/');
  await page.locator('.landing-locale').selectOption('de');
  await page.goto('/studio');
  const studio = page.locator('.studio-shell');
  await expect(studio).toHaveAttribute('lang', 'de');
  await expect(page.getByRole('heading', { name: 'Digitaler Kabinenzwilling' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kabinenübersicht' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Übergangsvorschau' })).toBeVisible();
  await expect(page.getByText('ZONENINSPEKTOR')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hilfe', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vorschau abspielen' })).toBeVisible();
  const audioControls = page.getByRole('button', { name: 'Durchsagen und Lautstärke' });
  await audioControls.click();
  await expect(page.getByRole('combobox', { name: 'Verwendungszweck der lokalen Audiodatei' })).toBeVisible();
  await expect(page.getByText('Aufnahmen bleiben in diesem Browser', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Audioeinstellungen schließen' }).click();
  await page.getByRole('button', { name: 'Weitere Studio-Aktionen' }).click();
  await expect(page.getByRole('menuitem', { name: 'Szenendatei importieren' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Kabine ändern', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '3D-Modell für Flugzeug oder Airline' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Kabinenlayout' }).selectOption('a350900');
  await expect(page.locator('.cabin-profile-summary')).toContainText('315 Passagiere');
  await expect(page.getByText('Airbus-Abmessungen und Sitzplatzzahlen dienen als Planungsreferenz.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: /Airbus A350 Aircraft Characteristics/ })).toHaveAttribute('href', /airbus\.com/);
  await page.getByRole('button', { name: 'Kabinenkonfiguration schließen' }).click();
  const zonePicker = page.locator('#zone-picker');
  const previousZone = await zonePicker.inputValue();
  await zonePicker.selectOption('footwell');
  await expect(page.locator('#zone-inspector').getByRole('heading', { name: 'Fußraum' })).toBeVisible();
  await expect(page.locator('#zone-inspector').getByText('benannte Fußraumkomponenten', { exact: false })).toBeVisible();
  await zonePicker.selectOption(previousZone);
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Interaktive VVIP-Kabinenreferenz' })).toBeVisible();
  await page.getByRole('button', { name: 'Fußraum', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(zonePicker).toHaveValue('footwell');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await zonePicker.selectOption(previousZone);
  async function expectAlignedPanels(language: string) {
    const boxes = await Promise.all(fixedPanels.map((selector) => page.locator(selector).boundingBox()));
    for (let index = 0; index < fixedPanels.length; index++) {
      expect(boxes[index], `${fixedPanels[index]} disappeared in ${language}`).not.toBeNull();
      for (const edge of ['x', 'y', 'width', 'height'] as const) {
        expect(boxes[index]![edge], `${fixedPanels[index]} ${edge} changed in ${language}`).toBeCloseTo(englishBoxes[index]![edge], 0);
      }
    }
  }

  await page.getByLabel('Versionierte Szenen-JSON importieren').setInputFiles({
    name: 'invalid-scene.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 0 })),
  });
  await expect(studio.getByRole('status').filter({ hasText: 'Diese Version des Szenenschemas wird nicht unterstützt.' })).toBeVisible();
  await expectAlignedPanels('de');
  for (const [locale, heading, exportLabel] of [
    ['yo', 'Àwòṣe oni-nọmba àgọ́', 'Gbé jáde'],
    ['pcm', 'Cabin digital twin', 'Export am'],
  ]) {
    await page.goto('/');
    await page.locator('.landing-locale').selectOption(locale);
    await page.goto('/studio');
    await expect(studio).toHaveAttribute('lang', locale);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: exportLabel, exact: true })).toBeVisible();
    await expectAlignedPanels(locale);
  }
});

test('zone RGBW edits persist and undo works', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/studio');
  await page.locator('#zone-picker').selectOption('windows');
  const red = page.getByRole('spinbutton', { name: 'R percent' });
  await expect(red).toHaveValue('14');
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
  test.setTimeout(60_000);
  await page.goto('/studio');
  await page.locator('#zone-picker').selectOption('windows');
  const fade = page.locator('#fade');
  await fade.focus();
  await fade.press('Home');
  await expect(fade).toHaveValue('0');
  const red = page.getByRole('spinbutton', { name: 'R percent' });
  await red.fill('60');
  await red.press('Enter');
  const output = page.locator('.inspector-summary code');
  await expect(output).toHaveText('43 / 2 / 17 / 2');
  await page.getByRole('button', { name: /Apply & set keyframe/ }).click();
  await expect(page.getByRole('status')).toContainText('committed to Aurora at 00:00');
  const fadeBounds = await fade.boundingBox();
  expect(fadeBounds).not.toBeNull();
  await page.mouse.click(fadeBounds!.x + fadeBounds!.width * .1, fadeBounds!.y + fadeBounds!.height / 2);
  await expect.poll(async () => Number(await fade.inputValue())).toBeGreaterThan(0);
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
  const sceneFile = page.locator('input[aria-label="Import versioned scene JSON"]');
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

test('scenario package import creates a separate browser-local project and preserves its exact scene set', async ({ page }) => {
  const scenario = createDefaultScenario('A330 night-flight experience review', 'a330300', 'boarding', [PRESETS[0], PRESETS[5]], 68);
  await page.goto('/studio');
  await page.getByRole('button', { name: 'More studio actions' }).click();
  await page.getByRole('menuitem', { name: 'Import scenario package' }).click();
  const input = page.locator('input[aria-label="Import scenario package JSON"]');
  await input.setInputFiles({
    name: 'a330-night-flight.adigun-scenario.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(scenario)),
  });
  await expect(input).toHaveValue('');
  await expect.poll(async () => page.evaluate(() => {
    const id = localStorage.getItem('adigun-cabin-active-project:v1') ?? '';
    return JSON.parse(localStorage.getItem(`adigun-cabin-studio:v1:${id}`) ?? '{}').projectName;
  }), { timeout: 10_000 }).toBe(scenario.projectName);
  await expect(page.getByRole('button', { name: /Boarding/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sleep/ })).toBeVisible();

  const imported = await page.evaluate(() => {
    const id = localStorage.getItem('adigun-cabin-active-project:v1') ?? '';
    const index = JSON.parse(localStorage.getItem('adigun-cabin-projects:v1') ?? '[]');
    const state = JSON.parse(localStorage.getItem(`adigun-cabin-studio:v1:${id}`) ?? '{}');
    return { id, index, state };
  });
  expect(imported.id).not.toBe('default');
  expect(imported.index.some((entry: { name: string }) => entry.name === scenario.projectName)).toBe(true);
  expect(imported.state.cabinConfig.layoutId).toBe('a330300');
  expect(imported.state.intensity).toBe(68);
  expect(imported.state.scenes.map((scene: { id: string }) => scene.id)).toEqual(['boarding', 'sleep']);
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

test('transition preview runs scene-specific instrumental audio and exposes cabin announcement controls', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio');
  const motion = page.getByRole('button', { name: 'Camera motion preview' });
  const sound = page.getByRole('button', { name: 'Mood music' });
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
  await motion.click();
  await expect(motion).toHaveAttribute('aria-pressed', 'true');
  await motion.click();
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Audio announcements and volume' }).click();
  await expect(page.getByRole('group', { name: 'Cabin audio controls' })).toBeVisible();
  await expect(page.getByText('Aurora · soft piano')).toBeVisible();
  await expect(page.getByText(/Original browser-synthesized score · 56 BPM/i)).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Playback volume' })).toHaveValue('38');
  await expect(page.getByRole('button', { name: 'Welcome announcement' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guided cabin tour' })).toBeVisible();
  await page.getByLabel('Local audio cue role').selectOption('welcome');
  const testAudioBuffer = Buffer.from('local welcome recording fixture');
  await page.getByLabel('Local audio file').setInputFiles({ name: 'welcome-test.webm', mimeType: 'audio/webm', buffer: testAudioBuffer });
  await page.getByLabel('Audio track title').fill('HB380 welcome test');
  await page.getByLabel('Audio rights or source reference').fill('Automated test fixture · browser decoder not invoked');
  await page.getByRole('button', { name: 'Add welcome announcement recording' }).click();
  await expect(page.getByText('HB380 welcome test', { exact: true })).toBeVisible();
  const voicePlayer = page.locator('audio[data-testid="local-voice-audio"]');
  await voicePlayer.evaluate((audio: HTMLAudioElement) => {
    audio.play = () => { audio.dataset.playRequested = 'true'; return Promise.resolve(); };
  });
  await page.locator('.audio-voice-actions').getByRole('button', { name: 'Welcome announcement' }).click();
  await expect(voicePlayer).toHaveAttribute('src', /^blob:/);
  await expect(voicePlayer).toHaveAttribute('data-play-requested', 'true');
  await page.getByRole('button', { name: 'Close audio controls' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Audio announcements and volume' }).click();
  await page.getByLabel('Local audio cue role').selectOption('welcome');
  await expect(page.getByText('HB380 welcome test', { exact: true })).toBeVisible();
  const restoredVoicePlayer = page.locator('audio[data-testid="local-voice-audio"]');
  await restoredVoicePlayer.evaluate((audio: HTMLAudioElement) => {
    audio.play = () => { audio.dataset.playRequested = 'true'; return Promise.resolve(); };
  });
  await page.locator('.audio-voice-actions').getByRole('button', { name: 'Welcome announcement' }).click();
  await expect(restoredVoicePlayer).toHaveAttribute('data-play-requested', 'true');
  await page.getByRole('button', { name: 'Close audio controls' }).click();
  const timeline = page.getByRole('slider', { name: 'Scene timeline position' });
  const initialTime = Number(await timeline.inputValue());
  await page.getByRole('button', { name: 'Play preview' }).click();
  await expect(page.getByRole('button', { name: 'Pause preview' })).toBeVisible();
  await expect.poll(async () => Number(await timeline.inputValue()), { timeout: 10_000 }).toBeGreaterThan(initialTime);
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
  await page.locator('[aria-label="Cabin window 1 on left side"]').click();
  await expect(page.getByRole('heading', { name: 'Window daylight' })).toBeVisible();
});

test('new cabin zones, scenes, and browser-local projects are usable', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/studio');
  await expect(page.locator('.cabin-webgl-canvas')).toHaveAttribute('data-cabin-profile', 'gulfstream-g650er');
  await expect(page.locator('.cabin-webgl-canvas')).toBeVisible();
  const renderSize = await page.locator('canvas.cabin-webgl-canvas').evaluate((canvas: HTMLCanvasElement) => ({ width: canvas.width, height: canvas.height }));
  expect(renderSize.width).toBeGreaterThan(0);
  expect(renderSize.height).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Cabin layout').selectOption('widebody');
  await expect(page.locator('.cabin-profile-summary')).toContainText('9 seats/row');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin-stage')).toHaveAttribute('data-cabin-layout', 'widebody');
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await expect(page.getByLabel('Length (m)')).toHaveValue('27.6');
  await page.getByLabel('Length (m)').fill('22.4');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await expect(page.getByLabel('Length (m)')).toHaveValue('22.4');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('#zone-picker option[value="toilet"]')).toHaveCount(1);
  await expect(page.locator('#zone-picker option[value="trolley"]')).toHaveCount(1);
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

test('Zone Inspector follows the selected aircraft GLB component inventory', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/studio');
  const picker = page.locator('#zone-picker');
  await expect(picker.locator('option[value="toilet"]')).toHaveCount(0);
  await expect(picker.locator('option[value="trolley"]')).toHaveCount(0);
  await expect(picker.locator('option[value="monuments"]')).toHaveCount(1);
  await expect(picker.locator('option[value="ceiling"]')).toHaveCount(0);
  await expect(picker.locator('option[value="ceiling_cove"]')).toHaveCount(1);
  await picker.selectOption('monuments');
  await expect(page.getByRole('heading', { name: 'Service monuments / VIP consoles' })).toBeVisible();

  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Aircraft or airline 3D model').selectOption('emirates-777-300er-328');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin-webgl-canvas')).toHaveAttribute('data-cabin-profile', 'emirates-777-300er-328');
  await expect(picker.locator('option[value="reading"]')).toHaveCount(0);
  await expect(picker.locator('option[value="monuments"]')).toHaveCount(0);
  await expect(picker.locator('option[value="spotlights"]')).toHaveCount(0);
  await expect(picker.locator('option[value="reading"]')).toHaveCount(0);
  await expect(picker.locator('option[value="emergency"]')).toHaveCount(0);
  await expect(picker.locator('option[value="exit"]')).toHaveCount(0);
  await expect.poll(() => picker.inputValue()).not.toBe('monuments');
  await expect(page.locator('.inspector-head h2')).toHaveText(await picker.locator('option:checked').innerText());
});

test('Change cabin switches the 3D reference geometry from the left rail', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/studio');
  await expect(page.locator('.cabin-webgl-canvas')).toHaveAttribute('data-cabin-profile', 'gulfstream-g650er');
  await expect(page.locator('.cabin-webgl-canvas')).toHaveAttribute('data-visible-windows', '16');
  await expect(page.locator('.cabin-webgl-canvas')).toHaveAttribute('data-rendered-seats', '10');
  await expect(page.locator('.cabin-webgl-canvas')).toHaveAttribute('data-seat-overlaps', '0');
  await expect(page.locator('.cabin-webgl-canvas')).toHaveAttribute('data-seat-floor-gap', '0');
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Cabin layout').selectOption('regional');
  await expect(page.locator('.cabin-profile-summary')).toContainText('4 seats/row');
  await expect(page.getByLabel('Length (m)')).toHaveValue('12.8');
  await expect(page.getByLabel('Interior width (m)')).toHaveValue('3.25');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin-stage')).toHaveAttribute('data-cabin-layout', 'regional');

  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Cabin layout').selectOption('widebody');
  await expect(page.locator('.cabin-profile-summary')).toContainText('9 seats/row');
  await expect(page.getByLabel('Length (m)')).toHaveValue('27.6');
  await expect(page.getByLabel('Interior width (m)')).toHaveValue('5.75');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin-stage')).toHaveAttribute('data-cabin-layout', 'widebody');
  await expect(page.locator('.cabin3d-badge')).toContainText('Wide cabin');
});

test('owner image-derived VVIP cabin profile switches the matching seat and window layout in 2D and 3D', async ({ page }) => {
  await page.goto('/studio');
  const cabinView = page.getByRole('group', { name: 'Cabin view' });
  await cabinView.getByRole('button', { name: '2D' }).click();
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Cabin layout').selectOption('ownerVvip');
  await expect(page.locator('.cabin-profile-summary')).toContainText('Two private seats per row');
  await expect(page.locator('.cabin-profile-note').last()).toContainText('visually inferred');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  const map = page.locator('.cabin-drawing');
  await expect(map).toHaveAttribute('data-layout-id', 'ownerVvip');
  await expect(map).toHaveClass(/cabin-reference-view/);
  await expect.poll(() => map.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth > 0)).toBe(true);
  await expect(map.locator('svg g[role="button"]')).toHaveCount(6);
  await map.getByRole('button', { name: 'Footwell' }).click();
  await expect(page.locator('#zone-picker')).toHaveValue('footwell');

  await cabinView.getByRole('button', { name: '3D' }).click();
  const model = page.locator('.cabin-stage');
  await expect(model).toHaveAttribute('data-cabin-layout', 'ownerVvip');
  await expect(page.locator('.cabin-stage')).toHaveAttribute('data-view-mode', '3d');
  await expect(page.locator('.cabin3d-root')).toHaveAttribute('data-cabin-layout', 'ownerVvip');
});

test('A350-900 reference loads source-backed cabin dimensions and the derived 315-seat plan', async ({ page }) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Cabin layout').selectOption('a350900');
  await expect(page.getByLabel('Aircraft or airline 3D model')).toHaveValue('');
  await expect(page.locator('.cabin-profile-summary')).toContainText('315 passengers');
  await expect(page.locator('.cabin-profile-summary')).toContainText('48 business');
  await expect(page.locator('.cabin-profile-summary')).toContainText('267 economy');
  await expect(page.getByLabel('Cabin length (m)')).toHaveValue('51.04');
  await expect(page.getByLabel('Max cabin width (m)')).toHaveValue('5.71');
  await expect(page.getByLabel('Cabin length (m)')).toBeDisabled();
  await expect(page.getByLabel('Seat rows')).toBeDisabled();
  await expect(page.locator('.cabin-profile-note').last()).toContainText('row distribution are derived');
  await expect(page.locator('.cabin-profile-note').last().locator('a')).toHaveAttribute('href', /AC_A350_20250715\.pdf$/);
  await expect(page.locator('.cabin-profile-note').last()).toContainText('Rev 15 · Jul 15/25');
  await expect(page.locator('.cabin-profile-note').last()).toContainText('not the Airbus plan drawing or an airline fit');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin-stage')).toHaveAttribute('data-cabin-layout', 'a350900');
  await expect(page.locator('.cabin3d-root')).toHaveAttribute('data-rendered-seat-count', '315', { timeout: 20_000 });
  await expect(page.locator('.cabin3d-badge')).toContainText('A350-900');
  await expect(page.locator('.cabin3d-badge')).toContainText('Not an aircraft-specific fit');
});

test('A330-300 reference loads source-backed dimensions and its derived 300-seat plan', async ({ page }) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Cabin layout').selectOption('a330300');
  await expect(page.getByLabel('Aircraft or airline 3D model')).toHaveValue('');
  await expect(page.locator('.cabin-profile-summary')).toContainText('300 passengers');
  await expect(page.locator('.cabin-profile-summary')).toContainText('36 business');
  await expect(page.locator('.cabin-profile-summary')).toContainText('264 economy');
  await expect(page.getByLabel('Cabin length (m)')).toHaveValue('50.36');
  await expect(page.getByLabel('Max cabin width (m)')).toHaveValue('5.26');
  await expect(page.getByLabel('Cabin length (m)')).toBeDisabled();
  await expect(page.getByLabel('Seat rows')).toBeDisabled();
  await expect(page.locator('.cabin-profile-note').last()).toContainText('derived for display');
  await expect(page.locator('.cabin-profile-note').last().locator('a')).toHaveAttribute('href', /AC_A330_20251201\.pdf$/);
  await expect(page.locator('.cabin-profile-note').last()).toContainText('Rev Dec 01/25');
  await expect(page.locator('.cabin-profile-note').last()).toContainText('generic reference geometry');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin-stage')).toHaveAttribute('data-cabin-layout', 'a330300');
  await expect(page.locator('.cabin3d-root')).toHaveAttribute('data-rendered-seat-count', '300', { timeout: 20_000 });
  await expect(page.locator('.cabin3d-badge')).toContainText('A330-300');
  await expect(page.locator('.cabin3d-badge')).toContainText('Not an aircraft-specific fit');
});

test('engineering preflight export includes source evidence, fixture gaps, and scene changes', async ({ page }) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Cabin layout').selectOption('a350900');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await page.getByRole('button', { name: 'More studio actions' }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export engineering preflight · JSON' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.engineering-preflight\.json$/);
  const stream = await download.createReadStream();
  if (!stream) throw new Error('The engineering preflight report stream is unavailable.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const report = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(report.mode).toBe('SIMULATION');
  expect(report.physicalOutputEnabled).toBe(false);
  expect(report.sceneValidation.status).toBe('VALID');
  expect(report.sceneData.schemaVersion).toBe(1);
  expect(report.sceneComparison.status).toBe('COMPARED');
  expect(report.cabinProfile.sourceRevision).toContain('Jul 15/25');
  expect(report.cabinProfile.assetRights).toContain('No licensed 3D cabin asset');
  expect(report.fixtureCoverage).toMatchObject({ status: 'MISSING_FIXTURE_DOCUMENTATION', checkedZoneCount: 17, documentedZoneCount: 0 });
  expect(report.fixtureCoverage.missingDocumentationZones).toHaveLength(17);
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

test('airline cabin meshes load in the locked Studio and respond to controls', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/studio');
  const fixedPanels = ['.studio-topbar', '.studio-rail', '#cabin-view', '#timeline', '#scene-library', '#zone-inspector'];
  const before = await Promise.all(fixedPanels.map((selector) => page.locator(selector).boundingBox()));

  await page.getByRole('button', { name: 'Change cabin' }).click();
  const modelPicker = page.getByLabel('Aircraft or airline 3D model');
  await expect(modelPicker.locator('option')).toHaveCount(30);
  await modelPicker.selectOption('emirates-777-300er-328');
  await expect(page.locator('.cabin-profile-note').first()).toContainText('authored reconstruction');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin-stage')).toHaveAttribute('data-aircraft-mesh-id', 'emirates-777-300er-328');
  await expect(page.locator('.cabin-asset-renderer')).toHaveCount(1);
  const canvas = page.locator('.cabin-asset-renderer canvas');
  await expect(canvas).toHaveAttribute('data-cabin-profile', 'emirates-777-300er-328', { timeout: 60_000 });
  await expect(canvas).toHaveAttribute('aria-label', /Emirates/);
  await expect(canvas).toBeVisible();
  await expect(page.locator('.cabin-asset-error')).toHaveCount(0);
  // Each of the model's supported lighting groups has a 32-source runtime cap.
  expect(Number(await canvas.getAttribute('data-simulated-light-count'))).toBeGreaterThan(0);
  expect(Number(await canvas.getAttribute('data-simulated-light-count'))).toBeLessThanOrEqual(12 * 32);
  await page.screenshot({ path: 'artifacts/screenshots/airline-emirates-328-3d.png' });

  await page.getByRole('button', { name: 'Change cabin' }).click();
  await page.getByLabel('Aircraft or airline 3D model').selectOption('qantaslink-a220-300-137');
  await page.getByRole('button', { name: 'Load cabin layout' }).click();
  await expect(page.locator('.cabin-stage')).toHaveAttribute('data-aircraft-mesh-id', 'qantaslink-a220-300-137');
  await expect(canvas).toHaveAttribute('data-cabin-profile', 'qantaslink-a220-300-137', { timeout: 60_000 });
  await expect(canvas).toHaveAttribute('aria-label', /QantasLink/);

  const after = await Promise.all(fixedPanels.map((selector) => page.locator(selector).boundingBox()));
  for (let index = 0; index < fixedPanels.length; index++) {
    expect(after[index], `${fixedPanels[index]} disappeared after mesh selection`).not.toBeNull();
    for (const edge of ['x', 'y', 'width', 'height'] as const) {
      expect(after[index]![edge], `${fixedPanels[index]} ${edge} moved after mesh selection`).toBeCloseTo(before[index]![edge], 0);
    }
  }
  expect(errors).toEqual([]);
});

test('3D camera presets change angle inside the existing cabin viewer without moving its docked panel', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/studio');
  const stage = page.locator('.cabin-stage');
  const before = await stage.boundingBox();
  await page.getByLabel('3D camera angle').selectOption('aft');
  await expect(page.locator('.cabin-asset-renderer')).toHaveAttribute('data-camera-view', 'aft');
  const aft = await stage.boundingBox();
  expect(aft?.x).toBeCloseTo(before?.x ?? 0, 1);
  expect(aft?.y).toBeCloseTo(before?.y ?? 0, 1);
  expect(aft?.width).toBeCloseTo(before?.width ?? 0, 1);
  expect(aft?.height).toBeCloseTo(before?.height ?? 0, 1);
  await page.getByLabel('Reset cabin camera view').click();
  await page.getByLabel('3D camera angle').selectOption('window-row');
  await expect(page.locator('.cabin-asset-renderer')).toHaveAttribute('data-camera-view', 'window-row');
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





