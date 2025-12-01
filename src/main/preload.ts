import { contextBridge, ipcRenderer } from 'electron';
import type {
  CreateCampaignRequest,
  CampaignFilters,
  Campaign,
  CampaignDetails,
  CampaignRecipient,
  Transaction,
  TransactionOptions,
  EstimateRequest,
  EstimateResponse,
  CampaignProgress
} from './types/ipc';

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 活动操作
  campaign: {
    create: (data: CreateCampaignRequest): Promise<string> => ipcRenderer.invoke('campaign:create', data),
    list: (filters?: CampaignFilters): Promise<Campaign[]> => ipcRenderer.invoke('campaign:list', filters),
    getById: (id: string): Promise<Campaign | null> => ipcRenderer.invoke('campaign:getById', id),
    start: (id: string): Promise<void> => ipcRenderer.invoke('campaign:start', id),
    pause: (id: string): Promise<void> => ipcRenderer.invoke('campaign:pause', id),
    resume: (id: string): Promise<void> => ipcRenderer.invoke('campaign:resume', id),
    updateStatus: (id: string, status: string): Promise<void> => ipcRenderer.invoke('campaign:updateStatus', id, status),
    getDetails: (id: string): Promise<CampaignDetails | null> => ipcRenderer.invoke('campaign:getDetails', id),
    getTransactions: (id: string, options?: TransactionOptions): Promise<Transaction[]> => ipcRenderer.invoke('campaign:getTransactions', id, options),
    getRecipients: (id: string): Promise<CampaignRecipient[]> => ipcRenderer.invoke('campaign:getRecipients', id),
    estimate: (request: EstimateRequest): Promise<EstimateResponse> => ipcRenderer.invoke('campaign:estimate', request),
    deployContract: (id: string): Promise<string> => ipcRenderer.invoke('campaign:deployContract', id),
    retryFailedTransactions: (id: string): Promise<void> => ipcRenderer.invoke('campaign:retryFailedTransactions', id),
    withdrawTokens: (campaignId: string, recipientAddress: string): Promise<string> => ipcRenderer.invoke('campaign:withdrawTokens', campaignId, recipientAddress),
    withdrawNative: (campaignId: string, recipientAddress: string): Promise<string> => ipcRenderer.invoke('campaign:withdrawNative', campaignId, recipientAddress),
    onProgress: (callback: (data: CampaignProgress) => void): void => {
      ipcRenderer.on('campaign:progress', (_event, data) => callback(data));
    },
  },

  // Solana操作
  solana: {
    getBalance: (rpcUrl: string, walletAddress: string, tokenAddress?: string): Promise<string> =>
      ipcRenderer.invoke('solana:getBalance', rpcUrl, walletAddress, tokenAddress),
    batchTransfer: (rpcUrl: string, privateKeyBase64: string, recipients: string[], amounts: string[], tokenAddress: string): Promise<unknown> =>
      ipcRenderer.invoke('solana:batchTransfer', rpcUrl, privateKeyBase64, recipients, amounts, tokenAddress),
    getTransactionStatus: (rpcUrl: string, transactionHash: string): Promise<unknown> =>
      ipcRenderer.invoke('solana:getTransactionStatus', rpcUrl, transactionHash),
    getTokenInfo: (rpcUrl: string, tokenAddress: string): Promise<unknown> =>
      ipcRenderer.invoke('solana:getTokenInfo', rpcUrl, tokenAddress),
  },

  // 钱包操作
  wallet: {
    create: (type?: 'evm' | 'solana'): Promise<unknown> => ipcRenderer.invoke('wallet:create', type),
    getBalance: (address: string, chain: string, tokenAddress?: string): Promise<string> =>
      ipcRenderer.invoke('wallet:getBalance', address, chain, tokenAddress),
    list: (options?: Record<string, unknown>): Promise<unknown[]> => ipcRenderer.invoke('wallet:list', options),
    getBalances: (campaignId: string): Promise<unknown> => ipcRenderer.invoke('wallet:getBalances', campaignId),
    exportEVMPrivateKey: (privateKeyBase64: string): Promise<string> => ipcRenderer.invoke('wallet:exportEVMPrivateKey', privateKeyBase64),
    exportSolanaPrivateKey: (privateKeyBase64: string): Promise<string> => ipcRenderer.invoke('wallet:exportSolanaPrivateKey', privateKeyBase64),
  },

  // 区块链操作
  blockchain: {
    getBalance: (address: string, chain: string, tokenAddress?: string): Promise<string> =>
      ipcRenderer.invoke('wallet:getBalance', address, chain, tokenAddress),
    estimateGas: (chain: string, fromAddress: string, toAddress: string, tokenAddress: string, recipientCount: number): Promise<string> =>
      ipcRenderer.invoke('blockchain:estimateGas', chain, fromAddress, toAddress, tokenAddress, recipientCount),
    getTransactionStatus: (txHash: string, chain: string): Promise<unknown> =>
      ipcRenderer.invoke('blockchain:getTransactionStatus', txHash, chain),
  },

  // 链管理
  chain: {
    getAllChains: (): Promise<unknown[]> =>
      ipcRenderer.invoke('chain:getAllChains'),
    getEVMChains: (): Promise<unknown[]> =>
      ipcRenderer.invoke('chain:getEVMChains'),
    addEVMChain: (chainData: Record<string, unknown>): Promise<number> =>
      ipcRenderer.invoke('chain:addEVMChain', chainData),
    updateEVMChain: (chainId: number, updates: Record<string, unknown>): Promise<void> =>
      ipcRenderer.invoke('chain:updateEVMChain', chainId, updates),
    deleteEVMChain: (chainId: number): Promise<void> =>
      ipcRenderer.invoke('chain:deleteEVMChain', chainId),
    testEVMLatency: (chainId: number): Promise<unknown> =>
      ipcRenderer.invoke('chain:testEVMLatency', chainId),
    getSolanaRPCs: (network?: string, onlyEnabled?: boolean): Promise<unknown[]> =>
      ipcRenderer.invoke('chain:getSolanaRPCs', network, onlyEnabled),
    addSolanaRPC: (rpcData: Record<string, unknown>): Promise<number> =>
      ipcRenderer.invoke('chain:addSolanaRPC', rpcData),
    testSolanaRPC: (rpcUrl: string): Promise<unknown> =>
      ipcRenderer.invoke('chain:testSolanaRPC', rpcUrl),
    updateSolanaRPCPriority: (id: number, priority: number): Promise<void> =>
      ipcRenderer.invoke('chain:updateSolanaRPCPriority', id, priority),
    deleteSolanaRPC: (id: number): Promise<void> =>
      ipcRenderer.invoke('chain:deleteSolanaRPC', id),
  },

  // 设置
  settings: {
    get: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('settings:get'),
    update: (settings: Record<string, unknown>): Promise<void> => ipcRenderer.invoke('settings:update', settings),
  },

  // 应用信息
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
    getLocale: (): Promise<string> => ipcRenderer.invoke('app:getLocale'),
  },

  // 文件操作
  file: {
    readCSV: (filePath: string): Promise<unknown> => ipcRenderer.invoke('file:readCSV', filePath),
    exportReport: (campaignId: string): Promise<string> =>
      ipcRenderer.invoke('file:exportReport', campaignId),
  },

  // 价格服务
  price: {
    getPrice: (symbol: string): Promise<number> => ipcRenderer.invoke('price:getPrice', symbol),
    getPrices: (symbols: string[]): Promise<Record<string, number>> => ipcRenderer.invoke('price:getPrices', symbols),
    getCachedPrices: (symbols: string[]): Promise<unknown> => ipcRenderer.invoke('price:getCachedPrices', symbols),
    getSummary: (): Promise<unknown> => ipcRenderer.invoke('price:getSummary'),
  },

  // 代币服务
  token: {
    getInfo: (tokenAddress: string, chainId: string): Promise<unknown> =>
      ipcRenderer.invoke('token:getInfo', tokenAddress, chainId),
    validateAddress: (tokenAddress: string, chainId: string): Promise<boolean> =>
      ipcRenderer.invoke('token:validateAddress', tokenAddress, chainId),
    getMultipleInfo: (tokenAddresses: string[], chainId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('token:getMultipleInfo', tokenAddresses, chainId),
  },
});
