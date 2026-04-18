import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Onboarding from './pages/Onboarding';
import Upload from './pages/Upload';
import Chat from './pages/Chat';
import Quiz from './pages/Quiz';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import client from './api/client';

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
