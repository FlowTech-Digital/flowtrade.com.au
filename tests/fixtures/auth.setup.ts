import { test as setup, expect } from '@playwright/test';
import { TEST_CREDENTIALS, URLS, SELECTORS } from './test-data';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Authentication Setup
 * Runs once before all tests to establish auth state
 * Saves auth state to file for reuse across test files
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto(URLS.login);
  
  // Fill login form
  await page.fill(SELECTORS.emailInput, TEST_CREDENTIALS.email);
  await page.fill(SELECTORS.passwordInput, TEST_CREDENTIALS.password);
  
  // Submit and wait for navigation
  await page.click(SELECTORS.submitButton);
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  
  // Verify we're logged in
  await expect(page).toHaveURL(/\/dashboard/);
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});
