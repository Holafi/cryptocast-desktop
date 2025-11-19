import { test, expect, waitForPageLoad, takeScreenshot } from './your-test-helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await waitForPageLoad(authenticatedPage);
  });

  test('should display dashboard with campaign statistics', async ({ page }) => {
    await page.goto('/');

    // Wait for dashboard to load
    await expect(page.getByText('仪表盘')).toBeVisible();

    // Check for statistics cards
    await expect(page.getByText('总活动数')).toBeVisible();
    await expect(page.getByText('已完成')).toBeVisible();
    await expect(page.getByText('总收币地址')).toBeVisible();
    await expect(page.getByText('已发送')).toBeVisible();
    await expect(page.getByText('Gas消耗')).toBeVisible();

    await takeScreenshot(page, 'dashboard-loaded');
  });

  test('should show quick action buttons', async ({ page }) => {
    await page.goto('/');

    // Verify quick action buttons are visible
    await expect(page.getByText('创建新活动')).toBeVisible();
    await expect(page.getByText('查看历史')).toBeVisible();
    await expect(page.getByText('系统设置')).toBeVisible();
  });

  test('should display active campaigns section', async ({ page }) => {
    await page.goto('/');

    // Check for active campaigns section
    await expect(page.getByText('🚀 进行中的活动')).toBeVisible();

    // Should show view all button
    await expect(page.getByText('查看全部 →')).toBeVisible();
  });

  test('should display recent campaigns table', async ({ page }) => {
    await page.goto('/');

    // Check for recent campaigns section
    await expect(page.getByText('📋 最近活动')).toBeVisible();

    // Check table headers
    await expect(page.getByText('活动名称')).toBeVisible();
    await expect(page.getByText('状态')).toBeVisible();
    await expect(page.getByText('区块链')).toBeVisible();
    await expect(page.getByText('收币地址')).toBeVisible();
    await expect(page.getByText('创建时间')).toBeVisible();
    await expect(page.getByText('操作')).toBeVisible();
  });

  test('should navigate to create campaign', async ({ page }) => {
    await page.goto('/');

    // Click create new campaign button
    await page.getByText('创建新活动').first().click();

    // Should navigate to create page
    await expect(page.getByText('创建新活动')).toBeVisible();
    await expect(page.getByText('基本信息')).toBeVisible();
  });

  test('should navigate to history page', async ({ page }) => {
    await page.goto('/');

    // Click view history button
    await page.getByText('查看历史').click();

    // Should navigate to history page
    await expect(page.getByText('历史活动')).toBeVisible();
  });

  test('should show empty state when no campaigns', async ({ page, context }) => {
    // Mock empty campaign list
    await context.route('**/campaign/list', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/');

    // Should show empty state
    await expect(page.getByText('暂无进行中的活动')).toBeVisible();
    await expect(page.getByText('创建第一个活动')).toBeVisible();
  });

  test('should display campaign status badges correctly', async ({ page }) => {
    await page.goto('/');

    // Should show different status badges
    await expect(page.getByText('READY')).toBeVisible();
  });

  test('should display chain names correctly', async ({ page }) => {
    await page.goto('/');

    // Should show chain names
    await expect(page.getByText('Ethereum')).toBeVisible();
  });

  test('should show progress bars for campaigns with recipients', async ({ page }) => {
    await page.goto('/');

    // Look for progress indicators
    const progressBars = page.locator('[role="progressbar"], .bg-green-500');
    await expect(progressBars.first()).toBeVisible();
  });

  test('should handle responsive layout on mobile', async ({ page }) => {
    // Mock mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Should still show key elements on mobile
    await expect(page.getByText('仪表盘')).toBeVisible();
    await expect(page.getByText('总活动数')).toBeVisible();

    // Mobile should show different layout
    await takeScreenshot(page, 'dashboard-mobile');
  });
});