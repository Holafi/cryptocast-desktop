import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 活动操作
  campaign: {
    create: (data: any) => ipcRenderer.invoke('campaign:create', data),
    list: (filters?: any) => ipcRenderer.invoke('campaign:list', filters),
    getById: (id: string) => ipcRenderer.invoke('campaign:getById', id),
    start: (id: string) => ipcRenderer.invoke('campaign:start', id),
    pause: (id: string) => ipcRenderer.invoke('campaign:pause', id),
    onProgress: (callback: any) => {
      ipcRenderer.on('campaign:progress', (_event, data) => callback(data));
    },
  },

  // 钱包操作
  wallet: {
    create: () => ipcRenderer.invoke('wallet:create'),
    exportPrivateKey: (encryptedKey: string) =>
      ipcRenderer.invoke('wallet:exportPrivateKey', encryptedKey),
    exportKeystore: (encryptedKey: string, password: string) =>
      ipcRenderer.invoke('wallet:exportKeystore', encryptedKey, password),
    getBalance: (address: string, chain: string, tokenAddress?: string) =>
      ipcRenderer.invoke('wallet:getBalance', address, chain, tokenAddress),
  },

  // 链管理
  chain: {
    getEVMChains: (onlyEnabled?: boolean) =>
      ipcRenderer.invoke('chain:getEVMChains', onlyEnabled),
    addEVMChain: (chainData: any) =>
      ipcRenderer.invoke('chain:addEVMChain', chainData),
    updateEVMChain: (chainId: number, updates: any) =>
      ipcRenderer.invoke('chain:updateEVMChain', chainId, updates),
    deleteEVMChain: (chainId: number) =>
      ipcRenderer.invoke('chain:deleteEVMChain', chainId),
    testEVMLatency: (chainId: number) =>
      ipcRenderer.invoke('chain:testEVMLatency', chainId),
    getSolanaRPCs: (network?: string, onlyEnabled?: boolean) =>
      ipcRenderer.invoke('chain:getSolanaRPCs', network, onlyEnabled),
    getActiveSolanaRPC: (network: string) =>
      ipcRenderer.invoke('chain:getActiveSolanaRPC', network),
    addSolanaRPC: (rpcData: any) =>
      ipcRenderer.invoke('chain:addSolanaRPC', rpcData),
    testSolanaRPC: (rpcUrl: string) =>
      ipcRenderer.invoke('chain:testSolanaRPC', rpcUrl),
    updateSolanaRPCPriority: (id: number, priority: number) =>
      ipcRenderer.invoke('chain:updateSolanaRPCPriority', id, priority),
    deleteSolanaRPC: (id: number) =>
      ipcRenderer.invoke('chain:deleteSolanaRPC', id),
    healthCheckSolanaRPCs: () =>
      ipcRenderer.invoke('chain:healthCheckSolanaRPCs'),
  },

  // 设置
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
  },

  // 文件操作
  file: {
    readCSV: (filePath: string) => ipcRenderer.invoke('file:readCSV', filePath),
    exportReport: (campaignId: string) =>
      ipcRenderer.invoke('file:exportReport', campaignId),
  },
});
