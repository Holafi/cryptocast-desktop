import fs from 'fs';
import path from 'path';
import os from 'os';

export function createTempTestDir(): string {
  const testDir = path.join(os.tmpdir(), `batch-airdrop-test-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

export function cleanupTempDir(testDir: string): void {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

export function createTestDatabasePath(testDir: string): string {
  return path.join(testDir, 'test.db');
}

export const mockEVMChain = {
  id: 1,
  type: 'evm' as const,
  chainId: 1,
  name: 'Ethereum Test',
  rpcUrl: 'https://mainnet.infura.io/v3/test',
  explorerUrl: 'https://etherscan.io',
  symbol: 'ETH',
  decimals: 18,
  enabled: true,
  isCustom: false
};

export const mockSolanaRPC = {
  id: 1,
  network: 'mainnet-beta' as const,
  name: 'Solana Mainnet Test',
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  priority: 1,
  enabled: true
};

export const mockCampaign = {
  id: 'test-campaign-1',
  name: 'Test Campaign',
  chain: 'ethereum',
  tokenAddress: '0x1234567890123456789012345678901234567890',
  status: 'CREATED' as const,
  totalRecipients: 100,
  completedRecipients: 0,
  walletAddress: '0x1234567890123456789012345678901234567890',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createMockPriceData(symbols: string[]): Record<string, number> {
  const prices: Record<string, number> = {};
  symbols.forEach(symbol => {
    prices[symbol] = Math.random() * 1000 + 100; // Random price between $100-$1100
  });
  return prices;
}

export function createMockGasPrice(network: string): any {
  return {
    network,
    gasPrice: (Math.random() * 100 + 20).toFixed(0), // 20-120 Gwei
    timestamp: new Date().toISOString()
  };
}