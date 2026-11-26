import { expect, test } from '@playwright/test';

test('floating Adigun BOT asks for consent and sends only visitor-entered text', async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/bot', async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ answer: 'Try a longer fade and review it in the offline preview.' }) });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const launcher = page.getByRole('button', { name: 'Open Adigun BOT' });
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.getByRole('region', { name: 'Adigun BOT' })).toBeVisible();

  const input = page.getByRole('textbox', { name: 'Ask about a cabin-lighting scene…' });
  const send = page.getByRole('button', { name: 'Send' });
  await input.fill('How can I make a sunrise feel softer?');
  await expect(send).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Send my message to the AI copilot for a reply.' }).check();
  await send.click();

  await expect(page.getByText('Try a longer fade and review it in the offline preview.')).toBeVisible();
  expect(submitted).toEqual({
    consent: true,
    language: 'en',
    messages: [{ role: 'user', content: 'How can I make a sunrise feel softer?' }],
  });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Adigun BOT' })).toHaveCount(0);
  await expect(launcher).toBeFocused();
});

test('floating Adigun BOT remains usable on the Studio route and a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/studio');
  const launcher = page.getByRole('button', { name: 'Open Adigun BOT' });
  await expect(launcher).toBeVisible();
  await launcher.click();
  const panel = page.locator('#adigun-bot-panel');
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
});
