import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CampaignCreate from './pages/CampaignCreate';
import CampaignDetail from './pages/CampaignDetail';
import History from './pages/History';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaign/create" element={<CampaignCreate />} />
          <Route path="/campaign/:id" element={<CampaignDetail />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
