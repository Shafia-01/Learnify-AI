import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Onboarding from './pages/Onboarding';
import Upload from './pages/Upload';
import Chat from './pages/Chat';
import Quiz from './pages/Quiz';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Games from './pages/Games';
import GamePlaceholder from './pages/GamePlaceholder';
import KnowledgePage from './pages/KnowledgePage';
import AnalyticsPage from './pages/AnalyticsPage';
import client from './api/client';
import Layout from './components/Layout';
import { ToastProvider } from './context/ToastContext';

import MLMonitor from './pages/MLMonitor';

function App() {
  useEffect(() => {
    // On app load, restore the last used provider from localStorage
    const savedProvider = localStorage.getItem('provider');
    const savedModel = localStorage.getItem('model');
    if (savedProvider && savedModel) {
      client.post('/api/settings/provider', { provider: savedProvider.toLowerCase(), model: savedModel })
        .catch(err => console.error("Failed to restore provider on load", err));
    }
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/onboarding" />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/:gameId" element={<GamePlaceholder />} />
          <Route path="/knowledge-graph" element={<KnowledgePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/ml-monitor" element={<MLMonitor />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
