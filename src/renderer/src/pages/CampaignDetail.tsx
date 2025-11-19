import { useParams } from 'react-router-dom';

export default function CampaignDetail() {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">活动详情</h1>
      <div className="bg-gray-800 p-6 rounded-lg">
        <p>活动 ID: {id}</p>
        <p>详情页面（待实现）</p>
      </div>
    </div>
  );
}
