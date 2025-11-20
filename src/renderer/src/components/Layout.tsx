import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

interface PriceInfo {
  eth: number;
  matic: number;
  sol: number;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [priceInfo, setPriceInfo] = useState<PriceInfo>({ eth: 0, matic: 0, sol: 0 });
  const [gasPrices, setGasPrices] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    updatePrices();
    const interval = setInterval(updatePrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const updatePrices = async () => {
    try {
      if (window.electronAPI?.price) {
        const prices = await window.electronAPI.price.getPrices(['ETH', 'MATIC', 'SOL']);
        setPriceInfo({
          eth: prices.ETH || 0,
          matic: prices.MATIC || 0,
          sol: prices.SOL || 0
        });

        try {
          const chains = await window.electronAPI.chain.getEVMChains(true);
          const ethChain = chains.find(c => c.name.toLowerCase().includes('ethereum'));
          const polygonChain = chains.find(c => c.name.toLowerCase().includes('polygon'));

          if (ethChain && priceInfo.eth > 0) {
            const ethGasInfo = await window.electronAPI.gas.getInfo(ethChain.rpcUrl, 'ethereum', priceInfo.eth);
            if (ethGasInfo.gasPrice) {
              setGasPrices(prev => ({
                ...prev,
                'ethereum': parseFloat(ethGasInfo.gasPrice)
              }));
            }
          }

          if (polygonChain && priceInfo.matic > 0) {
            const polygonGasInfo = await window.electronAPI.gas.getInfo(polygonChain.rpcUrl, 'polygon', priceInfo.matic);
            if (polygonGasInfo.gasPrice) {
              setGasPrices(prev => ({
                ...prev,
                'polygon': parseFloat(polygonGasInfo.gasPrice)
              }));
            }
          }
        } catch (error) {
          console.error('Failed to fetch gas prices:', error);
        }
      }
    } catch (error) {
      console.error('Failed to update prices:', error);
    }
  };

  const navItems = [
    { path: '/', label: '仪表盘', icon: '📊' },
    { path: '/campaign/create', label: '新建活动', icon: '➕' },
    { path: '/history', label: '历史记录', icon: '📜' },
    { path: '/settings', label: '系统设置', icon: '⚙️' },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatGasPrice = (gasPrice: number) => {
    return `${gasPrice.toFixed(0)} Gwei`;
  };

  return (
    <div className="flex h-screen bg-base-100 text-base-content">
      {/* 侧边栏 */}
      <aside className="w-72 bg-base-200 border-r border-base-300 flex flex-col">
        {/* Logo区域 */}
        <div className="p-6 border-b border-base-300">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-1">
            CryptoCast
          </h1>
          <p className="text-xs text-base-content/60">仪表盘 v1.0.0</p>
        </div>

        {/* 导航菜单 */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                location.pathname === item.path
                  ? 'bg-primary text-primary-content shadow-lg'
                  : 'text-base-content/70 hover:bg-base-300 hover:text-base-content'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* 价格和Gas信息 - 滚动区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 价格显示 */}
          <div className="card bg-base-300 shadow-sm">
            <div className="card-body p-4">
              <h3 className="text-xs font-semibold mb-3 text-primary uppercase tracking-wide flex items-center gap-2">
                <span>💰</span>
                实时价格
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-base-100 rounded-lg">
                  <span className="text-base-content/70 text-sm font-medium">ETH</span>
                  <span className="font-mono text-sm text-primary font-semibold">{formatPrice(priceInfo.eth)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-base-100 rounded-lg">
                  <span className="text-base-content/70 text-sm font-medium">MATIC</span>
                  <span className="font-mono text-sm text-secondary font-semibold">{formatPrice(priceInfo.matic)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-base-100 rounded-lg">
                  <span className="text-base-content/70 text-sm font-medium">SOL</span>
                  <span className="font-mono text-sm text-accent font-semibold">{formatPrice(priceInfo.sol)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gas价格显示 */}
          <div className="card bg-base-300 shadow-sm">
            <div className="card-body p-4">
              <h3 className="text-xs font-semibold mb-3 text-secondary uppercase tracking-wide flex items-center gap-2">
                <span>⚡</span>
                Gas价格
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-base-100 rounded-lg">
                  <span className="text-base-content/70 text-sm font-medium">Ethereum</span>
                  <span className="font-mono text-sm text-warning font-semibold">
                    {gasPrices.ethereum ? formatGasPrice(gasPrices.ethereum) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-base-100 rounded-lg">
                  <span className="text-base-content/70 text-sm font-medium">Polygon</span>
                  <span className="font-mono text-sm text-success font-semibold">
                    {gasPrices.polygon ? formatGasPrice(gasPrices.polygon) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto bg-base-100">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
