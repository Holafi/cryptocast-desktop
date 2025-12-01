import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { CampaignProvider } from './contexts/CampaignContext';
import Layout from './components/Layout';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CampaignCreate = lazy(() => import('./pages/CampaignCreate'));
const CampaignDetail = lazy(() => import('./pages/CampaignDetail'));
const History = lazy(() => import('./pages/History'));
const Settings = lazy(() => import('./pages/Settings'));
const WalletManagement = lazy(() => import('./pages/WalletManagement'));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="loading loading-spinner loading-lg"></div>
    </div>
  );
}

function App() {
  return (
    <CampaignProvider>
      <Router>
        <Layout>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/campaign/create" element={<CampaignCreate />} />
              <Route path="/campaign/:id" element={<CampaignDetail />} />
              <Route path="/history" element={<History />} />
              <Route path="/wallets" element={<WalletManagement />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </CampaignProvider>
  );
}

export default App;