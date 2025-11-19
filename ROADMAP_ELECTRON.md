# Electron 桌面应用 - 实施路线图

> 区块链批量发奖工具桌面版开发计划

---

## 📋 项目概览

### 产品形态
Electron 跨平台桌面应用，支持 Windows、macOS、Linux

### 时间线
- **Week 1**: 项目搭建 + 基础框架
- **Week 2**: 核心功能（钱包 + 活动管理）
- **Week 3**: 发送逻辑 + 合约集成
- **Week 4**: UI 完善 + 监控面板
- **Week 5**: 多链支持 + Solana
- **Week 6**: 打包测试 + 优化

**总周期**: 6周到生产可用版本

### 团队配置
- **全栈开发**: 1-2人（熟悉React + Node.js）
- **智能合约**: 1人（兼职,合约部分）
- **UI/UX**: 0.5人（可选，或使用组件库）

---

## 🚀 Week 1: 项目搭建 + 基础框架

### 目标
搭建 Electron + React + TypeScript 项目，完成基础架构和数据库。

### Day 1-2: 项目初始化

#### 任务清单

**1.1 创建项目结构**

```bash
# 创建项目目录
mkdir batch-airdrop-desktop
cd batch-airdrop-desktop

# 初始化项目
npm init -y

# 安装核心依赖
npm install electron electron-builder
npm install react react-dom react-router-dom
npm install ethers@^6 @solana/web3.js
npm install better-sqlite3 uuid

# 开发依赖
npm install -D @types/react @types/react-dom
npm install -D @types/better-sqlite3 @types/uuid
npm install -D typescript vite electron-vite
npm install -D @vitejs/plugin-react
npm install -D concurrently wait-on

# UI 组件库（推荐）
npm install tailwindcss postcss autoprefixer
npm install @headlessui/react @heroicons/react
# 或使用 shadcn/ui
npx shadcn-ui@latest init
```

**1.2 项目目录结构**

```
batch-airdrop-desktop/
├── src/
│   ├── main/                  # 主进程（Node.js）
│   │   ├── index.ts           # 主入口
│   │   ├── preload.ts         # Preload 脚本
│   │   ├── database/          # 数据库
│   │   │   ├── index.ts
│   │   │   └── repositories/
│   │   ├── services/          # 业务服务
│   │   │   ├── CampaignService.ts
│   │   │   ├── WalletService.ts
│   │   │   ├── ContractService.ts
│   │   │   └── DispatcherService.ts
│   │   ├── ipc/               # IPC 处理器
│   │   │   └── handlers.ts
│   │   └── utils/             # 工具函数
│   │       └── providers.ts
│   │
│   └── renderer/              # 渲染进程（React）
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── CampaignCreate.tsx
│       │   │   ├── CampaignDetail.tsx
│       │   │   ├── History.tsx
│       │   │   └── Settings.tsx
│       │   ├── components/
│       │   │   ├── CampaignCard.tsx
│       │   │   ├── ProgressBar.tsx
│       │   │   └── ChainSelector.tsx
│       │   ├── hooks/
│       │   │   ├── useCampaigns.ts
│       │   │   └── useProgress.ts
│       │   └── types/
│       │       └── index.ts
│       ├── index.html
│       └── vite.config.ts
│
├── contracts/                 # 智能合约
│   ├── src/
│   │   └── BatchAirdrop.sol
│   ├── test/
│   ├── scripts/
│   └── hardhat.config.ts
│
├── assets/                    # 资源文件
│   ├── icon.png
│   ├── icon.icns (macOS)
│   └── icon.ico (Windows)
│
├── package.json
├── tsconfig.json
├── electron-builder.yml
└── README.md
```

**1.3 配置文件**

```json
// package.json
{
  "name": "batch-airdrop",
  "version": "1.0.0",
  "description": "区块链批量发奖工具",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"wait-on http://localhost:5173 && npm run dev:electron\"",
    "dev:renderer": "vite",
    "dev:electron": "electron .",
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "vite build",
    "build:main": "tsc -p tsconfig.main.json",
    "package": "npm run build && electron-builder",
    "package:win": "npm run build && electron-builder --win",
    "package:mac": "npm run build && electron-builder --mac",
    "package:linux": "npm run build && electron-builder --linux"
  },
  "author": "Your Name",
  "license": "MIT"
}
```

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

```yaml
# electron-builder.yml
appId: com.airdrop.app
productName: 批量发奖工具
directories:
  output: release
files:
  - dist/**/*
  - node_modules/**/*
  - package.json

mac:
  target:
    - dmg
    - zip
  icon: assets/icon.icns
  category: public.app-category.utilities

win:
  target:
    - nsis
    - portable
  icon: assets/icon.ico

linux:
  target:
    - AppImage
    - deb
  icon: assets/icon.png
  category: Utility

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
```

**完成标准**:
- [ ] 项目结构创建完成
- [ ] 依赖安装成功
- [ ] `npm run dev` 能启动空白Electron窗口

### Day 3-4: 数据库 + IPC 通信

**2.1 SQLite 数据库实现**

```typescript
// src/main/database/index.ts
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

export class DB {
  private static db: Database.Database;

  static initialize() {
    const dbPath = path.join(app.getPath('userData'), 'airdrop.db');
    this.db = new Database(dbPath);

    // 创建表（完整SQL见架构文档）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS campaigns (...);
      CREATE TABLE IF NOT EXISTS recipients (...);
      CREATE TABLE IF NOT EXISTS transactions (...);
      CREATE TABLE IF NOT EXISTS settings (...);
    `);
  }

  static getDB() {
    return this.db;
  }
}
```

- [ ] 实现数据库初始化
- [ ] 创建所有表和索引
- [ ] 测试数据插入和查询

**2.2 IPC 通信层**

```typescript
// src/main/ipc/handlers.ts
import { ipcMain } from 'electron';
import { CampaignService } from '../services/CampaignService';

export function setupIPCHandlers() {
  const campaignService = new CampaignService();

  ipcMain.handle('campaign:create', async (event, data) => {
    return await campaignService.create(data);
  });

  ipcMain.handle('campaign:list', async (event, filters) => {
    return await campaignService.list(filters);
  });

  // ... 其他handlers
}
```

```typescript
// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  campaign: {
    create: (data) => ipcRenderer.invoke('campaign:create', data),
    list: (filters) => ipcRenderer.invoke('campaign:list', filters),
    // ...
  }
});
```

- [ ] 实现所有IPC handlers
- [ ] 配置Preload脚本
- [ ] 类型定义完善

**2.3 基础UI框架**

```typescript
// src/renderer/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { CampaignCreate } from './pages/CampaignCreate';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="ml-64 p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CampaignCreate />} />
            {/* ... */}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] 搭建路由
- [ ] 实现侧边栏
- [ ] TailwindCSS 配置

### Day 5: Week 1 总结和测试

- [ ] 完整的项目结构
- [ ] 数据库正常工作
- [ ] IPC通信测试通过
- [ ] 基础UI能正常导航

---

## 🔧 Week 2: 核心功能开发

### 目标
实现钱包管理和活动管理的完整流程。

### Day 6-7: 钱包管理服务 ⭐ 更新

**3.1 钱包服务实现**

```typescript
// src/main/services/WalletService.ts
export class WalletService {
  async createCampaignWallet() {
    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = this.encryptPrivateKey(wallet.privateKey);
    return { address: wallet.address, encryptedKey };
  }

  async exportPrivateKey(encryptedKey: string): Promise<string> {
    return this.decryptPrivateKey(encryptedKey);
  }

  async exportKeystore(encryptedKey: string, password: string): Promise<string> {
    const wallet = await this.getWallet(encryptedKey);
    return await wallet.encrypt(password);
  }

  async getBalance(address: string, chain: string, tokenAddress?: string) {
    // 查询链上余额
    const provider = getProvider(chain);
    const nativeBalance = await provider.getBalance(address);
    let tokenBalance;
    if (tokenAddress) {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      tokenBalance = await tokenContract.balanceOf(address);
    }
    return { native: nativeBalance, token: tokenBalance };
  }

  private encryptPrivateKey(privateKey: string): string {
    // AES-256-GCM 加密
  }

  private decryptPrivateKey(encryptedKey: string): string {
    // 解密
  }
}
```

- [ ] 钱包生成（独立钱包）
- [ ] 私钥加密/解密
- [ ] 私钥导出（明文/Keystore/二维码）⭐
- [ ] 余额查询（代币+Gas）⭐
- [ ] 测试钱包创建和恢复

**3.2 私钥导出UI ⭐ 新**

```typescript
// src/renderer/src/components/ExportPrivateKeyDialog.tsx
export function ExportPrivateKeyDialog({ encryptedKey, onClose }: Props) {
  const [exportMode, setExportMode] = useState<'plaintext' | 'qrcode' | 'keystore'>('plaintext');
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  async function handleExport() {
    if (exportMode === 'keystore') {
      const keystore = await window.electronAPI.wallet.exportKeystore(encryptedKey, password);
      // 下载Keystore文件
    } else {
      const privateKey = await window.electronAPI.wallet.exportPrivateKey(encryptedKey);
      if (exportMode === 'plaintext') {
        navigator.clipboard.writeText(privateKey);
      } else {
        // 显示二维码
      }
    }
  }

  return (
    <Dialog>
      <h2>⚠️ 导出私钥</h2>
      <SecurityWarning />
      <RadioGroup value={exportMode} onChange={setExportMode}>
        <Radio value="plaintext">明文私钥（复制）</Radio>
        <Radio value="qrcode">二维码（扫描）</Radio>
        <Radio value="keystore">Keystore文件</Radio>
      </RadioGroup>
      {exportMode === 'keystore' && (
        <Input type="password" value={password} onChange={setPassword} />
      )}
      <Checkbox checked={confirmed} onChange={setConfirmed}>
        我已阅读并理解安全警告
      </Checkbox>
      <Button onClick={handleExport} disabled={!confirmed}>确认导出</Button>
    </Dialog>
  );
}
```

- [ ] 私钥导出对话框组件 ⭐
- [ ] 安全警告UI ⭐
- [ ] 三种导出方式（明文/QR/Keystore）⭐
- [ ] 二维码生成 ⭐
- [ ] 余额显示和刷新UI ⭐

### Day 8-9: 活动管理

**4.1 活动创建服务**

```typescript
// src/main/services/CampaignService.ts
export class CampaignService {
  async create(data: CreateCampaignDTO) {
    // 1. 验证数据
    // 2. 创建活动记录
    // 3. 生成独立钱包
    // 4. 保存收件人列表
    return campaign;
  }

  async list(filters?: any) {
    return this.campaignRepo.list(filters);
  }

  async getById(id: string) {
    return this.campaignRepo.findById(id);
  }
}
```

- [ ] 实现活动CRUD
- [ ] 收件人CSV解析
- [ ] 数据验证逻辑

**4.2 活动创建UI**

```typescript
// src/renderer/src/pages/CampaignCreate.tsx
export function CampaignCreate() {
  const [formData, setFormData] = useState({
    name: '',
    chain: 'polygon',
    tokenAddress: '',
    recipients: []
  });

  async function handleSubmit() {
    const campaign = await window.electronAPI.campaign.create(formData);
    navigate(`/campaign/${campaign.id}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input label="活动名称" {...} />
      <ChainSelector {...} />
      <TokenInput {...} />
      <CSVUploader onUpload={(data) => setFormData({...formData, recipients: data})} />
      <Button type="submit">创建活动</Button>
    </form>
  );
}
```

- [ ] 表单组件
- [ ] CSV上传组件
- [ ] 链选择器
- [ ] 代币地址验证

**4.3 Dashboard页面**

```typescript
// src/renderer/src/pages/Dashboard.tsx
export function Dashboard() {
  const { campaigns, loading } = useCampaigns();

  return (
    <div>
      <StatsCards />
      <CampaignList campaigns={campaigns} loading={loading} />
    </div>
  );
}
```

- [ ] 统计卡片
- [ ] 活动列表
- [ ] 状态筛选

### Day 10: Week 2 总结

- [ ] 钱包管理完整流程
- [ ] 活动创建流程通畅
- [ ] UI/UX 基本友好
- [ ] 数据持久化正常

---

## ⚡ Week 3: 发送逻辑 + 合约集成

### 目标
实现智能合约部署和批量发送核心功能。

### Day 11-12: 智能合约开发

**5.1 BatchAirdrop合约**

```solidity
// contracts/src/BatchAirdrop.sol
contract BatchAirdrop is Ownable, ReentrancyGuard {
    IERC20 public immutable token;

    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        // 批量发送逻辑
    }

    function withdrawRemaining() external onlyOwner {
        // 提取剩余代币
    }
}
```

- [ ] 编写合约代码
- [ ] 单元测试
- [ ] 部署到测试网
- [ ] Gas成本分析

**5.2 合约服务集成**

```typescript
// src/main/services/ContractService.ts
export class ContractService {
  async deploy(tokenAddress: string, wallet: ethers.Wallet) {
    const factory = new ethers.ContractFactory(ABI, BYTECODE, wallet);
    const contract = await factory.deploy(tokenAddress);
    await contract.waitForDeployment();
    return await contract.getAddress();
  }

  getContract(address: string, wallet: ethers.Wallet) {
    return new ethers.Contract(address, ABI, wallet);
  }
}
```

- [ ] 合约部署逻辑
- [ ] 合约交互方法
- [ ] 编译产物集成

### Day 13-14: 发送调度逻辑

**6.1 Dispatcher服务**

```typescript
// src/main/services/DispatcherService.ts
export class DispatcherService extends EventEmitter {
  async startCampaign(campaign: Campaign) {
    // 1. 部署合约
    // 2. 转入代币
    // 3. 分批发送
    // 4. 监控进度
  }

  private async sendBatch(campaign, batch, index) {
    // 调用合约batchTransfer
    // 更新数据库
    // 发送进度事件
  }
}
```

- [ ] 分批逻辑
- [ ] 发送流程
- [ ] 进度事件
- [ ] 错误处理

**6.2 进度监控UI**

```typescript
// src/renderer/src/pages/CampaignDetail.tsx
export function CampaignDetail() {
  const { id } = useParams();
  const progress = useProgress(id);

  return (
    <div>
      <h1>活动详情</h1>
      <ProgressBar value={progress.percentage} />
      <p>{progress.current} / {progress.total}</p>

      <TransactionList campaignId={id} />
    </div>
  );
}
```

- [ ] 实时进度条
- [ ] 交易列表
- [ ] 错误展示

### Day 15: Week 3 测试

**完整流程测试**:
1. 创建活动
2. 上传100个测试地址
3. 启动发送（测试网）
4. 观察进度
5. 验证链上结果

- [ ] 测试网完整流程通过
- [ ] 所有地址成功接收
- [ ] UI实时更新正常

---

## 🎨 Week 4: UI 完善 + 监控

### 目标
完善用户界面,增加监控和历史功能。

### Day 16-17: UI 优化

**7.1 美化现有页面**
- [ ] 统一设计风格
- [ ] 响应式布局
- [ ] 加载状态优化
- [ ] 空状态处理

**7.2 新增页面**

```typescript
// src/renderer/src/pages/History.tsx
export function History() {
  const { campaigns } = useCampaigns({ status: 'COMPLETED' });

  return (
    <div>
      <h1>历史活动</h1>
      <CampaignTable campaigns={campaigns} />
      <ExportButton />
    </div>
  );
}
```

- [ ] 历史活动页面
- [ ] 交易详情页面
- [ ] 导出报告功能

### Day 18-19: 监控和告警

**8.1 Gas费用监控**

```typescript
// src/main/services/MonitorService.ts
export class MonitorService {
  async trackGasUsage(campaign: Campaign) {
    // 统计总Gas消耗
    // 计算USD成本
    // 检查是否超预算
  }
}
```

- [ ] Gas统计
- [ ] 成本计算
- [ ] 预算告警

**8.2 桌面通知**

```typescript
// src/main/utils/notifications.ts
import { Notification } from 'electron';

export function showNotification(title: string, body: string) {
  new Notification({ title, body }).show();
}

// 使用
campaignService.on('completed', (campaign) => {
  showNotification(
    '活动完成',
    `${campaign.name} 已成功发送到 ${campaign.total_recipients} 个地址`
  );
});
```

- [ ] 完成通知
- [ ] 错误通知
- [ ] 重要事件通知

### Day 20: Week 4 总结

- [ ] UI/UX 基本完善
- [ ] 监控功能齐全
- [ ] 用户体验流畅

---

## 🌐 Week 5: 多链支持 + 链管理

### 目标
扩展到多条EVM链、Solana，并实现链管理功能。

### Day 21-22: 链管理服务 ⭐ 新

**9.1 ChainManagementService实现**

```typescript
// src/main/services/ChainManagementService.ts
export class ChainManagementService {
  async getEVMChains(onlyEnabled = false): Promise<EVMChain[]> {
    // 获取所有EVM链（内置+自定义）
  }

  async addCustomEVMChain(chain: EVMChainInput): Promise<number> {
    // 验证Chain ID
    const verified = await this.verifyEVMChain(chain.rpc_url, chain.chain_id);
    // 插入数据库
  }

  async testEVMChainLatency(chainId: number) {
    // 测试RPC延迟和连通性
  }

  async getSolanaRPCs(network: string, onlyEnabled = false) {
    // 获取Solana RPC列表
  }

  async getActiveSolanaRPC(network: string) {
    // 获取当前可用的最高优先级RPC
  }

  async addSolanaRPC(rpc: SolanaRPCInput) {
    // 测试连接并添加
  }
}
```

- [ ] 内置链配置（Ethereum/Polygon/Arbitrum/Base等）⭐
- [ ] 自定义EVM链添加/编辑/删除 ⭐
- [ ] RPC健康检查和延迟测试 ⭐
- [ ] Solana多RPC节点管理 ⭐
- [ ] RPC优先级和自动切换 ⭐

**9.2 链管理UI ⭐ 新**

```typescript
// src/renderer/src/pages/ChainManagement.tsx
export function ChainManagement() {
  const [evmChains, setEVMChains] = useState([]);
  const [solanaRPCs, setSolanaRPCs] = useState([]);

  async function handleAddEVMChain(chainData) {
    const id = await window.electronAPI.chain.addEVMChain(chainData);
    // 刷新列表
  }

  async function handleTestLatency(chainId) {
    const result = await window.electronAPI.chain.testEVMLatency(chainId);
    // 显示延迟结果
  }

  return (
    <div>
      <EVMChainList chains={evmChains} onTest={handleTestLatency} />
      <AddEVMChainDialog onAdd={handleAddEVMChain} />
      <SolanaRPCList rpcs={solanaRPCs} />
    </div>
  );
}
```

- [ ] EVM链管理页面 ⭐
- [ ] 添加自定义链对话框（Chain ID/RPC/Explorer/Symbol）⭐
- [ ] RPC测试按钮和延迟显示 ⭐
- [ ] Solana RPC管理页面 ⭐
- [ ] RPC优先级拖拽调整 ⭐
- [ ] 链启用/禁用切换 ⭐

**9.3 部署到各链**
- [ ] 合约部署到5条内置链
- [ ] 验证合约
- [ ] 测试网测试

### Day 23-24: Solana集成

**10.1 Solana适配器**

```typescript
// src/main/services/SolanaDispatcher.ts
export class SolanaDispatcher {
  async sendBatch(recipients, wallet) {
    // SPL Token批量发送
  }
}
```

- [ ] Solana钱包生成
- [ ] SPL Token转账
- [ ] 测试网测试

**10.2 UI适配**
- [ ] 链类型识别
- [ ] Solana地址验证
- [ ] 代币选择器

### Day 25: Week 5 测试

- [ ] 所有链测试通过
- [ ] Solana发送成功
- [ ] UI正确显示各链数据

---

## 📦 Week 6: 打包 + 测试 + 优化

### 目标
打包应用,测试安装,优化性能。

### Day 26-27: 打包和分发

**11.1 配置 electron-builder**
- [ ] Windows打包（NSIS安装器）
- [ ] macOS打包（DMG + zip）
- [ ] Linux打包（AppImage + deb）

**11.2 代码签名（可选）**
- [ ] macOS公证
- [ ] Windows Authenticode签名

**11.3 测试安装**
- [ ] Windows安装测试
- [ ] macOS安装测试
- [ ] Linux安装测试
- [ ] 卸载测试

### Day 28-29: 性能优化

**12.1 性能分析**
- [ ] 启动时间优化
- [ ] 内存使用分析
- [ ] 数据库查询优化

**12.2 代码优化**
- [ ] 移除未使用依赖
- [ ] 代码分割
- [ ] 懒加载优化

**12.3 错误处理**
- [ ] 全局错误捕获
- [ ] 错误日志
- [ ] 用户友好提示

### Day 30: 最终测试和交付

**13.1 完整测试**
- [ ] 创建10个活动
- [ ] 测试所有链
- [ ] 压力测试（5000地址）
- [ ] 边界情况测试

**13.2 文档完善**
- [ ] 用户手册
- [ ] 常见问题FAQ
- [ ] 故障排除指南

**13.3 发布准备**
- [ ] 版本号确定
- [ ] 发布说明
- [ ] 安装包上传

---

## ✅ 验收标准

### MVP阶段 (Week 1-3)
- [ ] 单链（Polygon测试网）完整流程
- [ ] 100个地址成功发送
- [ ] UI基本可用
- [ ] 数据持久化正常

### 生产版本 (Week 4-6)
- [ ] 支持5+条链
- [ ] Solana集成
- [ ] 监控和通知完善
- [ ] 打包成功,可安装
- [ ] 性能良好（启动<5秒，5000地址<1小时）

---

## 📚 交付物清单

### Week 6 结束交付
- [x] 需求文档 (REQUIREMENTS.md)
- [x] 技术架构文档 (ARCHITECTURE_ELECTRON.md)
- [x] 技术挑战文档 (CHALLENGES.md)
- [x] 实施路线图 (ROADMAP_ELECTRON.md)
- [ ] 用户手册
- [ ] API文档（IPC接口）
- [ ] 安装包
  - [ ] Windows (batch-airdrop-setup-1.0.0.exe)
  - [ ] macOS (batch-airdrop-1.0.0.dmg)
  - [ ] Linux (batch-airdrop-1.0.0.AppImage)
- [ ] 源代码（GitHub仓库）

---

## 🎯 里程碑

### M1: 项目启动 (Day 5)
- 项目结构完成
- 数据库和IPC通信正常

### M2: 核心功能 (Day 10)
- 钱包管理完成
- 活动管理完成

### M3: 发送功能 (Day 15)
- 合约集成完成
- 测试网发送成功

### M4: UI完善 (Day 20)
- 所有页面完成
- 监控功能上线

### M5: 多链支持 (Day 25)
- 5条EVM链支持
- Solana集成

### M6: 发布版本 (Day 30)
- 打包完成
- 测试通过
- 文档齐全

---

## 💡 后续演进计划

### v1.1 (M6+2周)
- [ ] 自动更新功能
- [ ] 数据备份/恢复
- [ ] 多语言支持

### v1.2 (M6+4周)
- [ ] 高级统计分析
- [ ] 批量活动管理
- [ ] 模板功能

### v2.0 (M6+8周)
- [ ] 云同步（可选）
- [ ] 团队协作（多人共享数据）
- [ ] 移动端查看器

---

## 📞 支持和维护

### 用户支持
- GitHub Issues
- 用户手册
- 视频教程（可选）

### 版本更新
- 每月小版本更新（Bug修复）
- 每季度大版本更新（新功能）

---

## 总结

这份路线图提供了6周的详细开发计划:

- **Week 1**: 项目搭建
- **Week 2**: 核心功能
- **Week 3**: 发送逻辑
- **Week 4**: UI完善
- **Week 5**: 多链支持
- **Week 6**: 打包发布

预计**6周**可交付一个功能完整、用户友好的 Electron 桌面应用!

准备好开始了吗？让我们从 Week 1 的项目搭建开始! 🚀
