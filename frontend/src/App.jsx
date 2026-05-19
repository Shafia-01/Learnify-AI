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
import Library from './pages/Library';
import client from './api/client';
import Layout from './components/Layout';
import { ToastProvider } from './context/ToastContext';
import { logEvent } from './api/analytics';

import MLMonitor from './pages/MLMonitor';

function App() {
  useEffect(() => {
    // Migration: Remove defunct model names from localStorage
    if (localStorage.getItem('model') === 'gemini-3.1-flash-lite') {
      localStorage.removeItem('model');
      localStorage.removeItem('provider');
    }

    // On app load, restore the last used provider from localStorage
    const savedProvider = localStorage.getItem('provider');
    const savedModel = localStorage.getItem('model');
    if (savedProvider && savedModel) {
      client.post('/api/settings/provider', { provider: savedProvider.toLowerCase(), model: savedModel })
        .catch(err => console.error("Failed to restore provider on load", err));
    }
  }, []);

  useEffect(() => {
    let lastActivity = Date.now();
    const sessionId = Math.random().toString(36).substring(2, 15);

    const handleActivity = () => {
      lastActivity = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // Initial session start
    const initialUserId = localStorage.getItem('user_id') || 'default';
    logEvent({ session_id: sessionId, user_id: initialUserId, event_type: 'session_start' }).catch(() => {});

    const intervalId = setInterval(() => {
      // If user was active in the last minute
      if (Date.now() - lastActivity < 60000) {
        const currentUserId = localStorage.getItem('user_id') || 'default';
        logEvent({ session_id: sessionId, user_id: currentUserId, event_type: 'study_active' }).catch(() => {});
      }
    }, 60000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearInterval(intervalId);
    };
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
          <Route path="/library" element={<Library />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
