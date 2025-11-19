export default function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">仪表盘</h1>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* 统计卡片 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-2">总活动数</div>
          <div className="text-3xl font-bold">0</div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-2">成功发送</div>
          <div className="text-3xl font-bold">0</div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-2">总Gas消耗</div>
          <div className="text-3xl font-bold">0 ETH</div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">进行中的活动</h2>
        <div className="text-gray-400 text-center py-8">
          暂无进行中的活动
        </div>
      </div>
    </div>
  );
}
