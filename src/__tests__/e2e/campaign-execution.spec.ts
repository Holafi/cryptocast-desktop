import { test, expect, waitForPageLoad, takeScreenshot } from './your-test-helpers';

test.describe('Campaign Execution Workflow', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await waitForPageLoad(authenticatedPage);
  });

  test('should execute complete campaign workflow', async ({ page }) => {
    await page.goto('/campaign/1');

    // Step 1: Wallet Unlock
    await expect(page.getByText('解锁钱包')).toBeVisible();
    await expect(page.getByPlaceholderText(/输入密码/)).toBeVisible();

    // Enter password and unlock
    await page.getByPlaceholderText(/输入密码/).fill('password123');
    await page.getByText('解锁').click();

    await takeScreenshot(page, 'execution-wallet-unlocked');

    // Step 2: CSV Import
    await expect(page.getByText('收币地址列表')).toBeVisible();
    await expect(page.getByText('导入CSV')).toBeVisible();

    // Simulate CSV import (file input would need real file)
    await page.getByText('导入CSV').click();

    // Wait for CSV data to load
    await expect(page.getByText('0x1234567890123456789012345678901234567890')).toBeVisible();
    await expect(page.getByText('100')).toBeVisible();

    await takeScreenshot(page, 'execution-csv-imported');

    // Step 3: Gas Estimation
    await expect(page.getByText('Gas估算')).toBeVisible();
    await expect(page.getByText('预估Gas费用')).toBeVisible();

    await takeScreenshot(page, 'execution-gas-estimated');

    // Step 4: Token Approval
    await expect(page.getByText('代币授权')).toBeVisible();
    await page.getByText('授权').click();

    // Wait for approval to complete
    await expect(page.getByText('授权成功')).toBeVisible();

    await takeScreenshot(page, 'execution-token-approved');

    // Step 5: Batch Transfer
    await expect(page.getByText('执行批量转账')).toBeVisible();
    await page.getByText('开始执行').click();

    // Wait for execution to start
    await expect(page.getByText(/执行中/)).toBeVisible();

    // Wait for execution to complete
    await expect(page.getByText('执行完成')).toBeVisible();
    await expect(page.getByText('0xbatchtxhash')).toBeVisible();

    await takeScreenshot(page, 'execution-complete');
  });

  test('should handle wallet unlock failure', async ({ page, context }) => {
    // Mock wallet unlock failure
    await context.addInitScript(() => {
      (window as any).electronAPI.wallet.unlock = async () => {
        return { success: false, error: 'Invalid password' };
      };
    });

    await page.goto('/campaign/1');

    await page.getByPlaceholderText(/输入密码/).fill('wrongpassword');
    await page.getByText('解锁').click();

    await expect(page.getByText(/解锁失败/)).toBeVisible();
  });

  test('should allow CSV data editing', async ({ page }) => {
    await page.goto('/campaign/1');

    // Complete wallet unlock
    await page.getByPlaceholderText(/输入密码/).fill('password123');
    await page.getByText('解锁').click();

    await expect(page.getByText('导入CSV')).toBeVisible();

    // After CSV import, should show edit capabilities
    await page.getByText('导入CSV').click();

    await waitForPageLoad(page);

    // Should show edit and delete buttons
    await expect(page.getByText('编辑')).toBeVisible();
    await expect(page.getByText('删除')).toBeVisible();

    await takeScreenshot(page, 'execution-csv-editable');
  });

  test('should handle token approval failure', async ({ page, context }) => {
    // Mock approval failure
    await context.addInitScript(() => {
      (window as any).electronAPI.contract.approveTokens = async () => {
        throw new Error('Approval failed');
      };
    });

    await page.goto('/campaign/1');

    // Complete previous steps
    await page.getByPlaceholderText(/输入密码/).fill('password123');
    await page.getByText('解锁').click();

    await page.getByText('导入CSV').click();
    await waitForPageLoad(page);

    // Try to approve tokens
    await page.getByText('授权').click();

    await expect(page.getByText(/授权失败/)).toBeVisible();
  });

  test('should handle batch transfer failure', async ({ page, context }) => {
    // Mock batch transfer failure
    await context.addInitScript(() => {
      (window as any).electronAPI.contract.batchTransfer = async () => {
        throw new Error('Batch transfer failed');
      };
    });

    await page.goto('/campaign/1');

    // Complete all previous steps
    await page.getByPlaceholderText(/输入密码/).fill('password123');
    await page.getByText('解锁').click();

    await page.getByText('导入CSV').click();
    await waitForPageLoad(page);

    await page.getByText('授权').click();
    await waitForPageLoad(page);

    // Try to execute batch transfer
    await page.getByText('开始执行').click();

    await expect(page.getByText(/执行失败/)).toBeVisible();
  });

  test('should show real-time progress during batch transfer', async ({ page, context }) => {
    // Mock slow batch transfer with progress
    await context.addInitScript(() => {
      (window as any).electronAPI.contract.batchTransfer = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({
            transactionHash: '0xbatchtxhash',
            totalAmount: '600',
            recipientCount: 3,
            gasUsed: '170000'
          }), 3000);
        });
      };
    });

    await page.goto('/campaign/1');

    // Complete previous steps
    await page.getByPlaceholderText(/输入密码/).fill('password123');
    await page.getByText('解锁').click();

    await page.getByText('导入CSV').click();
    await waitForPageLoad(page);

    await page.getByText('授权').click();
    await waitForPageLoad(page);

    // Start batch transfer
    await page.getByText('开始执行').click();

    // Should show loading/progress state
    await expect(page.getByText(/执行中/)).toBeVisible();
    await expect(page.getByText(/0\/3/)).toBeVisible(); // Progress indicator

    await takeScreenshot(page, 'execution-in-progress');
  });

  test('should display transaction details after completion', async ({ page }) => {
    await page.goto('/campaign/1');

    // Complete full workflow
    await page.getByPlaceholderText(/输入密码/).fill('password123');
    await page.getByText('解锁').click();

    await page.getByText('导入CSV').click();
    await waitForPageLoad(page);

    await page.getByText('授权').click();
    await waitForPageLoad(page);

    await page.getByText('开始执行').click();
    await waitForPageLoad(page);

    // Should show completion details
    await expect(page.getByText('执行完成')).toBeVisible();
    await expect(page.getByText('交易哈希')).toBeVisible();
    await expect(page.getByText('总金额')).toBeVisible();
    await expect(page.getByText('收币地址数')).toBeVisible();
    await expect(page.getByText('Gas消耗')).toBeVisible();

    await takeScreenshot(page, 'execution-details');
  });

  test('should handle campaigns with different statuses', async ({ page, context }) => {
    // Mock completed campaign
    await context.addInitScript(() => {
      (window as any).electronAPI.campaign.getById = async () => ({
        id: '1',
        name: 'Completed Campaign',
        chain: '1',
        tokenAddress: '0x1234567890123456789012345678901234567890',
        status: 'COMPLETED',
        totalRecipients: 100,
        completedRecipients: 100,
        walletAddress: '0x1234567890123456789012345678901234567890',
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T11:45:00Z'
      });
    });

    await page.goto('/campaign/1');

    // Should show completed status
    await expect(page.getByText('COMPLETED')).toBeVisible();
    await expect(page.getByText('100/100')).toBeVisible();
    await expect(page.getByText('活动已完成')).toBeVisible();
  });

  test('should allow retry on failed operations', async ({ page }) => {
    await page.goto('/campaign/1');

    // Complete wallet unlock
    await page.getByPlaceholderText(/输入密码/).fill('password123');
    await page.getByText('解锁').click();

    await page.getByText('导入CSV').click();
    await waitForPageLoad(page);

    // Should show retry option for failed operations
    await expect(page.getByText('重试')).toBeVisible();
  });

  test('should validate CSV data format', async ({ page, context }) => {
    // Mock invalid CSV import
    await context.addInitScript(() => {
      (window as any).electronAPI.file.importCSV = async () => {
        throw new Error('Invalid CSV format');
      };
    });

    await page.goto('/campaign/1');

    await page.getByPlaceholderText(/输入密码/).fill('password123');
    await page.getByText('解锁').click();

    await page.getByText('导入CSV').click();

    await expect(page.getByText(/CSV格式错误/)).toBeVisible();
  });

  test('should show gas estimation before each step', async ({ page }) => {
    await page.goto('/campaign/1');

    await page.getByPlaceholderText(/输入密码/).fill('password123');
    await page.getByText('解锁').click();

    await page.getByText('导入CSV').click();
    await waitForPageLoad(page);

    // Should show gas estimation for approval
    await expect(page.getByText('授权Gas费用')).toBeVisible();

    await page.getByText('授权').click();
    await waitForPageLoad(page);

    // Should show gas estimation for batch transfer
    await expect(page.getByText('批量转账Gas费用')).toBeVisible();
  });
});