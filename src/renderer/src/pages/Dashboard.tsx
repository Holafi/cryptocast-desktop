import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Campaign {
  id: string;
  name: string;
  chain: string;
  tokenAddress: string;
  status: 'CREATED' | 'READY' | 'SENDING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  totalRecipients: number;
  completedRecipients: number;
  walletAddress?: string;
  contractAddress?: string;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalCampaigns: number;
  completedCampaigns: number;
  totalRecipients: number;
  completedRecipients: number;
  totalGasUsed: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    completedCampaigns: 0,
    totalRecipients: 0,
    completedRecipients: 0,
    totalGasUsed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (window.electronAPI?.campaign) {
        const campaignList = await window.electronAPI.campaign.list();
        setCampaigns(campaignList);

        // 计算统计数据
        const dashboardStats: DashboardStats = {
          totalCampaigns: campaignList.length,
          completedCampaigns: campaignList.filter(c => c.status === 'COMPLETED').length,
          totalRecipients: campaignList.reduce((sum, c) => sum + c.totalRecipients, 0),
          completedRecipients: campaignList.reduce((sum, c) => sum + c.completedRecipients, 0),
          totalGasUsed: 0 // 这里需要从交易记录中计算，暂时设为0
        };

        setStats(dashboardStats);
      }
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400';
      case 'SENDING': return 'text-yellow-400';
      case 'FAILED': return 'text-red-400';
      case 'PAUSED': return 'text-orange-400';
      case 'READY': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CREATED': return '已创建';
      case 'READY': return '就绪';
      case 'SENDING': return '发送中';
      case 'PAUSED': return '已暂停';
      case 'COMPLETED': return '已完成';
      case 'FAILED': return '失败';
      default: return '未知';
    }
  };

  const getChainName = (chainId: string) => {
    const chains: Record<string, string> = {
      '1': 'Ethereum',
      '137': 'Polygon',
      '56': 'BSC',
      '43114': 'Avalanche',
      '250': 'Fantom'
    };
    return chains[chainId] || `Chain ${chainId}`;
  };

  const activeCampaigns = campaigns.filter(c =>
    ['READY', 'SENDING', 'PAUSED'].includes(c.status)
  );

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">仪表盘</h1>
        <div className="text-center py-12">
          <div className="text-gray-400">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">仪表盘</h1>
        <button
          onClick={() => navigate('/campaign/create')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          ➕ 创建新活动
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-2">总活动数</div>
          <div className="text-3xl font-bold text-indigo-400">{stats.totalCampaigns}</div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-2">已完成</div>
          <div className="text-3xl font-bold text-green-400">{stats.completedCampaigns}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.totalCampaigns > 0 ? Math.round((stats.completedCampaigns / stats.totalCampaigns) * 100) : 0}% 完成率
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-2">总收币地址</div>
          <div className="text-3xl font-bold text-blue-400">{stats.totalRecipients.toLocaleString()}</div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-2">已发送</div>
          <div className="text-3xl font-bold text-yellow-400">{stats.completedRecipients.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.totalRecipients > 0 ? Math.round((stats.completedRecipients / stats.totalRecipients) * 100) : 0}% 发送率
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-2">Gas消耗</div>
          <div className="text-3xl font-bold text-purple-400">{stats.totalGasUsed.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">累计Gas</div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          onClick={() => navigate('/campaign/create')}
          className="bg-gray-800 p-6 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center mb-3">
            <div className="text-2xl mr-3">➕</div>
            <h3 className="text-lg font-semibold">创建新活动</h3>
          </div>
          <p className="text-gray-400 text-sm">创建新的批量发奖活动，自动部署智能合约</p>
        </div>

        <div
          onClick={() => navigate('/history')}
          className="bg-gray-800 p-6 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center mb-3">
            <div className="text-2xl mr-3">📜</div>
            <h3 className="text-lg font-semibold">查看历史</h3>
          </div>
          <p className="text-gray-400 text-sm">查看历史发奖记录和交易详情</p>
        </div>

        <div
          onClick={() => navigate('/settings')}
          className="bg-gray-800 p-6 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center mb-3">
            <div className="text-2xl mr-3">⚙️</div>
            <h3 className="text-lg font-semibold">系统设置</h3>
          </div>
          <p className="text-gray-400 text-sm">管理区块链网络和钱包设置</p>
        </div>
      </div>

      {/* 进行中的活动 */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">🚀 进行中的活动</h2>
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            查看全部 →
          </button>
        </div>

        {activeCampaigns.length === 0 ? (
          <div className="text-gray-400 text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <div className="mb-3">暂无进行中的活动</div>
            <button
              onClick={() => navigate('/campaign/create')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              创建第一个活动
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeCampaigns.map((campaign) => (
              <div key={campaign.id} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{campaign.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>📍 {getChainName(campaign.chain)}</span>
                      <span>👥 {campaign.completedRecipients}/{campaign.totalRecipients} 地址</span>
                      <span>📅 {new Date(campaign.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
                      {getStatusText(campaign.status)}
                    </span>
                    <button
                      onClick={() => navigate(`/campaign/${campaign.id}`)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                    >
                      查看详情
                    </button>
                  </div>
                </div>

                {/* 进度条 */}
                {campaign.totalRecipients > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>发送进度</span>
                      <span>{campaign.completedRecipients}/{campaign.totalRecipients}</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${campaign.totalRecipients > 0 ? (campaign.completedRecipients / campaign.totalRecipients) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 最近活动 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">📋 最近活动</h2>
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            查看全部 →
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            <div className="text-3xl mb-2">🔍</div>
            <div>暂无活动记录</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-3">活动名称</th>
                  <th className="pb-3">状态</th>
                  <th className="pb-3">区块链</th>
                  <th className="pb-3">收币地址</th>
                  <th className="pb-3">创建时间</th>
                  <th className="pb-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 5).map((campaign) => (
                  <tr key={campaign.id} className="border-b border-gray-700">
                    <td className="py-3">
                      <div className="font-medium">{campaign.name}</div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {getStatusText(campaign.status)}
                      </span>
                    </td>
                    <td className="py-3 text-gray-300">{getChainName(campaign.chain)}</td>
                    <td className="py-3 text-gray-300">
                      {campaign.completedRecipients}/{campaign.totalRecipients}
                    </td>
                    <td className="py-3 text-gray-300">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => navigate(`/campaign/${campaign.id}`)}
                        className="text-indigo-400 hover:text-indigo-300 text-sm"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
