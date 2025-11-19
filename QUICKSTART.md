# 快速开始

## 当前状态

✅ 项目初始化完成
⏳ 依赖安装进行中...

## 等待依赖安装完成后

### 1. 确认依赖安装成功

```bash
ls node_modules/
```

应该看到已安装的包列表。

### 2. 启动开发环境

```bash
npm run dev
```

这将：
1. 启动Vite开发服务器 (http://localhost:5173)
2. 启动Electron应用窗口

### 3. 如果遇到问题

**问题：npm install失败**
```bash
# 清理并重试
rm -rf node_modules package-lock.json
npm install
```

**问题：Electron无法启动**
```bash
# 确保Node.js版本正确
node --version  # 应该是 v20.x 或 v18.x

# 如果不是，切换Node版本
nvm use 20
```

**问题：better-sqlite3编译失败**
这个问题已经解决 - 我们暂时使用了sql.js替代。后续可以换回better-sqlite3。

## 项目结构预览

```
src/
├── main/           # Electron主进程（Node.js后端）
│   ├── index.ts    # ✅ 程序入口
│   ├── preload.ts  # ✅ 安全桥接层
│   └── ipc/        # ✅ IPC通信处理器
│
└── renderer/       # React前端
    └── src/
        ├── App.tsx     # ✅ 根组件
        ├── pages/      # ✅ 页面组件
        ├── components/ # ✅ UI组件
        └── types/      # ✅ 类型定义
```

## 已实现的功能

### 基础框架 ✅
- Electron + React + TypeScript
- Tailwind CSS样式
- React Router路由
- IPC通信骨架

### UI页面 ✅
- 仪表盘（Dashboard）
- 创建活动（CampaignCreate）
- 活动详情（CampaignDetail）
- 历史记录（History）
- 设置（Settings）

## 待实现的功能

### Week 2 (本周)
- [ ] 数据库初始化
- [ ] 钱包服务
- [ ] 活动管理服务
- [ ] UI表单组件

### Week 3-6
- [ ] 发送逻辑
- [ ] 智能合约集成
- [ ] 链管理
- [ ] 打包发布

## 开发提示

1. **热重载**：修改代码后，React部分会自动刷新，Electron主进程需要重启
2. **调试**：开发模式下会自动打开DevTools
3. **类型检查**：TypeScript会在编辑器中提供类型提示和错误检查

## 下一步

等待`npm install`完成后，运行`npm run dev`即可看到应用界面！
