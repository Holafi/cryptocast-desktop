// Electron API types
export interface ElectronAPI {
  campaign: {
    create: (data: any) => Promise<Campaign>;
    list: (filters?: any) => Promise<Campaign[]>;
    getById: (id: string) => Promise<Campaign | null>;
    start: (id: string) => Promise<{ success: boolean }>;
    pause: (id: string) => Promise<{ success: boolean }>;
    onProgress: (callback: (data: ProgressData) => void) => void;
  };
  wallet: {
    create: () => Promise<{ address: string; encryptedKey: string }>;
    exportPrivateKey: (encryptedKey: string) => Promise<string>;
    exportKeystore: (encryptedKey: string, password: string) => Promise<string>;
    getBalance: (address: string, chain: string, tokenAddress?: string) => Promise<BalanceData>;
  };
  chain: {
    getEVMChains: (onlyEnabled?: boolean) => Promise<EVMChain[]>;
    addEVMChain: (chainData: any) => Promise<number>;
    updateEVMChain: (chainId: number, updates: any) => Promise<void>;
    deleteEVMChain: (chainId: number) => Promise<void>;
    testEVMLatency: (chainId: number) => Promise<{ latency: number; blockNumber: number }>;
    getSolanaRPCs: (network?: string, onlyEnabled?: boolean) => Promise<SolanaRPC[]>;
    getActiveSolanaRPC: (network: string) => Promise<SolanaRPC | null>;
    addSolanaRPC: (rpcData: any) => Promise<number>;
    testSolanaRPC: (rpcUrl: string) => Promise<{ success: boolean; latency?: number }>;
    updateSolanaRPCPriority: (id: number, priority: number) => Promise<void>;
    deleteSolanaRPC: (id: number) => Promise<void>;
    healthCheckSolanaRPCs: () => Promise<void>;
  };
  settings: {
    get: () => Promise<any>;
    update: (settings: any) => Promise<{ success: boolean }>;
  };
  file: {
    readCSV: (filePath: string) => Promise<any[]>;
    exportReport: (campaignId: string) => Promise<{ success: boolean; filePath: string }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Campaign types
export interface Campaign {
  id: string;
  name: string;
  chain: string;
  tokenAddress: string;
  status: 'CREATED' | 'READY' | 'SENDING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  totalRecipients: number;
  completedRecipients: number;
  walletAddress?: string;
  walletEncryptedKey?: string;
  contractAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressData {
  campaignId: string;
  current: number;
  total: number;
  percentage: number;
}

export interface BalanceData {
  native: string;
  token?: string;
}

// Chain types
export interface EVMChain {
  id?: number;
  type: 'evm';
  chainId: number;
  name: string;
  rpcUrl: string;
  rpcBackup?: string;
  explorerUrl: string;
  symbol: string;
  decimals: number;
  enabled: boolean;
  isCustom: boolean;
}

export interface SolanaRPC {
  id?: number;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  name: string;
  rpcUrl: string;
  wsUrl?: string;
  priority: number;
  latency?: number;
  uptime24h?: number;
  enabled: boolean;
}
