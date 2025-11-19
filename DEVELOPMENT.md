# 开发指南

## 项目初始化完成 ✅

已完成的设置：

### 1. 项目结构
```
batch-airdrop-desktop/
├── src/
│   ├── main/               # Electron主进程
│   │   ├── index.ts        # ✅ 主进程入口
│   │   ├── preload.ts      # ✅ Preload脚本
│   │   ├── ipc/            # ✅ IPC处理器
│   │   ├── services/       # 业务服务（待实现）
│   │   ├── database/       # 数据库（待实现）
│   │   └── utils/          # 工具函数
│   │
│   └── renderer/           # React渲染进程
│       └── src/
│           ├── main.tsx    # ✅ React入口
│           ├── App.tsx     # ✅ 根组件
│           ├── pages/      # ✅ 页面组件
│           ├── components/ # ✅ 通用组件
│           ├── hooks/      # 自定义Hooks
│           ├── types/      # ✅ TypeScript类型
│           └── styles/     # ✅ 样式文件
│
├── contracts/              # 智能合约
├── docs/                   # ✅ 文档
└── README.md               # ✅ 说明
```

### 2. 已配置的工具
- ✅ TypeScript配置
- ✅ Vite构建工具
- ✅ Tailwind CSS
- ✅ React Router
- ✅ Electron配置

### 3. 已创建的页面
- ✅ Dashboard（仪表盘）
- ✅ CampaignCreate（创建活动）
- ✅ CampaignDetail（活动详情）
- ✅ History（历史记录）
- ✅ Settings（设置）

## 下一步开发计划

### Week 2: 核心功能
- [ ] 实现WalletService（钱包服务）
- [ ] 实现CampaignService（活动服务）
- [ ] 配置SQLite数据库
- [ ] 完善IPC handlers
- [ ] 完善UI表单组件

### Week 3: 发送逻辑
- [ ] 实现DispatcherService（发送调度）
- [ ] 实现ContractService（合约服务）
- [ ] Solana集成
- [ ] Gas预估和管理

### Week 4-6: 完善和打包
- [ ] UI/UX优化
- [ ] 链管理功能
- [ ] 测试和bug修复
- [ ] Electron打包

## 开发命令

```bash
# 安装依赖（已执行）
npm install

# 开发模式运行
npm run dev

# 构建应用
npm run build

# 打包Windows版本
npm run build:win

# 打包macOS版本
npm run build:mac

# 打包Linux版本
npm run build:linux
```

## 注意事项

1. **Node.js版本**:
   - 如遇到better-sqlite3编译问题，使用Node.js v20 LTS
   - 当前项目使用sql.js作为临时替代

2. **数据库**:
   - SQLite数据库文件将存储在用户目录
   - 开发时会在项目根目录生成测试数据库

3. **私钥安全**:
   - 主密钥文件`.masterkey`已添加到.gitignore
   - 不要提交任何私钥或敏感数据

4. **开发工具**:
   - 开发模式下会自动打开DevTools
   - 支持热重载

## 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS
- **后端**: Node.js + Electron
- **数据库**: SQLite (sql.js / better-sqlite3)
- **区块链**: ethers.js v6 + @solana/web3.js
- **构建**: Vite + electron-builder

## 文档

- [需求规格文档](./REQUIREMENTS.md)
- [技术架构文档](./ARCHITECTURE_ELECTRON.md)
- [UI设计文档](./UI_DESIGN.md)
- [实施路线图](./ROADMAP_ELECTRON.md)
