import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CampaignCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    chain: 'ethereum',
    tokenAddress: '',
    contractAddress: '',
    recipientCount: 0,
    totalAmount: '',
    needsDeployment: false,
    deployerPrivateKey: '',
    rpcUrl: ''
  });

  const [chains, setChains] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    loadChains();
  }, []);

  const loadChains = async () => {
    try {
      if (window.electronAPI?.chain) {
        const evmChains = await window.electronAPI.chain.getEVMChains(true);
        setChains(evmChains);
        if (evmChains.length > 0) {
          setFormData(prev => ({
            ...prev,
            rpcUrl: evmChains[0].rpcUrl
          }));
        }
      }
    } catch (error) {
      console.error('加载链列表失败:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const deployContract = async () => {
    if (!formData.deployerPrivateKey || !formData.rpcUrl || !formData.tokenAddress) {
      alert('请填写完整的合约部署信息');
      return;
    }

    setDeploying(true);
    try {
      if (window.electronAPI?.contract) {
        const config = {
          tokenAddress: formData.tokenAddress,
          chainId: parseInt(formData.chain),
          rpcUrl: formData.rpcUrl,
          deployerPrivateKey: formData.deployerPrivateKey
        };

        const result = await window.electronAPI.contract.deploy(config);
        setFormData(prev => ({
          ...prev,
          contractAddress: result.contractAddress
        }));
        alert(`合约部署成功！地址: ${result.contractAddress}`);
      }
    } catch (error) {
      console.error('合约部署失败:', error);
      alert(`合约部署失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.chain || !formData.tokenAddress) {
      alert('请填写必要信息');
      return;
    }

    setLoading(true);
    try {
      // 1. 首先创建新的发奖钱包
      let newWallet;
      if (window.electronAPI?.wallet) {
        newWallet = await window.electronAPI.wallet.create('evm');
        console.log('新钱包地址:', newWallet.address);
      }

      // 2. 部署新的智能合约（每次活动都部署新合约）
      let contractAddress;
      if (window.electronAPI?.contract && formData.deployerPrivateKey) {
        const config = {
          tokenAddress: formData.tokenAddress,
          chainId: parseInt(formData.chain),
          rpcUrl: formData.rpcUrl,
          deployerPrivateKey: formData.deployerPrivateKey
        };

        const deployResult = await window.electronAPI.contract.deploy(config);
        contractAddress = deployResult.contractAddress;
        console.log('新合约地址:', contractAddress);
      }

      // 3. 创建活动
      if (window.electronAPI?.campaign) {
        const campaignData = {
          name: formData.name,
          chain: formData.chain,
          tokenAddress: formData.tokenAddress,
          status: 'READY', // 直接设为就绪状态，因为合约已部署
          walletAddress: newWallet?.address,
          walletEncryptedKey: newWallet?.encryptedKey,
          contractAddress: contractAddress
        };

        const campaign = await window.electronAPI.campaign.create(campaignData);

        alert(`活动创建成功！\n📍 活动ID: ${campaign.id}\n💰 发奖地址: ${newWallet?.address}\n📋 合约地址: ${contractAddress}`);
        navigate(`/campaign/${campaign.id}`);
      }
    } catch (error) {
      console.error('创建活动失败:', error);
      alert(`创建活动失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">创建新活动</h1>
      <p className="text-gray-400 mb-6">
        🎯 每个活动将创建独立的发奖钱包和智能合约，确保资金安全和活动隔离
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">基本信息</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                活动名称 *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="输入活动名称"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                区块链网络 *
              </label>
              <select
                name="chain"
                value={formData.chain}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {chains.map(chain => (
                  <option key={chain.chainId} value={chain.chainId}>
                    {chain.name} ({chain.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                代币地址 *
              </label>
              <input
                type="text"
                name="tokenAddress"
                value={formData.tokenAddress}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0x..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                预计收币人数
              </label>
              <input
                type="number"
                name="recipientCount"
                value={formData.recipientCount}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* 合约部署配置 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">
            🔐 合约部署配置
            <span className="ml-2 text-sm text-green-400">（每次活动自动部署新合约）</span>
          </h2>

          <div className="p-4 bg-blue-900 border border-blue-700 rounded-lg mb-4">
            <p className="text-sm text-blue-200">
              💡 <strong>自动化流程：</strong>
            </p>
            <ul className="text-sm text-blue-200 mt-2 space-y-1">
              <li>1️⃣ 自动创建新的发奖钱包（资金隔离）</li>
              <li>2️⃣ 自动部署新的 AbsoluteMinimal 批量转账合约</li>
              <li>3️⃣ 合约仅30行代码，每次转账可节省 3,000-5,000 gas</li>
              <li>4️⃣ 包含重入保护，安全性最高</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                🗝️ 部署者私钥 *
              </label>
              <input
                type="password"
                name="deployerPrivateKey"
                value={formData.deployerPrivateKey}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="输入部署者私钥（用于部署新合约）"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                此私钥仅用于部署合约，部署完成后不需要保存
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                🌐 RPC URL *
              </label>
              <input
                type="text"
                name="rpcUrl"
                value={formData.rpcUrl}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://..."
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                使用可靠的RPC节点，如Infura、Alchemy或自建节点
              </p>
            </div>

            {formData.contractAddress && (
              <div className="p-3 bg-green-900 border border-green-700 rounded text-sm">
                ✅ 测试合约已部署: {formData.contractAddress}
                <p className="text-green-200 mt-1">点击"创建活动"将部署新的生产合约</p>
              </div>
            )}
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '创建中...' : '创建活动'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
