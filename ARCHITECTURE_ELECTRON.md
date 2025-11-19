# Electron 桌面应用 - 技术架构设计

> 基于 Electron 的批量区块链奖励分发桌面应用

---

## 📐 架构总览

### 设计原则
1. **运营友好**: 图形界面，零技术门槛
2. **本地优先**: 数据和私钥本地存储，隐私安全
3. **轻量高效**: SQLite + 异步任务，流畅体验
4. **跨平台**: Windows、macOS、Linux 一套代码

---

## 🏗️ Electron 应用架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron 应用容器                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          渲染进程 (Renderer Process)                    │ │
│  │          Browser Window - React UI                     │ │
│  │                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │ │
│  │  │ Dashboard    │  │ Campaign     │  │  Settings   │  │ │
│  │  │  页面        │  │  Create      │  │   页面      │  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │ │
│  │                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │ │
│  │  │ Campaign     │  │ History      │  │  Wallet     │  │ │
│  │  │  Detail      │  │  页面        │  │  Manager    │  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │ │
│  │                                                         │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                  │
│                    IPC Communication                         │
│              (ipcRenderer ↔ ipcMain)                         │
│                           │                                  │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │          主进程 (Main Process)                          │ │
│  │          Node.js Backend                                │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │           IPC Handler (API层)                    │  │ │
│  │  │  - campaign.create()                             │  │ │
│  │  │  - campaign.start()                              │  │ │
│  │  │  - campaign.getProgress()                        │  │ │
│  │  │  - wallet.create()                               │  │ │
│  │  └────────────────────┬─────────────────────────────┘  │ │
│  │                       │                                 │ │
│  │  ┌────────────────────▼─────────────────────────────┐  │ │
│  │  │           核心业务服务                           │  │ │
│  │  │                                                  │  │ │
│  │  │  ┌──────────────┐      ┌──────────────┐        │  │ │
│  │  │  │ Campaign     │      │  Wallet      │        │  │ │
│  │  │  │  Service     │      │  Service     │        │  │ │
│  │  │  └──────────────┘      └──────────────┘        │  │ │
│  │  │                                                  │  │ │
│  │  │  ┌──────────────┐      ┌──────────────┐        │  │ │
│  │  │  │ Contract     │      │  Dispatcher  │        │  │ │
│  │  │  │  Service     │      │  Service     │        │  │ │
│  │  │  └──────────────┘      └──────────────┘        │  │ │
│  │  │                                                  │  │ │
│  │  │  ┌──────────────┐      ┌──────────────┐        │  │ │
│  │  │  │ Monitor      │      │  Blockchain  │        │  │ │
│  │  │  │  Service     │      │  Adapter     │        │  │ │
│  │  │  └──────────────┘      └──────────────┘        │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                       │                                 │ │
│  │  ┌────────────────────▼─────────────────────────────┐  │ │
│  │  │           数据持久化层                           │  │ │
│  │  │                                                  │  │ │
│  │  │  ┌──────────────────────────────────────────┐   │  │ │
│  │  │  │  SQLite Database (better-sqlite3)       │   │  │ │
│  │  │  │  - campaigns 表                         │   │  │ │
│  │  │  │  - recipients 表                        │   │  │ │
│  │  │  │  - transactions 表                      │   │  │ │
│  │  │  │  - settings 表                          │   │  │ │
│  │  │  └──────────────────────────────────────────┘   │  │ │
│  │  │                                                  │  │ │
│  │  │  ┌──────────────────────────────────────────┐   │  │ │
│  │  │  │  File System (加密文件)                  │   │  │ │
│  │  │  │  - 私钥加密存储                          │   │  │ │
│  │  │  │  - 导出报告                              │   │  │ │
│  │  │  └──────────────────────────────────────────┘   │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                ┌───────────▼────────────┐
                │   区块链网络            │
                │   - EVM Chains         │
                │   - Solana             │
                │   (通过 RPC)            │
                └────────────────────────┘
```

---

## 🧩 核心组件详细设计

### 1. 主进程 (Main Process)

主进程是 Electron 应用的核心，运行在 Node.js 环境中。

#### 1.1 入口文件

```typescript
// src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { Database } from './database';
import { setupIPCHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // 安全考虑
      contextIsolation: true,  // 启用上下文隔离
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset', // macOS 样式
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // 开发环境加载本地服务器
  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境加载打包后的文件
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  // 初始化数据库
  await Database.initialize();

  // 设置 IPC 处理器
  setupIPCHandlers();

  // 创建窗口
  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

#### 1.2 IPC 通信层

```typescript
// src/main/ipc/index.ts
import { ipcMain } from 'electron';
import { CampaignService } from '../services/CampaignService';
import { WalletService } from '../services/WalletService';

export function setupIPCHandlers() {
  const campaignService = new CampaignService();
  const walletService = new WalletService();
  const chainManagementService = new ChainManagementService(); // ⭐ 新

  // 活动相关
  ipcMain.handle('campaign:create', async (event, data) => {
    return await campaignService.create(data);
  });

  ipcMain.handle('campaign:list', async (event, filters) => {
    return await campaignService.list(filters);
  });

  ipcMain.handle('campaign:getById', async (event, id) => {
    return await campaignService.getById(id);
  });

  ipcMain.handle('campaign:start', async (event, id) => {
    return await campaignService.start(id);
  });

  ipcMain.handle('campaign:pause', async (event, id) => {
    return await campaignService.pause(id);
  });

  // 进度监听（使用事件发送）
  campaignService.on('progress', (data) => {
    event.sender.send('campaign:progress', data);
  });

  // 钱包相关
  ipcMain.handle('wallet:create', async (event) => {
    return await walletService.createCampaignWallet();
  });

  ipcMain.handle('wallet:exportPrivateKey', async (event, encryptedKey) => {
    return await walletService.exportPrivateKey(encryptedKey);
  });

  ipcMain.handle('wallet:exportKeystore', async (event, encryptedKey, password) => {
    return await walletService.exportKeystore(encryptedKey, password);
  });

  ipcMain.handle('wallet:getBalance', async (event, address, chain, tokenAddress) => {
    return await walletService.getBalance(address, chain, tokenAddress);
  });

  // 链管理相关 ⭐ 新
  // EVM链
  ipcMain.handle('chain:getEVMChains', async (event, onlyEnabled) => {
    return await chainManagementService.getEVMChains(onlyEnabled);
  });

  ipcMain.handle('chain:addEVMChain', async (event, chainData) => {
    return await chainManagementService.addCustomEVMChain(chainData);
  });

  ipcMain.handle('chain:updateEVMChain', async (event, chainId, updates) => {
    return await chainManagementService.updateEVMChain(chainId, updates);
  });

  ipcMain.handle('chain:deleteEVMChain', async (event, chainId) => {
    return await chainManagementService.deleteCustomEVMChain(chainId);
  });

  ipcMain.handle('chain:testEVMLatency', async (event, chainId) => {
    return await chainManagementService.testEVMChainLatency(chainId);
  });

  // Solana RPC
  ipcMain.handle('chain:getSolanaRPCs', async (event, network, onlyEnabled) => {
    return await chainManagementService.getSolanaRPCs(network, onlyEnabled);
  });

  ipcMain.handle('chain:getActiveSolanaRPC', async (event, network) => {
    return await chainManagementService.getActiveSolanaRPC(network);
  });

  ipcMain.handle('chain:addSolanaRPC', async (event, rpcData) => {
    return await chainManagementService.addSolanaRPC(rpcData);
  });

  ipcMain.handle('chain:testSolanaRPC', async (event, rpcUrl) => {
    return await chainManagementService.testSolanaRPC(rpcUrl);
  });

  ipcMain.handle('chain:updateSolanaRPCPriority', async (event, id, priority) => {
    return await chainManagementService.updateSolanaRPCPriority(id, priority);
  });

  ipcMain.handle('chain:deleteSolanaRPC', async (event, id) => {
    return await chainManagementService.deleteSolanaRPC(id);
  });

  ipcMain.handle('chain:healthCheckSolanaRPCs', async (event) => {
    return await chainManagementService.healthCheckAllSolanaRPCs();
  });

  // 设置相关
  ipcMain.handle('settings:get', async (event) => {
    return await settingsService.getAll();
  });

  ipcMain.handle('settings:update', async (event, settings) => {
    return await settingsService.update(settings);
  });

  // 文件操作
  ipcMain.handle('file:readCSV', async (event, filePath) => {
    return await fileService.parseCSV(filePath);
  });

  ipcMain.handle('file:exportReport', async (event, campaignId) => {
    return await reportService.export(campaignId);
  });
}
```

#### 1.3 Preload 脚本（安全桥接）

```typescript
// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 活动操作
  campaign: {
    create: (data: any) => ipcRenderer.invoke('campaign:create', data),
    list: (filters?: any) => ipcRenderer.invoke('campaign:list', filters),
    getById: (id: string) => ipcRenderer.invoke('campaign:getById', id),
    start: (id: string) => ipcRenderer.invoke('campaign:start', id),
    pause: (id: string) => ipcRenderer.invoke('campaign:pause', id),
    onProgress: (callback: any) => {
      ipcRenderer.on('campaign:progress', (event, data) => callback(data));
    }
  },

  // 钱包操作
  wallet: {
    create: () => ipcRenderer.invoke('wallet:create'),
    exportPrivateKey: (encryptedKey: string) => ipcRenderer.invoke('wallet:exportPrivateKey', encryptedKey),
    exportKeystore: (encryptedKey: string, password: string) => ipcRenderer.invoke('wallet:exportKeystore', encryptedKey, password),
    getBalance: (address: string, chain: string, tokenAddress?: string) => ipcRenderer.invoke('wallet:getBalance', address, chain, tokenAddress)
  },

  // 链管理 ⭐ 新
  chain: {
    // EVM链
    getEVMChains: (onlyEnabled?: boolean) => ipcRenderer.invoke('chain:getEVMChains', onlyEnabled),
    addEVMChain: (chainData: any) => ipcRenderer.invoke('chain:addEVMChain', chainData),
    updateEVMChain: (chainId: number, updates: any) => ipcRenderer.invoke('chain:updateEVMChain', chainId, updates),
    deleteEVMChain: (chainId: number) => ipcRenderer.invoke('chain:deleteEVMChain', chainId),
    testEVMLatency: (chainId: number) => ipcRenderer.invoke('chain:testEVMLatency', chainId),

    // Solana RPC
    getSolanaRPCs: (network?: string, onlyEnabled?: boolean) => ipcRenderer.invoke('chain:getSolanaRPCs', network, onlyEnabled),
    getActiveSolanaRPC: (network: string) => ipcRenderer.invoke('chain:getActiveSolanaRPC', network),
    addSolanaRPC: (rpcData: any) => ipcRenderer.invoke('chain:addSolanaRPC', rpcData),
    testSolanaRPC: (rpcUrl: string) => ipcRenderer.invoke('chain:testSolanaRPC', rpcUrl),
    updateSolanaRPCPriority: (id: number, priority: number) => ipcRenderer.invoke('chain:updateSolanaRPCPriority', id, priority),
    deleteSolanaRPC: (id: number) => ipcRenderer.invoke('chain:deleteSolanaRPC', id),
    healthCheckSolanaRPCs: () => ipcRenderer.invoke('chain:healthCheckSolanaRPCs')
  },

  // 设置
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings)
  },

  // 文件操作
  file: {
    readCSV: (filePath: string) => ipcRenderer.invoke('file:readCSV', filePath),
    exportReport: (campaignId: string) => ipcRenderer.invoke('file:exportReport', campaignId)
  }
});
```

---

### 2. 数据库设计 (SQLite)

#### 2.1 数据库初始化

```typescript
// src/main/database/index.ts
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

const DB_PATH = path.join(app.getPath('userData'), 'airdrop.db');

export class DB {
  private static db: Database.Database;

  static initialize() {
    this.db = new Database(DB_PATH);

    // 创建表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        chain TEXT NOT NULL,
        token_address TEXT NOT NULL,
        token_symbol TEXT,
        token_decimals INTEGER,

        status TEXT NOT NULL DEFAULT 'CREATED',

        wallet_address TEXT,
        wallet_encrypted_key TEXT,

        contract_address TEXT,
        contract_deploy_tx TEXT,

        total_recipients INTEGER NOT NULL,
        total_amount TEXT NOT NULL,
        completed_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,

        created_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS recipients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT NOT NULL,
        address TEXT NOT NULL,
        amount TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        tx_hash TEXT,
        error TEXT,
        created_at INTEGER NOT NULL,

        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        UNIQUE(campaign_id, address)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT NOT NULL,
        tx_hash TEXT NOT NULL,
        tx_type TEXT,
        gas_used TEXT,
        gas_price TEXT,
        status TEXT,
        created_at INTEGER NOT NULL,
        confirmed_at INTEGER,

        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_campaign_status ON campaigns(status);
      CREATE INDEX IF NOT EXISTS idx_recipient_campaign ON recipients(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_recipient_status ON recipients(status);
      CREATE INDEX IF NOT EXISTS idx_transaction_campaign ON transactions(campaign_id);
    `);

    console.log('Database initialized at:', DB_PATH);
  }

  static getDB() {
    return this.db;
  }

  static close() {
    this.db.close();
  }
}
```

#### 2.2 数据访问层

```typescript
// src/main/database/repositories/CampaignRepository.ts
import { DB } from '../index';
import { v4 as uuidv4 } from 'uuid';

export class CampaignRepository {
  private db = DB.getDB();

  create(data: CreateCampaignDTO): Campaign {
    const id = uuidv4();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO campaigns (
        id, name, chain, token_address, token_symbol, token_decimals,
        total_recipients, total_amount, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.chain,
      data.tokenAddress,
      data.tokenSymbol,
      data.tokenDecimals,
      data.recipients.length,
      data.totalAmount,
      now
    );

    // 插入收件人
    const recipientStmt = this.db.prepare(`
      INSERT INTO recipients (campaign_id, address, amount, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((recipients) => {
      for (const r of recipients) {
        recipientStmt.run(id, r.address, r.amount, now);
      }
    });

    insertMany(data.recipients);

    return this.findById(id)!;
  }

  findById(id: string): Campaign | undefined {
    const stmt = this.db.prepare('SELECT * FROM campaigns WHERE id = ?');
    return stmt.get(id) as Campaign;
  }

  list(filters?: { status?: string; chain?: string }): Campaign[] {
    let query = 'SELECT * FROM campaigns WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.chain) {
      query += ' AND chain = ?';
      params.push(filters.chain);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Campaign[];
  }

  updateStatus(id: string, status: string) {
    const stmt = this.db.prepare('UPDATE campaigns SET status = ? WHERE id = ?');
    stmt.run(status, id);
  }

  incrementCompleted(id: string, count: number = 1) {
    const stmt = this.db.prepare(`
      UPDATE campaigns SET completed_count = completed_count + ? WHERE id = ?
    `);
    stmt.run(count, id);
  }

  getStats(id: string) {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
      FROM recipients
      WHERE campaign_id = ?
    `);

    return stmt.get(id);
  }
}
```

---

### 3. 核心业务服务

#### 3.1 活动管理服务

```typescript
// src/main/services/CampaignService.ts
import { EventEmitter } from 'events';
import { CampaignRepository } from '../database/repositories/CampaignRepository';
import { WalletService } from './WalletService';
import { ContractService } from './ContractService';
import { DispatcherService } from './DispatcherService';

export class CampaignService extends EventEmitter {
  private campaignRepo = new CampaignRepository();
  private walletService = new WalletService();
  private contractService = new ContractService();
  private dispatcherService = new DispatcherService();

  async create(data: CreateCampaignDTO): Promise<Campaign> {
    // 1. 创建活动记录
    const campaign = this.campaignRepo.create(data);

    // 2. 创建独立钱包
    const wallet = await this.walletService.createCampaignWallet();

    // 3. 更新活动
    this.campaignRepo.update(campaign.id, {
      walletAddress: wallet.address,
      walletEncryptedKey: wallet.encryptedKey,
      status: 'WALLET_CREATED'
    });

    return this.campaignRepo.findById(campaign.id)!;
  }

  async start(campaignId: string): Promise<void> {
    const campaign = this.campaignRepo.findById(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // 状态机验证
    if (campaign.status !== 'WALLET_READY' && campaign.status !== 'CONTRACT_DEPLOYED') {
      throw new Error(`Cannot start campaign in status: ${campaign.status}`);
    }

    // 更新状态
    this.campaignRepo.updateStatus(campaignId, 'SENDING');

    // 启动发送任务（异步）
    this.dispatcherService.startCampaign(campaign).catch(error => {
      console.error('Campaign failed:', error);
      this.campaignRepo.updateStatus(campaignId, 'FAILED');
      this.emit('campaign:failed', { campaignId, error });
    });
  }

  async getProgress(campaignId: string) {
    const campaign = this.campaignRepo.findById(campaignId);
    const stats = this.campaignRepo.getStats(campaignId);

    return {
      campaign,
      stats,
      percentage: (stats.completed / campaign.total_recipients) * 100
    };
  }

  list(filters?: any) {
    return this.campaignRepo.list(filters);
  }

  getById(id: string) {
    return this.campaignRepo.findById(id);
  }
}
```

#### 3.2 钱包管理服务

```typescript
// src/main/services/WalletService.ts
import { ethers } from 'ethers';
import crypto from 'crypto';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export class WalletService {
  private algorithm = 'aes-256-gcm';
  private masterKey: Buffer;

  constructor() {
    // 从配置文件读取或首次生成主密钥
    this.masterKey = this.loadOrCreateMasterKey();
  }

  private loadOrCreateMasterKey(): Buffer {
    const keyPath = path.join(app.getPath('userData'), '.masterkey');

    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath);
    } else {
      // 首次运行，生成主密钥
      const key = crypto.randomBytes(32);
      fs.writeFileSync(keyPath, key, { mode: 0o600 }); // 仅所有者可读写
      return key;
    }
  }

  async createCampaignWallet(): Promise<{ address: string; encryptedKey: string }> {
    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = this.encryptPrivateKey(wallet.privateKey);

    return {
      address: wallet.address,
      encryptedKey
    };
  }

  async getWallet(encryptedKey: string): Promise<ethers.Wallet> {
    const privateKey = this.decryptPrivateKey(encryptedKey);
    return new ethers.Wallet(privateKey);
  }

  /**
   * 导出活动钱包私钥（明文）⭐ 新增
   */
  async exportPrivateKey(encryptedKey: string): Promise<string> {
    return this.decryptPrivateKey(encryptedKey);
  }

  /**
   * 导出为 Keystore JSON 格式 ⭐ 新增
   */
  async exportKeystore(encryptedKey: string, password: string): Promise<string> {
    const wallet = await this.getWallet(encryptedKey);
    return await wallet.encrypt(password);
  }

  /**
   * 查询钱包余额 ⭐ 新增
   */
  async getBalance(address: string, chain: string, tokenAddress?: string): Promise<{
    native: string;
    token?: string;
  }> {
    const provider = getProvider(chain);

    // 原生代币余额
    const nativeBalance = await provider.getBalance(address);

    let tokenBalance;
    if (tokenAddress) {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      tokenBalance = await tokenContract.balanceOf(address);
    }

    return {
      native: ethers.formatEther(nativeBalance),
      token: tokenBalance ? ethers.formatUnits(tokenBalance, 18) : undefined
    };
  }

  private encryptPrivateKey(privateKey: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(privateKey, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, authTag, encrypted]);

    return combined.toString('base64');
  }

  private decryptPrivateKey(encryptedKey: string): string {
    const combined = Buffer.from(encryptedKey, 'base64');

    const iv = combined.subarray(0, 16);
    const authTag = combined.subarray(16, 32);
    const encrypted = combined.subarray(32);

    const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
    decipher.setAuthTag(authTag);

    const privateKey = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString('utf8');

    return privateKey;
  }

}
```

#### 3.3 发送调度服务

```typescript
// src/main/services/DispatcherService.ts
import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { WalletService } from './WalletService';
import { ContractService } from './ContractService';
import { getProvider } from '../utils/providers';

export class DispatcherService extends EventEmitter {
  private walletService = new WalletService();
  private contractService = new ContractService();

  async startCampaign(campaign: Campaign) {
    try {
      // 1. 部署合约（如果未部署）
      if (!campaign.contract_address) {
        await this.deployContract(campaign);
      }

      // 2. 加载收件人
      const recipients = await this.loadRecipients(campaign.id);

      // 3. 分批发送
      const batches = this.splitIntoBatches(recipients, 100);

      for (let i = 0; i < batches.length; i++) {
        await this.sendBatch(campaign, batches[i], i);

        // 发送进度事件
        this.emit('progress', {
          campaignId: campaign.id,
          current: (i + 1) * 100,
          total: recipients.length,
          percentage: ((i + 1) / batches.length) * 100
        });
      }

      // 4. 完成
      this.emit('campaign:completed', { campaignId: campaign.id });

    } catch (error) {
      this.emit('campaign:failed', { campaignId: campaign.id, error });
      throw error;
    }
  }

  private async deployContract(campaign: Campaign) {
    const wallet = await this.walletService.getWallet(campaign.wallet_encrypted_key);
    const provider = getProvider(campaign.chain);

    const contractAddress = await this.contractService.deploy(
      campaign.token_address,
      wallet.connect(provider)
    );

    // 更新数据库
    campaignRepo.update(campaign.id, {
      contract_address: contractAddress,
      status: 'CONTRACT_DEPLOYED'
    });
  }

  private async sendBatch(campaign: Campaign, batch: Recipient[], index: number) {
    const wallet = await this.walletService.getWallet(campaign.wallet_encrypted_key);
    const provider = getProvider(campaign.chain);
    const contract = this.contractService.getContract(campaign.contract_address, wallet.connect(provider));

    const addresses = batch.map(r => r.address);
    const amounts = batch.map(r => r.amount);

    // 发送交易
    const tx = await contract.batchTransfer(addresses, amounts, {
      gasLimit: 5000000
    });

    await tx.wait();

    // 更新数据库
    for (const recipient of batch) {
      recipientRepo.updateStatus(recipient.id, 'COMPLETED', tx.hash);
    }

    campaignRepo.incrementCompleted(campaign.id, batch.length);
  }

  private splitIntoBatches(items: any[], size: number) {
    const batches = [];
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }

  private async loadRecipients(campaignId: string) {
    const db = DB.getDB();
    const stmt = db.prepare(`
      SELECT * FROM recipients WHERE campaign_id = ? AND status = 'PENDING'
    `);
    return stmt.all(campaignId);
  }
}
```

#### 3.4 ChainManagementService ⭐ 新

链和RPC管理服务，负责EVM链和Solana RPC节点的配置、测试、切换。

```typescript
// src/main/services/ChainManagementService.ts
import { ethers } from 'ethers';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { DB } from '../database/db';

interface EVMChain {
  id?: number;
  type: 'evm';
  chain_id: number;
  name: string;
  rpc_url: string;
  rpc_backup?: string;
  explorer_url: string;
  symbol: string;
  decimals: number;
  enabled: boolean;
  is_custom: boolean;
}

interface SolanaRPC {
  id?: number;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  name: string;
  rpc_url: string;
  ws_url?: string;
  priority: number;
  latency?: number;
  uptime_24h?: number;
  enabled: boolean;
}

export class ChainManagementService {
  private db = DB.getDB();

  // ============ EVM链管理 ============

  /**
   * 获取所有EVM链（内置+自定义）
   */
  async getEVMChains(onlyEnabled = false): Promise<EVMChain[]> {
    const query = onlyEnabled
      ? `SELECT * FROM chains WHERE type = 'evm' AND enabled = 1`
      : `SELECT * FROM chains WHERE type = 'evm'`;

    const stmt = this.db.prepare(query);
    return stmt.all() as EVMChain[];
  }

  /**
   * 添加自定义EVM链
   */
  async addCustomEVMChain(chain: Omit<EVMChain, 'id' | 'is_custom'>): Promise<number> {
    // 1. 验证Chain ID是否匹配
    const verified = await this.verifyEVMChain(chain.rpc_url, chain.chain_id);
    if (!verified) {
      throw new Error('Chain ID不匹配或RPC无法连接');
    }

    // 2. 检查是否已存在
    const existing = this.db.prepare(
      `SELECT id FROM chains WHERE type = 'evm' AND chain_id = ?`
    ).get(chain.chain_id);

    if (existing) {
      throw new Error(`Chain ID ${chain.chain_id} 已存在`);
    }

    // 3. 插入数据库
    const stmt = this.db.prepare(`
      INSERT INTO chains (type, chain_id, name, rpc_url, rpc_backup, explorer_url, symbol, decimals, enabled, is_custom, created_at)
      VALUES ('evm', ?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'))
    `);

    const result = stmt.run(
      chain.chain_id,
      chain.name,
      chain.rpc_url,
      chain.rpc_backup || null,
      chain.explorer_url,
      chain.symbol,
      chain.decimals
    );

    return result.lastInsertRowid as number;
  }

  /**
   * 验证EVM链配置
   */
  private async verifyEVMChain(rpcUrl: string, expectedChainId: number): Promise<boolean> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const network = await provider.getNetwork();
      return Number(network.chainId) === expectedChainId;
    } catch (error) {
      return false;
    }
  }

  /**
   * 测试EVM链RPC延迟
   */
  async testEVMChainLatency(chainId: number): Promise<{ latency: number; blockNumber: number }> {
    const chain = this.db.prepare(
      `SELECT rpc_url FROM chains WHERE type = 'evm' AND chain_id = ?`
    ).get(chainId) as EVMChain;

    if (!chain) {
      throw new Error(`Chain ID ${chainId} 不存在`);
    }

    const startTime = Date.now();
    const provider = new ethers.JsonRpcProvider(chain.rpc_url);
    const blockNumber = await provider.getBlockNumber();
    const latency = Date.now() - startTime;

    return { latency, blockNumber };
  }

  /**
   * 更新EVM链配置
   */
  async updateEVMChain(chainId: number, updates: Partial<EVMChain>): Promise<void> {
    const allowedFields = ['name', 'rpc_url', 'rpc_backup', 'explorer_url', 'enabled'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

    if (fields.length === 0) return;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f as keyof EVMChain]);

    const stmt = this.db.prepare(
      `UPDATE chains SET ${setClause} WHERE type = 'evm' AND chain_id = ?`
    );

    stmt.run(...values, chainId);
  }

  /**
   * 删除自定义EVM链
   */
  async deleteCustomEVMChain(chainId: number): Promise<void> {
    const stmt = this.db.prepare(
      `DELETE FROM chains WHERE type = 'evm' AND chain_id = ? AND is_custom = 1`
    );
    const result = stmt.run(chainId);

    if (result.changes === 0) {
      throw new Error('链不存在或不可删除（内置链不能删除）');
    }
  }

  // ============ Solana RPC管理 ============

  /**
   * 获取Solana RPC节点列表
   */
  async getSolanaRPCs(network?: string, onlyEnabled = false): Promise<SolanaRPC[]> {
    let query = `SELECT * FROM solana_rpcs`;
    const params: any[] = [];

    if (network) {
      query += ` WHERE network = ?`;
      params.push(network);
    }

    if (onlyEnabled) {
      query += network ? ` AND enabled = 1` : ` WHERE enabled = 1`;
    }

    query += ` ORDER BY priority ASC, latency ASC`;

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as SolanaRPC[];
  }

  /**
   * 获取当前优先级最高的可用Solana RPC
   */
  async getActiveSolanaRPC(network: string): Promise<SolanaRPC | null> {
    const rpcs = await this.getSolanaRPCs(network, true);

    // 按优先级尝试连接
    for (const rpc of rpcs) {
      try {
        const connection = new Connection(rpc.rpc_url, 'confirmed');
        await connection.getSlot(); // 测试连接
        return rpc;
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  /**
   * 添加Solana RPC节点
   */
  async addSolanaRPC(rpc: Omit<SolanaRPC, 'id'>): Promise<number> {
    // 测试连接
    const testResult = await this.testSolanaRPC(rpc.rpc_url);
    if (!testResult.success) {
      throw new Error('无法连接到Solana RPC节点');
    }

    const stmt = this.db.prepare(`
      INSERT INTO solana_rpcs (network, name, rpc_url, ws_url, priority, latency, uptime_24h, enabled, last_checked)
      VALUES (?, ?, ?, ?, ?, ?, 100, 1, datetime('now'))
    `);

    const result = stmt.run(
      rpc.network,
      rpc.name,
      rpc.rpc_url,
      rpc.ws_url || null,
      rpc.priority,
      testResult.latency
    );

    return result.lastInsertRowid as number;
  }

  /**
   * 测试Solana RPC连接
   */
  async testSolanaRPC(rpcUrl: string): Promise<{
    success: boolean;
    latency?: number;
    slot?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const connection = new Connection(rpcUrl, 'confirmed');
      const slot = await connection.getSlot();
      const latency = Date.now() - startTime;

      return { success: true, latency, slot };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 更新Solana RPC优先级
   */
  async updateSolanaRPCPriority(id: number, priority: number): Promise<void> {
    const stmt = this.db.prepare(
      `UPDATE solana_rpcs SET priority = ? WHERE id = ?`
    );
    stmt.run(priority, id);
  }

  /**
   * 删除Solana RPC节点
   */
  async deleteSolanaRPC(id: number): Promise<void> {
    const stmt = this.db.prepare(`DELETE FROM solana_rpcs WHERE id = ?`);
    const result = stmt.run(id);

    if (result.changes === 0) {
      throw new Error('RPC节点不存在');
    }
  }

  /**
   * 健康检查所有Solana RPC（后台任务）
   */
  async healthCheckAllSolanaRPCs(): Promise<void> {
    const rpcs = await this.getSolanaRPCs();

    for (const rpc of rpcs) {
      const result = await this.testSolanaRPC(rpc.rpc_url);

      const stmt = this.db.prepare(`
        UPDATE solana_rpcs
        SET latency = ?, last_checked = datetime('now')
        WHERE id = ?
      `);

      stmt.run(result.success ? result.latency : null, rpc.id);
    }
  }
}
```

---

### 4. 渲染进程 (React UI)

#### 4.1 项目结构

```
src/renderer/
├── main.tsx              # 入口文件
├── App.tsx               # 根组件
├── pages/                # 页面组件
│   ├── Dashboard.tsx
│   ├── CampaignCreate.tsx
│   ├── CampaignDetail.tsx
│   ├── History.tsx
│   └── Settings.tsx
├── components/           # 通用组件
│   ├── CampaignCard.tsx
│   ├── ProgressBar.tsx
│   ├── AddressUploader.tsx
│   └── ChainSelector.tsx
├── hooks/                # 自定义 Hooks
│   ├── useCampaigns.ts
│   ├── useProgress.ts
│   └── useWallet.ts
├── types/                # TypeScript 类型
│   └── index.ts
└── styles/               # 样式文件
    └── globals.css
```

#### 4.2 React Hooks封装

```typescript
// src/renderer/hooks/useCampaigns.ts
import { useState, useEffect } from 'react';

export function useCampaigns(filters?: any) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, [filters]);

  async function loadCampaigns() {
    setLoading(true);
    const data = await window.electronAPI.campaign.list(filters);
    setCampaigns(data);
    setLoading(false);
  }

  async function createCampaign(data: any) {
    const campaign = await window.electronAPI.campaign.create(data);
    setCampaigns(prev => [campaign, ...prev]);
    return campaign;
  }

  async function startCampaign(id: string) {
    await window.electronAPI.campaign.start(id);
    await loadCampaigns();
  }

  return {
    campaigns,
    loading,
    createCampaign,
    startCampaign,
    refresh: loadCampaigns
  };
}
```

```typescript
// src/renderer/hooks/useProgress.ts
import { useState, useEffect } from 'react';

export function useProgress(campaignId: string) {
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });

  useEffect(() => {
    // 监听进度更新
    const unsubscribe = window.electronAPI.campaign.onProgress((data) => {
      if (data.campaignId === campaignId) {
        setProgress(data);
      }
    });

    return unsubscribe;
  }, [campaignId]);

  return progress;
}
```

#### 4.3 UI组件示例

```typescript
// src/renderer/pages/Dashboard.tsx
import React from 'react';
import { useCampaigns } from '../hooks/useCampaigns';
import { CampaignCard } from '../components/CampaignCard';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { campaigns, loading } = useCampaigns({ status: 'SENDING' });
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">批量发奖工具</h1>
        <Button onClick={() => navigate('/create')}>
          + 新建活动
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="总活动数" value="42" />
        <StatCard title="成功发送" value="18,523" />
        <StatCard title="总消耗 Gas" value="0.45 ETH" />
      </div>

      {/* 活动列表 */}
      <div className="space-y-4">
        {loading ? (
          <div>加载中...</div>
        ) : (
          campaigns.map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))
        )}
      </div>
    </div>
  );
}
```

```typescript
// src/renderer/components/CampaignCard.tsx
import React from 'react';
import { useProgress } from '../hooks/useProgress';

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const progress = useProgress(campaign.id);

  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{campaign.name}</h3>
          <p className="text-sm text-gray-500">
            {campaign.chain} · {campaign.token_symbol}
          </p>
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      {campaign.status === 'SENDING' && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>进度</span>
            <span>{progress.percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {progress.current} / {progress.total}
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="outline">查看详情</Button>
        {campaign.status === 'SENDING' && (
          <Button size="sm" variant="ghost">暂停</Button>
        )}
      </div>
    </div>
  );
}
```

---

## 📦 打包和分发

### 使用 electron-builder

```json
// package.json
{
  "name": "batch-airdrop",
  "version": "1.0.0",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite & electron .",
    "build": "tsc && vite build && electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.airdrop.app",
    "productName": "批量发奖工具",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*"
    ],
    "mac": {
      "target": ["dmg", "zip"],
      "icon": "assets/icon.icns",
      "category": "public.app-category.utilities"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "assets/icon.png",
      "category": "Utility"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true
    }
  }
}
```

### 自动更新（可选）

```typescript
// src/main/updater.ts
import { autoUpdater } from 'electron-updater';

export function setupAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    // 通知用户有新版本
  });

  autoUpdater.on('update-downloaded', () => {
    // 提示用户重启安装
  });
}
```

---

## 🔒 安全性

### 1. 私钥安全
- 主密钥存储在用户目录，权限600（仅所有者可读写）
- 私钥使用 AES-256-GCM 加密
- 内存中的私钥使用后立即清除

### 2. 代码签名
- macOS: 使用 Apple Developer 证书签名
- Windows: 使用 Authenticode 证书
- 防止被操作系统标记为恶意软件

### 3. 上下文隔离
- 启用 `contextIsolation`
- 使用 Preload 脚本暴露安全 API
- 禁用 `nodeIntegration`

---

## 📊 数据存储位置

### 各平台数据目录

```typescript
// Windows
C:\Users\<username>\AppData\Roaming\batch-airdrop\
├── airdrop.db          # SQLite 数据库
├── .masterkey          # 主密钥
└── logs/               # 日志文件

// macOS
~/Library/Application Support/batch-airdrop/
├── airdrop.db
├── .masterkey
└── logs/

// Linux
~/.config/batch-airdrop/
├── airdrop.db
├── .masterkey
└── logs/
```

---

## 🎨 UI/UX 设计原则

1. **简洁直观**: 运营人员零学习成本
2. **实时反馈**: 进度条、状态更新、桌面通知
3. **错误友好**: 清晰的错误提示和恢复建议
4. **响应式**: 适配不同窗口大小
5. **本地化**: 支持中文界面

---

## 📈 性能优化

1. **数据库索引**: 为常用查询添加索引
2. **虚拟列表**: 大量数据使用虚拟滚动
3. **异步任务**: 发送任务在后台执行
4. **内存管理**: 及时释放不用的资源

---

## 🧪 测试策略

1. **单元测试**: 核心业务逻辑
2. **集成测试**: IPC 通信、数据库操作
3. **E2E 测试**: Playwright 自动化测试
4. **手动测试**: 完整用户流程

---

## 总结

这个 Electron 架构设计提供了：

✅ **本地运行**: 无需服务器，数据本地存储
✅ **图形界面**: 运营人员友好
✅ **跨平台**: Windows/macOS/Linux 一套代码
✅ **安全可靠**: 私钥加密、事务保证
✅ **易于分发**: 打包成安装包，一键安装

**开发周期**: 4-6周完整版
**运行成本**: $0 服务器 + RPC调用费用

下一步：开始项目初始化和UI设计！
