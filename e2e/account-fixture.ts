
import { test as base } from '@playwright/test';
export { expect } from '@playwright/test';

export const test = base.extend<{ accountFixture: void }>({
  accountFixture: [async ({ context }, use) => {
    await context.route('**/api/account', async (route) => {
      const { step } = route.request().postDataJSON() as { step: string };
      await route.fulfill(step === 'guest'
        ? { json: { step: 'guest', remainingMs: 240000 } }
        : { status: 400, json: { error: 'fixture-unsupported' } });
    });
    await use();
  }, { auto: true }],
});
