import { useState, useEffect } from 'react';

interface EVMChain {
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

interface SolanaRPC {
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

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'evm' | 'solana' | 'wallet' | 'data'>('evm');
  const [evmChains, setEvmChains] = useState<EVMChain[]>([]);
  const [solanaRPCs, setSolanaRPCs] = useState<SolanaRPC[]>([]);
  const [loading, setLoading] = useState(false);
  const [walletPassword, setWalletPassword] = useState('');
  const [newWalletPassword, setNewWalletPassword] = useState('');
  const [walletLocked, setWalletLocked] = useState(true);

  // Form states for adding new chains/RPCs
  const [newEVMChain, setNewEVMChain] = useState({
    name: '',
    chainId: '',
    rpcUrl: '',
    rpcBackup: '',
    explorerUrl: '',
    symbol: '',
    decimals: 18,
    enabled: true
  });

  const [newSolanaRPC, setNewSolanaRPC] = useState({
    network: 'mainnet-beta' as 'mainnet-beta' | 'devnet' | 'testnet',
    name: '',
    rpcUrl: '',
    wsUrl: '',
    priority: 1,
    enabled: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (window.electronAPI?.chain) {
        const evm = await window.electronAPI.chain.getEVMChains();
        const solana = await window.electronAPI.chain.getSolanaRPCs();
        setEvmChains(evm);
        setSolanaRPCs(solana);
      }

      if (window.electronAPI?.wallet) {
        setWalletLocked(window.electronAPI.wallet.isLocked());
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const addEVMChain = async () => {
    try {
      if (window.electronAPI?.chain) {
        const chainId = await window.electronAPI.chain.addEVMChain({
          ...newEVMChain,
          chainId: parseInt(newEVMChain.chainId),
          decimals: parseInt(newEVMChain.decimals.toString())
        });

        if (chainId) {
          alert('EVM链添加成功');
          setNewEVMChain({
            name: '',
            chainId: '',
            rpcUrl: '',
            rpcBackup: '',
            explorerUrl: '',
            symbol: '',
            decimals: 18,
            enabled: true
          });
          loadSettings();
        }
      }
    } catch (error) {
      console.error('添加EVM链失败:', error);
      alert('添加EVM链失败');
    }
  };

  const updateEVMChain = async (chainId: number, updates: Partial<EVMChain>) => {
    try {
      if (window.electronAPI?.chain) {
        await window.electronAPI.chain.updateEVMChain(chainId, updates);
        alert('EVM链更新成功');
        loadSettings();
      }
    } catch (error) {
      console.error('更新EVM链失败:', error);
      alert('更新EVM链失败');
    }
  };

  const deleteEVMChain = async (chainId: number) => {
    if (!confirm('确定要删除这个EVM链吗？')) return;

    try {
      if (window.electronAPI?.chain) {
        await window.electronAPI.chain.deleteEVMChain(chainId);
        alert('EVM链删除成功');
        loadSettings();
      }
    } catch (error) {
      console.error('删除EVM链失败:', error);
      alert('删除EVM链失败');
    }
  };

  const addSolanaRPC = async () => {
    try {
      if (window.electronAPI?.chain) {
        const rpcId = await window.electronAPI.chain.addSolanaRPC(newSolanaRPC);

        if (rpcId) {
          alert('Solana RPC添加成功');
          setNewSolanaRPC({
            network: 'mainnet-beta',
            name: '',
            rpcUrl: '',
            wsUrl: '',
            priority: 1,
            enabled: true
          });
          loadSettings();
        }
      }
    } catch (error) {
      console.error('添加Solana RPC失败:', error);
      alert('添加Solana RPC失败');
    }
  };

  const deleteSolanaRPC = async (id: number) => {
    if (!confirm('确定要删除这个Solana RPC吗？')) return;

    try {
      if (window.electronAPI?.chain) {
        await window.electronAPI.chain.deleteSolanaRPC(id);
        alert('Solana RPC删除成功');
        loadSettings();
      }
    } catch (error) {
      console.error('删除Solana RPC失败:', error);
      alert('删除Solana RPC失败');
    }
  };

  const testEVMLatency = async (chainId: number) => {
    try {
      if (window.electronAPI?.chain) {
        const result = await window.electronAPI.chain.testEVMLatency(chainId);
        alert(`延迟测试结果: ${result.latency}ms\n区块号: ${result.blockNumber}`);
      }
    } catch (error) {
      console.error('测试延迟失败:', error);
      alert('测试延迟失败');
    }
  };

  const testSolanaRPC = async (rpcUrl: string) => {
    try {
      if (window.electronAPI?.chain) {
        const result = await window.electronAPI.chain.testSolanaRPC(rpcUrl);
        if (result.success) {
          alert(`RPC测试成功! 延迟: ${result.latency}ms`);
        } else {
          alert('RPC测试失败');
        }
      }
    } catch (error) {
      console.error('测试Solana RPC失败:', error);
      alert('测试RPC失败');
    }
  };

  const changeWalletPassword = async () => {
    if (!walletPassword || !newWalletPassword) {
      alert('请输入当前密码和新密码');
      return;
    }

    try {
      if (window.electronAPI?.wallet) {
        const result = await window.electronAPI.wallet.changePassword(walletPassword, newWalletPassword);

        if (result) {
          alert('密码修改成功');
          setWalletPassword('');
          setNewWalletPassword('');
        } else {
          alert('当前密码错误');
        }
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      alert('修改密码失败');
    }
  };

  const exportData = async () => {
    try {
      const settings = await window.electronAPI?.settings?.get();
      const dataStr = JSON.stringify(settings, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-airdrop-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('设置导出成功');
    } catch (error) {
      console.error('导出设置失败:', error);
      alert('导出设置失败');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">系统设置</h1>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('evm')}
          className={`flex-1 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'evm'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🌐 EVM链管理
        </button>
        <button
          onClick={() => setActiveTab('solana')}
          className={`flex-1 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'solana'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🔷 Solana网络
        </button>
        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex-1 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'wallet'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          👛 钱包管理
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'data'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          💾 数据管理
        </button>
      </div>

      {/* EVM Chain Management */}
      {activeTab === 'evm' && (
        <div className="space-y-6">
          {/* Add New EVM Chain */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">➕ 添加新的EVM链</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="链名称"
                value={newEVMChain.name}
                onChange={(e) => setNewEVMChain(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="number"
                placeholder="Chain ID"
                value={newEVMChain.chainId}
                onChange={(e) => setNewEVMChain(prev => ({ ...prev, chainId: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="RPC URL"
                value={newEVMChain.rpcUrl}
                onChange={(e) => setNewEVMChain(prev => ({ ...prev, rpcUrl: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="备用RPC URL (可选)"
                value={newEVMChain.rpcBackup}
                onChange={(e) => setNewEVMChain(prev => ({ ...prev, rpcBackup: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="区块浏览器URL"
                value={newEVMChain.explorerUrl}
                onChange={(e) => setNewEVMChain(prev => ({ ...prev, explorerUrl: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="代币符号 (如ETH)"
                value={newEVMChain.symbol}
                onChange={(e) => setNewEVMChain(prev => ({ ...prev, symbol: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={addEVMChain}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              添加EVM链
            </button>
          </div>

          {/* Existing EVM Chains */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">📋 已配置的EVM链</h2>
            <div className="space-y-4">
              {evmChains.map((chain) => (
                <div key={chain.id || chain.chainId} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{chain.name}</h3>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-400">
                        <div>Chain ID: {chain.chainId}</div>
                        <div>代币: {chain.symbol}</div>
                        <div className="col-span-2 font-mono text-xs">{chain.rpcUrl}</div>
                        {chain.rpcBackup && (
                          <div className="col-span-2 font-mono text-xs">备用: {chain.rpcBackup}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateEVMChain(chain.chainId, { enabled: !chain.enabled })}
                        className={`px-3 py-1 rounded text-sm ${
                          chain.enabled
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-white'
                        }`}
                      >
                        {chain.enabled ? '启用' : '禁用'}
                      </button>
                      <button
                        onClick={() => testEVMLatency(chain.chainId)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        测试延迟
                      </button>
                      {!chain.isCustom && (
                        <button
                          onClick={() => deleteEVMChain(chain.chainId)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Solana RPC Management */}
      {activeTab === 'solana' && (
        <div className="space-y-6">
          {/* Add New Solana RPC */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">➕ 添加新的Solana RPC</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={newSolanaRPC.network}
                onChange={(e) => setNewSolanaRPC(prev => ({ ...prev, network: e.target.value as any }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="mainnet-beta">Mainnet Beta</option>
                <option value="devnet">Devnet</option>
                <option value="testnet">Testnet</option>
              </select>
              <input
                type="text"
                placeholder="RPC名称"
                value={newSolanaRPC.name}
                onChange={(e) => setNewSolanaRPC(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="RPC URL"
                value={newSolanaRPC.rpcUrl}
                onChange={(e) => setNewSolanaRPC(prev => ({ ...prev, rpcUrl: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="WebSocket URL (可选)"
                value={newSolanaRPC.wsUrl}
                onChange={(e) => setNewSolanaRPC(prev => ({ ...prev, wsUrl: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="number"
                placeholder="优先级 (1-10)"
                value={newSolanaRPC.priority}
                onChange={(e) => setNewSolanaRPC(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={addSolanaRPC}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              添加Solana RPC
            </button>
          </div>

          {/* Existing Solana RPCs */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">📋 已配置的Solana RPC</h2>
            <div className="space-y-4">
              {solanaRPCs.map((rpc) => (
                <div key={rpc.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{rpc.name}</h3>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-400">
                        <div>网络: {rpc.network}</div>
                        <div>优先级: {rpc.priority}</div>
                        {rpc.latency && <div>延迟: {rpc.latency}ms</div>}
                        {rpc.uptime24h && <div>24h可用性: {rpc.uptime24h}%</div>}
                        <div className="col-span-2 font-mono text-xs">{rpc.rpcUrl}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => testSolanaRPC(rpc.rpcUrl)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        测试RPC
                      </button>
                      <button
                        onClick={() => deleteSolanaRPC(rpc.id!)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Wallet Management */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">🔐 钱包安全</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 mb-2">当前状态: {walletLocked ? '🔒 已锁定' : '🔓 已解锁'}</p>
              </div>

              <div>
                <h3 className="font-medium mb-2">修改钱包密码</h3>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="当前密码"
                    value={walletPassword}
                    onChange={(e) => setWalletPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="password"
                    placeholder="新密码"
                    value={newWalletPassword}
                    onChange={(e) => setNewWalletPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={changeWalletPassword}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    修改密码
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Management */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">💾 数据管理</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">数据备份</h3>
                <p className="text-gray-400 mb-3">导出应用设置和配置数据</p>
                <button
                  onClick={exportData}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  导出设置
                </button>
              </div>

              <div>
                <h3 className="font-medium mb-2">数据目录</h3>
                <p className="text-gray-400 text-sm">
                  数据存储在应用的用户数据目录中，包括活动记录、钱包信息和设置。
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">隐私说明</h3>
                <p className="text-gray-400 text-sm">
                  所有数据都存储在本地，不会上传到任何服务器。钱包私钥使用AES-256加密存储。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
