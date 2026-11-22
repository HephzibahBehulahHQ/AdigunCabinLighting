
import { expect, test } from './account-fixture';

test('Studio locks when guest time expires and requires a fresh sign-in code', async ({ page }) => {
  let mode: string | undefined;
  let registered = false;
  await page.route('**/api/account', async (route) => {
    const body = route.request().postDataJSON() as { step: string; mode?: string; code?: string };
    if (body.step === 'guest') {
      await route.fulfill({ json: { step: 'guest', remainingMs: 20 } });
    } else if (body.step === 'begin') {
      mode = body.mode;
      await route.fulfill({ json: { step: 'verify' } });
    } else if (body.step === 'verify' && body.code === '123456') {
      if (mode === 'register') {
        registered = true;
        await route.fulfill({ json: { step: 'registered' } });
      } else if (registered && mode === 'sign-in') {
        await route.fulfill({ json: { step: 'signed-in' } });
      } else {
        await route.fulfill({ status: 401, json: { error: 'product-account-not-authorized' } });
      }
    } else {
      await route.fulfill({ status: 401, json: { error: 'invalid-or-expired-email-code' } });
    }
  });
  await page.goto('/studio/');
  const account = page.getByRole('dialog', { name: 'CabinLighting account' });
  await expect(account.getByText('Your four-minute Studio trial has ended.')).toBeVisible();
  await expect(page.locator('main.studio-shell')).toHaveAttribute('inert', '');
  await account.getByLabel('Email', { exact: true }).fill('studio-account@example.invalid');
  await account.getByLabel('Password', { exact: true }).fill('cabin-only-test-password');
  await account.getByRole('button', { name: 'Create account' }).click();
  await account.getByLabel('Email code').fill('123456');
  await account.getByRole('button', { name: 'Verify code' }).click();
  await expect(account.getByRole('status')).toContainText('Account verified.');
  await expect(account).toBeVisible();
  await account.getByLabel('Password', { exact: true }).fill('cabin-only-test-password');
  await account.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(account.getByLabel('Email code')).toBeVisible();
  await account.getByLabel('Email code').fill('123456');
  await account.getByRole('button', { name: 'Verify code' }).click();
  await expect(account).toBeHidden();
  await expect(page.locator('main.studio-shell')).not.toHaveAttribute('inert', '');
});
