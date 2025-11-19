import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E tests...');

  // Clean up any test data, close services, etc.

  console.log('✅ E2E test cleanup complete');
}

export default globalTeardown;