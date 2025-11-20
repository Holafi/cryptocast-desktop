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
      case 'COMPLETED': return 'badge-accent';
      case 'SENDING': return 'badge-warning';
      case 'FAILED': return 'badge-error';
      case 'PAUSED': return 'badge-warning';
      case 'READY': return 'badge-info';
      default: return 'badge-ghost';
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
      {/* Hero Section with Welcome Banner */}
      <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-6 md:p-8 border border-primary/20">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                欢迎回来
              </h1>
              <p className="text-base text-base-content/70">通过 CryptoCast 管理您的加密货币空投活动</p>
            </div>
            <button
              onClick={() => navigate('/campaign/create')}
              className="btn btn-primary gap-2 shadow-lg hover:shadow-primary/50 transition-all hover:scale-105"
            >
              <span className="text-xl">➕</span>
              创建新活动
            </button>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-3 gap-4 md:gap-6 mt-6">
            <div className="text-center md:text-left">
              <div className="text-2xl md:text-3xl font-bold text-primary">{stats.totalCampaigns}</div>
              <div className="text-xs md:text-sm text-base-content/60 mt-1">活动总数</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-2xl md:text-3xl font-bold text-accent">{stats.completedCampaigns}</div>
              <div className="text-xs md:text-sm text-base-content/60 mt-1">已完成</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-2xl md:text-3xl font-bold text-secondary">{stats.totalRecipients.toLocaleString()}</div>
              <div className="text-xs md:text-sm text-base-content/60 mt-1">总接收地址</div>
            </div>
          </div>
        </div>
      </div>

      {/* 详细统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-primary/10 to-primary/5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-primary/20">
          <div className="card-body">
            <div className="flex justify-between items-start mb-4">
              <div className="badge badge-primary badge-sm">活动</div>
              <div className="text-4xl opacity-20">📊</div>
            </div>
            <div className="text-4xl font-bold text-primary mb-2">{stats.totalCampaigns}</div>
            <div className="text-sm text-base-content/70 font-medium">总活动数</div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-2 flex-1 bg-base-300 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{width: '100%'}}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-accent/10 to-accent/5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-accent/20">
          <div className="card-body">
            <div className="flex justify-between items-start mb-4">
              <div className="badge badge-accent badge-sm">完成</div>
              <div className="text-4xl opacity-20">✅</div>
            </div>
            <div className="text-4xl font-bold text-accent mb-2">{stats.completedCampaigns}</div>
            <div className="text-sm text-base-content/70 font-medium">已完成活动</div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-base-content/60 mb-1">
                <span>完成率</span>
                <span className="font-bold text-accent">
                  {stats.totalCampaigns > 0 ? Math.round((stats.completedCampaigns / stats.totalCampaigns) * 100) : 0}%
                </span>
              </div>
              <progress
                className="progress progress-accent"
                value={stats.completedCampaigns}
                max={stats.totalCampaigns || 1}
              ></progress>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-secondary/10 to-secondary/5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-secondary/20">
          <div className="card-body">
            <div className="flex justify-between items-start mb-4">
              <div className="badge badge-secondary badge-sm">地址</div>
              <div className="text-4xl opacity-20">👥</div>
            </div>
            <div className="text-4xl font-bold text-secondary mb-2">{stats.totalRecipients.toLocaleString()}</div>
            <div className="text-sm text-base-content/70 font-medium">总收币地址数</div>
            <div className="mt-4 text-xs text-base-content/60">
              <span className="font-semibold text-secondary">{stats.completedRecipients.toLocaleString()}</span> 已发送
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-warning/10 to-warning/5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-warning/20">
          <div className="card-body">
            <div className="flex justify-between items-start mb-4">
              <div className="badge badge-warning badge-sm">Gas</div>
              <div className="text-4xl opacity-20">⚡</div>
            </div>
            <div className="text-4xl font-bold text-warning mb-2">{stats.totalGasUsed.toLocaleString()}</div>
            <div className="text-sm text-base-content/70 font-medium">累计 Gas 消耗</div>
            <div className="mt-4 text-xs text-base-content/60">
              单位: Gwei
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 - 两栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 左侧：进行中的活动 + 最近活动 */}
        <div className="lg:col-span-2 space-y-6">

          {/* 进行中的活动 */}
          <div className="card bg-base-300 shadow-xl border border-base-content/5">
            <div className="card-body">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-xl">🚀</span>
                  </div>
                  <h2 className="text-2xl font-bold">进行中的活动</h2>
                </div>
                <button
                  onClick={() => navigate('/history')}
                  className="btn btn-ghost btn-sm gap-2 text-primary hover:text-primary"
                >
                  查看全部
                  <span>→</span>
                </button>
              </div>

              {activeCampaigns.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-base-100 flex items-center justify-center">
                    <span className="text-5xl">📋</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">暂无进行中的活动</h3>
                  <p className="text-base-content/60 mb-6">开始您的第一个空投活动</p>
                  <button
                    onClick={() => navigate('/campaign/create')}
                    className="btn btn-primary gap-2"
                  >
                    <span className="text-xl">➕</span>
                    创建第一个活动
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCampaigns.map((campaign) => (
                    <div key={campaign.id} className="group bg-base-100 p-5 rounded-xl hover:shadow-lg transition-all duration-300 border border-base-content/5 hover:border-primary/30">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">{campaign.name}</h3>
                          <div className="flex flex-wrap gap-3">
                            <div className="badge badge-outline gap-2">
                              <span>📍</span>
                              {getChainName(campaign.chain)}
                            </div>
                            <div className="badge badge-outline gap-2">
                              <span>👥</span>
                              {campaign.totalRecipients.toLocaleString()} 地址
                            </div>
                            <div className="badge badge-outline gap-2">
                              <span>📅</span>
                              {new Date(campaign.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <span className={`badge badge-lg ${getStatusColor(campaign.status)} gap-2`}>
                            {getStatusText(campaign.status)}
                          </span>
                          <button
                            onClick={() => navigate(`/campaign/${campaign.id}`)}
                            className="btn btn-sm btn-primary"
                          >
                            查看详情
                          </button>
                        </div>
                      </div>

                      {/* 进度条 */}
                      {campaign.totalRecipients > 0 && (
                        <div className="mt-4 p-4 bg-base-200/50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-base-content/70">发送进度</span>
                            <span className="text-sm font-bold text-accent">
                              {campaign.completedRecipients.toLocaleString()} / {campaign.totalRecipients.toLocaleString()}
                              <span className="text-xs ml-2 text-base-content/60">
                                ({campaign.totalRecipients > 0 ? Math.round((campaign.completedRecipients / campaign.totalRecipients) * 100) : 0}%)
                              </span>
                            </span>
                          </div>
                          <progress
                            className="progress progress-accent w-full h-3"
                            value={campaign.completedRecipients}
                            max={campaign.totalRecipients}
                          ></progress>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 最近活动列表 */}
          <div className="card bg-base-300 shadow-xl border border-base-content/5">
            <div className="card-body">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <span className="text-xl">📋</span>
                  </div>
                  <h2 className="text-2xl font-bold">最近活动</h2>
                </div>
                <button
                  onClick={() => navigate('/history')}
                  className="btn btn-ghost btn-sm gap-2 text-primary hover:text-primary"
                >
                  查看全部
                  <span>→</span>
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-base-100 flex items-center justify-center">
                    <span className="text-5xl">🔍</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">暂无活动记录</h3>
                  <p className="text-base-content/60">创建活动后将在此处显示</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr className="border-b border-base-content/10">
                        <th className="bg-transparent text-base-content/80 font-semibold">活动名称</th>
                        <th className="bg-transparent text-base-content/80 font-semibold">状态</th>
                        <th className="bg-transparent text-base-content/80 font-semibold">区块链</th>
                        <th className="bg-transparent text-base-content/80 font-semibold">进度</th>
                        <th className="bg-transparent text-base-content/80 font-semibold">创建时间</th>
                        <th className="bg-transparent text-base-content/80 font-semibold">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.slice(0, 5).map((campaign) => (
                        <tr key={campaign.id} className="hover:bg-base-100/50 transition-colors">
                          <td>
                            <div className="font-semibold text-base-content">{campaign.name}</div>
                          </td>
                          <td>
                            <span className={`badge ${getStatusColor(campaign.status)}`}>
                              {getStatusText(campaign.status)}
                            </span>
                          </td>
                          <td>
                            <div className="badge badge-outline">{getChainName(campaign.chain)}</div>
                          </td>
                          <td className="text-base-content/80">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm">{campaign.completedRecipients}/{campaign.totalRecipients}</span>
                              <progress
                                className="progress progress-accent w-20 h-1"
                                value={campaign.completedRecipients}
                                max={campaign.totalRecipients || 1}
                              ></progress>
                            </div>
                          </td>
                          <td className="text-base-content/70 text-sm">
                            {new Date(campaign.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <button
                              onClick={() => navigate(`/campaign/${campaign.id}`)}
                              className="btn btn-ghost btn-xs text-primary hover:text-primary"
                            >
                              详情
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
        </div>

        {/* 右侧：快速操作 */}
        <div className="space-y-6">
          <div className="card bg-base-300 shadow-xl border border-base-content/5">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
                <h2 className="text-2xl font-bold">快速操作</h2>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/campaign/create')}
                  className="btn btn-primary w-full justify-start gap-3 h-auto py-4 hover:scale-105 transition-transform"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-content/20 flex items-center justify-center">
                    <span className="text-2xl">➕</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-base">创建新活动</div>
                    <div className="text-xs opacity-70">部署智能合约发起空投</div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/history')}
                  className="btn btn-outline w-full justify-start gap-3 h-auto py-4 hover:scale-105 transition-transform"
                >
                  <div className="w-10 h-10 rounded-lg bg-base-100 flex items-center justify-center">
                    <span className="text-2xl">📜</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-base">查看历史</div>
                    <div className="text-xs opacity-70">浏览所有活动记录</div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/settings')}
                  className="btn btn-outline w-full justify-start gap-3 h-auto py-4 hover:scale-105 transition-transform"
                >
                  <div className="w-10 h-10 rounded-lg bg-base-100 flex items-center justify-center">
                    <span className="text-2xl">⚙️</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-base">系统设置</div>
                    <div className="text-xs opacity-70">管理网络和钱包</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* 帮助和资源 */}
          <div className="card bg-gradient-to-br from-info/10 to-info/5 shadow-xl border border-info/20">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
                  <span className="text-xl">💡</span>
                </div>
                <h3 className="font-bold text-lg">需要帮助？</h3>
              </div>
              <p className="text-sm text-base-content/70 mb-4">
                查看使用指南，了解如何高效管理您的加密货币空投活动。
              </p>
              <div className="space-y-2">
                <a href="#" className="btn btn-sm btn-ghost w-full justify-start gap-2">
                  <span>📖</span>
                  <span>使用文档</span>
                </a>
                <a href="#" className="btn btn-sm btn-ghost w-full justify-start gap-2">
                  <span>🎥</span>
                  <span>视频教程</span>
                </a>
                <a href="#" className="btn btn-sm btn-ghost w-full justify-start gap-2">
                  <span>💬</span>
                  <span>联系支持</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
