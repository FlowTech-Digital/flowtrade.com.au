import { test as setup, expect } from '@playwright/test';
import { TEST_CREDENTIALS, TEST_URLS } from './test-data';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to login
  await page.goto(TEST_URLS.login);
  
  // Fill login form
  await page.fill('input[name="email"], input[type="email"]', TEST_CREDENTIALS.email);
  await page.fill('input[name="password"], input[type="password"]', TEST_CREDENTIALS.password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  
  // Verify we're logged in
  await expect(page).toHaveURL(/dashboard/);
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});
