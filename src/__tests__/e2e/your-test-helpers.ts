import { test as base, Page, BrowserContext } from '@playwright/test';

// Define test fixtures
interface TestFixtures {
  authenticatedPage: Page;
}

// Extend base test with custom fixtures
export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page, context }, use) => {
    // Setup authentication or any preconditions
    await page.goto('/');

    // Mock electronAPI for testing
    await context.addInitScript(() => {
      (window as any).electronAPI = {
        campaign: {
          list: async () => [
            {
              id: '1',
              name: 'Test Campaign',
              chain: '1',
              tokenAddress: '0x1234567890123456789012345678901234567890',
              status: 'READY',
              totalRecipients: 0,
              completedRecipients: 0,
              walletAddress: '0x1234567890123456789012345678901234567890',
              contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
              createdAt: '2024-01-15T10:30:00Z',
              updatedAt: '2024-01-15T11:45:00Z'
            }
          ],
          getById: async (id: string) => ({
            id,
            name: 'Test Campaign',
            chain: '1',
            tokenAddress: '0x1234567890123456789012345678901234567890',
            status: 'READY',
            totalRecipients: 0,
            completedRecipients: 0,
            walletAddress: '0x1234567890123456789012345678901234567890',
            contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T11:45:00Z'
          }),
          create: async () => ({ id: '1', success: true }),
          update: async () => ({ success: true })
        },
        wallet: {
          generateWallet: async () => ({
            address: '0x1234567890123456789012345678901234567890',
            privateKey: '0x' + '1'.repeat(64),
            publicKey: '0x' + '2'.repeat(128)
          }),
          unlock: async () => ({ success: true }),
          lock: async () => ({ success: true })
        },
        contract: {
          deploy: async () => ({
            contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            blockNumber: 12345,
            gasUsed: '150000'
          }),
          approveTokens: async () => '0xapprovetxhash',
          batchTransfer: async () => ({
            transactionHash: '0xbatchtxhash',
            totalAmount: '600',
            recipientCount: 3,
            gasUsed: '170000'
          })
        },
        file: {
          importCSV: async () => [
            { address: '0x1234567890123456789012345678901234567890', amount: '100' },
            { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', amount: '200' }
          ],
          exportReport: async () => ({ success: true, filePath: '/path/to/export.csv' })
        },
        gas: {
          getGasInfo: async () => ({
            gasPrice: '20',
            network: 'ethereum',
            gasLimit: '1000000',
            estimatedCost: '0.02'
          }),
          getBatchGasEstimate: async () => ({
            baseGas: '50000',
            gasPerRecipient: '20000',
            totalGas: '170000',
            estimatedCost: '0.0034',
            recipientCount: 3
          })
        }
      };
    });

    await use(page);
  }
});

export const expect = base.expect;

// Common helper functions
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

export async function mockElectronAPI(context: BrowserContext, mocks: any) {
  await context.addInitScript((mockData) => {
    (window as any).electronAPI = { ...(window as any).electronAPI, ...mockData };
  }, mocks);
}

export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
}