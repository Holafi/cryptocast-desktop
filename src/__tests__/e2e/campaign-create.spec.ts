import { test, expect, waitForPageLoad, takeScreenshot } from './your-test-helpers';

test.describe('Campaign Creation Workflow', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await waitForPageLoad(authenticatedPage);
  });

  test('should create a complete campaign', async ({ page }) => {
    await page.goto('/campaign/create');

    // Step 1: Basic Information
    await expect(page.getByText('基本信息')).toBeVisible();

    // Fill campaign name
    await page.getByLabel(/活动名称/).fill('E2E Test Campaign');

    // Fill token address
    await page.getByLabel(/代币合约地址/).fill('0x1234567890123456789012345678901234567890');

    // Select network
    await page.getByLabel(/选择区块链网络/).selectOption('ethereum');

    await takeScreenshot(page, 'campaign-step-1');

    // Click next to go to wallet step
    await page.getByText('下一步').click();

    // Step 2: Wallet Setup
    await expect(page.getByText('部署智能合约')).toBeVisible();
    await expect(page.getByText('生成新钱包')).toBeVisible();

    await takeScreenshot(page, 'campaign-step-2');

    // Generate new wallet
    await page.getByText('生成新钱包').click();

    // Wait for wallet generation
    await expect(page.getByText(/0x1234567890123456789012345678901234567890/)).toBeVisible();

    await takeScreenshot(page, 'campaign-wallet-generated');

    // Click next to go to deployment step
    await page.getByText('下一步').click();

    // Step 3: Contract Deployment
    await expect(page.getByText('部署智能合约')).toBeVisible();
    await expect(page.getByText('部署合约并创建活动')).toBeVisible();

    await takeScreenshot(page, 'campaign-step-3');

    // Deploy contract and create campaign
    await page.getByText('部署合约并创建活动').click();

    // Wait for deployment to complete
    await expect(page.getByText('活动创建成功')).toBeVisible();

    await takeScreenshot(page, 'campaign-creation-complete');
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/campaign/create');

    // Try to proceed without filling fields
    await page.getByText('下一步').click();

    // Should show validation error
    await expect(page.getByText(/活动名称是必填项/)).toBeVisible();
  });

  test('should handle different network selections', async ({ page }) => {
    await page.goto('/campaign/create');

    // Fill campaign name
    await page.getByLabel(/活动名称/).fill('Network Test Campaign');

    // Test different networks
    await page.getByLabel(/选择区块链网络/).selectOption('polygon');
    await expect(page.getByDisplayValue(/polygon/)).toBeVisible();

    await page.getByLabel(/选择区块链网络/).selectOption('bsc');
    await expect(page.getByDisplayValue(/bsc/)).toBeVisible();

    await page.getByLabel(/选择区块链网络/).selectOption('avalanche');
    await expect(page.getByDisplayValue(/avalanche/)).toBeVisible();
  });

  test('should allow navigation between steps', async ({ page }) => {
    await page.goto('/campaign/create');

    // Fill first step
    await page.getByLabel(/活动名称/).fill('Navigation Test');
    await page.getByLabel(/代币合约地址/).fill('0x1234567890123456789012345678901234567890');
    await page.getByLabel(/选择区块链网络/).selectOption('ethereum');

    // Go to next step
    await page.getByText('下一步').click();

    // Should show back button
    await expect(page.getByText('上一步')).toBeVisible();

    // Go back
    await page.getByText('上一步').click();

    // Should be back to first step
    await expect(page.getByText('基本信息')).toBeVisible();
    await expect(page.getByText('上一步')).not.toBeVisible();
  });

  test('should handle wallet generation errors', async ({ page, context }) => {
    // Mock wallet generation failure
    await context.addInitScript(() => {
      (window as any).electronAPI.wallet.generateWallet = async () => {
        throw new Error('Wallet generation failed');
      };
    });

    await page.goto('/campaign/create');

    // Fill first step
    await page.getByLabel(/活动名称/).fill('Error Test');
    await page.getByLabel(/代币合约地址/).fill('0x1234567890123456789012345678901234567890');
    await page.getByLabel(/选择区块链网络/).selectOption('ethereum');
    await page.getByText('下一步').click();

    // Try to generate wallet
    await page.getByText('生成新钱包').click();

    // Should show error message
    await expect(page.getByText(/生成钱包失败/)).toBeVisible();
  });

  test('should handle contract deployment errors', async ({ page, context }) => {
    // Mock deployment failure
    await context.addInitScript(() => {
      (window as any).electronAPI.contract.deploy = async () => {
        throw new Error('Contract deployment failed');
      };
    });

    await page.goto('/campaign/create');

    // Complete first two steps
    await page.getByLabel(/活动名称/).fill('Deployment Error Test');
    await page.getByLabel(/代币合约地址/).fill('0x1234567890123456789012345678901234567890');
    await page.getByLabel(/选择区块链网络/).selectOption('ethereum');
    await page.getByText('下一步').click();

    await page.getByText('生成新钱包').click();
    await page.getByText('下一步').click();

    // Try to deploy
    await page.getByText('部署合约并创建活动').click();

    // Should show error message
    await expect(page.getByText(/部署失败/)).toBeVisible();
  });

  test('should show loading states during operations', async ({ page, context }) => {
    // Mock slow operations
    await context.addInitScript(() => {
      (window as any).electronAPI.wallet.generateWallet = async () => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            address: '0x1234567890123456789012345678901234567890',
            privateKey: '0x' + '1'.repeat(64),
            publicKey: '0x' + '2'.repeat(128)
          }), 2000);
        });
      };
    });

    await page.goto('/campaign/create');

    // Complete first step
    await page.getByLabel(/活动名称/).fill('Loading Test');
    await page.getByLabel(/代币合约地址/).fill('0x1234567890123456789012345678901234567890');
    await page.getByLabel(/选择区块链网络/).selectOption('ethereum');
    await page.getByText('下一步').click();

    // Generate wallet and check loading state
    await page.getByText('生成新钱包').click();

    // Should show loading state
    await expect(page.getByText('生成中...')).toBeVisible();
  });

  test('should handle custom RPC URL', async ({ page }) => {
    await page.goto('/campaign/create');

    // Fill campaign details
    await page.getByLabel(/活动名称/).fill('Custom RPC Test');
    await page.getByLabel(/代币合约地址/).fill('0x1234567890123456789012345678901234567890');

    // Select custom network option
    await page.getByLabel(/选择区块链网络/).selectOption('custom');

    // Should show RPC URL input
    await expect(page.getByLabel(/RPC URL/)).toBeVisible();

    // Fill custom RPC URL
    await page.getByLabel(/RPC URL/).fill('https://custom-rpc.example.com');

    await takeScreenshot(page, 'campaign-custom-rpc');
  });

  test('should validate token address format', async ({ page }) => {
    await page.goto('/campaign/create');

    // Fill with invalid token address
    await page.getByLabel(/活动名称/).fill('Invalid Address Test');
    await page.getByLabel(/代币合约地址/).fill('invalid-address');

    // Should show validation error
    await expect(page.getByText(/请输入有效的代币合约地址/)).toBeVisible();
  });

  test('should display gas estimation information', async ({ page }) => {
    await page.goto('/campaign/create');

    // Complete all steps to reach deployment
    await page.getByLabel(/活动名称/).fill('Gas Estimation Test');
    await page.getByLabel(/代币合约地址/).fill('0x1234567890123456789012345678901234567890');
    await page.getByLabel(/选择区块链网络/).selectOption('ethereum');
    await page.getByText('下一步').click();

    await page.getByText('生成新钱包').click();
    await page.getByText('下一步').click();

    // Should show gas information
    await expect(page.getByText('Gas信息')).toBeVisible();
    await expect(page.getByText('部署成本')).toBeVisible();
  });
});