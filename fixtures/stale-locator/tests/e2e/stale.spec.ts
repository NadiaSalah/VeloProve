// @qaforge-generated: TC-REQ-AUTH-001
import { test } from '@playwright/test';

test('stale locator test', async ({ page }) => {
  await page.locator('#submit-btn').click();
});
