import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '📊 仪表盘', icon: '📊' },
    { path: '/campaign/create', label: '➕ 新建活动', icon: '➕' },
    { path: '/history', label: '📜 历史', icon: '📜' },
    { path: '/settings', label: '⚙️ 设置', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* 侧边栏 */}
      <aside className="w-64 bg-gray-800 p-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">批量发奖工具</h1>
          <p className="text-sm text-gray-400">v1.0.0</p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
