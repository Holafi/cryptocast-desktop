export default function Settings() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">设置</h1>

      <div className="space-y-6">
        {/* EVM链管理 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">🌐 EVM链管理</h2>
          <p className="text-gray-400">链管理功能（待实现）</p>
        </div>

        {/* Solana网络管理 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">🌐 Solana网络管理</h2>
          <p className="text-gray-400">Solana RPC管理（待实现）</p>
        </div>

        {/* 数据管理 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">💾 数据管理</h2>
          <p className="text-gray-400">数据目录和备份（待实现）</p>
        </div>
      </div>
    </div>
  );
}
