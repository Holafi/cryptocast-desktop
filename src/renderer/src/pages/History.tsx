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

export default function History() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      if (window.electronAPI?.campaign) {
        const campaignList = await window.electronAPI.campaign.list();
        setCampaigns(campaignList);
      }
    } catch (error) {
      console.error('加载历史活动失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400 bg-green-900/20';
      case 'SENDING': return 'text-yellow-400 bg-yellow-900/20';
      case 'FAILED': return 'text-red-400 bg-red-900/20';
      case 'PAUSED': return 'text-orange-400 bg-orange-900/20';
      case 'READY': return 'text-blue-400 bg-blue-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
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

  const filteredCampaigns = campaigns
    .filter(campaign => {
      // Filter by status
      if (filter !== 'all' && campaign.status !== filter) {
        return false;
      }

      // Filter by search term
      if (searchTerm && !campaign.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const exportReport = async (campaignId: string, format: string) => {
    try {
      if (window.electronAPI?.file) {
        const result = await window.electronAPI.file.exportReport(campaignId, format);
        if (result.success) {
          alert(`${format.toUpperCase()}报告已导出到: ${result.filePath}`);
        }
      }
    } catch (error) {
      console.error('导出报告失败:', error);
      alert('导出失败');
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">历史活动</h1>
        <div className="text-center py-12">
          <div className="text-gray-400">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">历史活动</h1>
        <button
          onClick={() => navigate('/campaign/create')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          ➕ 创建新活动
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm mb-1">总活动数</div>
          <div className="text-2xl font-bold">{campaigns.length}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm mb-1">已完成</div>
          <div className="text-2xl font-bold text-green-400">
            {campaigns.filter(c => c.status === 'COMPLETED').length}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm mb-1">进行中</div>
          <div className="text-2xl font-bold text-yellow-400">
            {campaigns.filter(c => ['READY', 'SENDING'].includes(c.status)).length}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm mb-1">总地址数</div>
          <div className="text-2xl font-bold text-blue-400">
            {campaigns.reduce((sum, c) => sum + c.totalRecipients, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 筛选和搜索 */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">搜索活动</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="输入活动名称..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">状态筛选</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">全部状态</option>
              <option value="READY">就绪</option>
              <option value="SENDING">发送中</option>
              <option value="COMPLETED">已完成</option>
              <option value="PAUSED">已暂停</option>
              <option value="FAILED">失败</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">排序方式</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'name' | 'status')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="createdAt">创建时间</option>
              <option value="name">活动名称</option>
              <option value="status">状态</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">排序顺序</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </div>
        </div>
      </div>

      {/* 活动列表 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-gray-400 mb-4">暂无符合条件的活动记录</div>
            <button
              onClick={() => navigate('/campaign/create')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              创建第一个活动
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop View */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="pb-3">活动名称</th>
                      <th className="pb-3">状态</th>
                      <th className="pb-3">区块链</th>
                      <th className="pb-3">收币地址</th>
                      <th className="pb-3">完成进度</th>
                      <th className="pb-3">创建时间</th>
                      <th className="pb-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.map((campaign) => (
                      <tr key={campaign.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="py-4">
                          <div className="font-medium">{campaign.name}</div>
                          {campaign.walletAddress && (
                            <div className="text-xs text-gray-400 font-mono mt-1">
                              {campaign.walletAddress.slice(0, 6)}...{campaign.walletAddress.slice(-4)}
                            </div>
                          )}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                            {getStatusText(campaign.status)}
                          </span>
                        </td>
                        <td className="py-4 text-gray-300">{getChainName(campaign.chain)}</td>
                        <td className="py-4">
                          <div className="text-gray-300">
                            {campaign.completedRecipients}/{campaign.totalRecipients}
                          </div>
                          {campaign.totalRecipients > 0 && (
                            <div className="text-xs text-gray-400">
                              {Math.round((campaign.completedRecipients / campaign.totalRecipients) * 100)}%
                            </div>
                          )}
                        </td>
                        <td className="py-4">
                          {campaign.totalRecipients > 0 && (
                            <div className="w-24">
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{
                                    width: `${(campaign.completedRecipients / campaign.totalRecipients) * 100}%`
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-4 text-gray-300">
                          <div>{new Date(campaign.createdAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(campaign.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => navigate(`/campaign/${campaign.id}`)}
                              className="text-indigo-400 hover:text-indigo-300 text-sm"
                            >
                              详情
                            </button>
                            {campaign.status === 'COMPLETED' && (
                              <>
                                <span className="text-gray-600">|</span>
                                <button
                                  onClick={() => exportReport(campaign.id, 'csv')}
                                  className="text-green-400 hover:text-green-300 text-sm"
                                >
                                  CSV
                                </button>
                                <button
                                  onClick={() => exportReport(campaign.id, 'json')}
                                  className="text-blue-400 hover:text-blue-300 text-sm"
                                >
                                  JSON
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
              {filteredCampaigns.map((campaign) => (
                <div key={campaign.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{campaign.name}</h3>
                      {campaign.walletAddress && (
                        <div className="text-xs text-gray-400 font-mono mt-1">
                          {campaign.walletAddress.slice(0, 6)}...{campaign.walletAddress.slice(-4)}
                        </div>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {getStatusText(campaign.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-3">
                    <div>📍 {getChainName(campaign.chain)}</div>
                    <div>📅 {new Date(campaign.createdAt).toLocaleDateString()}</div>
                    <div>👥 {campaign.completedRecipients}/{campaign.totalRecipients}</div>
                    <div>📊 {campaign.totalRecipients > 0 ? Math.round((campaign.completedRecipients / campaign.totalRecipients) * 100) : 0}%</div>
                  </div>

                  {campaign.totalRecipients > 0 && (
                    <div className="mb-3">
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${(campaign.completedRecipients / campaign.totalRecipients) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => navigate(`/campaign/${campaign.id}`)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                    >
                      查看详情
                    </button>
                    {campaign.status === 'COMPLETED' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => exportReport(campaign.id, 'csv')}
                          className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => exportReport(campaign.id, 'json')}
                          className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                        >
                          JSON
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
