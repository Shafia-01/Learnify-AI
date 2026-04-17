import React, { useState, useEffect } from 'react';
import client from '../api/client';

const Settings = () => {
  const [privacyMode, setPrivacyMode] = useState(false);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');
  const [level, setLevel] = useState(localStorage.getItem('level') || 'Beginner');

  const [provider, setProvider] = useState(localStorage.getItem('provider') || 'Gemini');
  const [model, setModel] = useState(localStorage.getItem('model') || '');
  const [availableModels, setAvailableModels] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState('unknown');

  // Mocked or fetched providers
  const providers = [
    { id: 'Gemini', name: 'Google Gemini', badge: 'Free', local: false, keyReq: false },
    { id: 'Groq', name: 'Groq LLaMA 3', badge: 'Free', local: false, keyReq: false },
    { id: 'Ollama', name: 'Ollama Local', badge: 'Completely Free', local: true, keyReq: false }
  ];

  useEffect(() => {
    localStorage.setItem('language', language);
    localStorage.setItem('level', level);
  }, [language, level]);

  const togglePrivacyMode = async () => {
    const newMode = !privacyMode;
    setPrivacyMode(newMode);
    try {
      await client.patch('/api/settings/privacy', { privacy_mode: newMode });
    } catch (e) {
      console.error("Failed to toggle privacy mode", e);
    }
  };

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await client.get(`/api/settings/providers?provider=${provider}`);
        setAvailableModels(res.data.models || []);
        if (provider === 'Ollama') {
          setOllamaStatus(res.data.status || 'available');
        }
      } catch (e) {
        // Fallback for mock frontend
        if (provider === 'Gemini') setAvailableModels(['gemini-pro', 'gemini-1.5-flash']);
        if (provider === 'Groq') setAvailableModels(['llama3-8b-8192', 'llama3-70b-8192']);
        if (provider === 'Ollama') {
          setAvailableModels(['llama3', 'mistral']);
          setOllamaStatus('unavailable'); // Mock check
        }
      }
    };
    fetchModels();
  }, [provider]);

  const handleSwitchProvider = async () => {
    if (!model) return;
    localStorage.setItem('provider', provider);
    localStorage.setItem('model', model);
    try {
      await client.post('/api/settings/provider', { provider, model });
      alert(`Successfully switched to ${provider} (${model})`);
    } catch (e) {
      alert("Error switching provider");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold border-b border-gray-700 pb-4">Settings</h1>

        {/* General Settings */}
        <section className="bg-gray-800 p-6 rounded-xl space-y-6">
          <h2 className="text-xl font-semibold text-blue-400">General</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">Privacy Mode</p>
              <p className="text-sm text-gray-400">Avoid sending analytics data.</p>
            </div>
            <button 
              onClick={togglePrivacyMode}
              className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 ${privacyMode ? 'bg-blue-500' : 'bg-gray-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${privacyMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>

          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
              <p className="font-bold mb-2">Language</p>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-gray-700 p-2 rounded outline-none border border-gray-600"
              >
                <option>English</option>
                <option>Hindi</option>
                <option>Urdu</option>
                <option>French</option>
                <option>Spanish</option>
                <option>German</option>
              </select>
            </div>
            <div className="flex-1">
              <p className="font-bold mb-2">Level</p>
              <select 
                value={level} 
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-gray-700 p-2 rounded outline-none border border-gray-600"
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
          </div>
        </section>

        {/* Model Provider Section */}
        <section className="bg-gray-800 p-6 rounded-xl space-y-6">
          <h2 className="text-xl font-semibold text-blue-400">Model Provider</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {providers.map(p => (
              <div 
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${provider === p.id ? 'border-blue-500 bg-gray-700' : 'border-gray-600 hover:border-gray-500'}`}
              >
                <h3 className="font-bold text-lg mb-2">{p.name}</h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-green-600/30 text-green-400 px-2 py-1 rounded">{p.badge}</span>
                  {p.local && <span className="bg-purple-600/30 text-purple-400 px-2 py-1 rounded">Local</span>}
                  <span className="bg-gray-600/50 text-gray-300 px-2 py-1 rounded">{p.keyReq ? 'Key Req' : 'No Key Req'}</span>
                </div>
              </div>
            ))}
          </div>

          {provider === 'Ollama' && ollamaStatus === 'unavailable' && (
            <div className="p-4 bg-red-900/40 border border-red-500 text-red-300 rounded-lg animate-pulse text-sm">
              <span className="font-bold text-red-400 flex items-center gap-2"><span>⚠️</span> Ollama is not running.</span>
              Start Ollama on your machine first.
            </div>
          )}

          <div>
            <p className="font-bold mb-2">Select Model</p>
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-gray-700 p-3 rounded-lg outline-none border border-gray-600 focus:border-blue-500 transition-colors"
            >
              <option value="">-- Choose a model --</option>
              {availableModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleSwitchProvider}
            disabled={!model || (provider === 'Ollama' && ollamaStatus === 'unavailable')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors disabled:opacity-50"
          >
            Switch Provider
          </button>
        </section>
        
      </div>
    </div>
  );
};

export default Settings;
