import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E tests...');

  // Setup test database or any global test requirements
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // You can perform any global setup here, like:
  // - Setting up test data
  // - Starting services
  // - Cleaning up previous test runs

  console.log('✅ E2E test setup complete');

  await context.close();
  await browser.close();
}

export default globalSetup;