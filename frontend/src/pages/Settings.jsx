import { useState, useEffect } from 'react';
import { getSettingsStatus, getAvailableProviders, switchProvider, togglePrivacyMode as apiTogglePrivacy } from '../api/settings';

const Settings = () => {
    const [privacyMode, setPrivacyMode] = useState(false);
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');
    const [level, setLevel] = useState(localStorage.getItem('level') || 'Beginner');

    const [provider, setProvider] = useState(localStorage.getItem('provider') || 'gemini');
    const [model, setModel] = useState(localStorage.getItem('model') || '');
    const [providersData, setProvidersData] = useState([]);
    const [availableModels, setAvailableModels] = useState([]);
    const [ollamaStatus, setOllamaStatus] = useState('available');
    
    const [toast, setToast] = useState(null);

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await getSettingsStatus();
                if (data) {
                    setPrivacyMode(data.privacy_mode);
                    if (!localStorage.getItem('provider')) {
                        setProvider(data.llm_provider);
                        setModel(data.current_model);
                    }
                }
            } catch (err) { console.error(err); }
        };
        fetchStatus();
    }, []);

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const data = await getAvailableProviders();
                if (data && data.providers) {
                    setProvidersData(data.providers);
                    const current = data.providers.find(p => p.id === provider);
                    setAvailableModels(current?.models || []);
                    if (provider === 'ollama') setOllamaStatus(current?.status || 'available');
                }
            } catch (err) {
                // Fallback for demo
                const mock = [
                    { id: 'gemini', name: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash'], status: 'available' },
                    { id: 'groq', name: 'Groq LLaMA', models: ['llama-3.1-8b', 'llama-3.1-70b'], status: 'available' },
                    { id: 'ollama', name: 'Ollama Local', models: ['llama3', 'mistral'], status: 'unavailable' }
                ];
                setProvidersData(mock);
                const current = mock.find(p => p.id === provider);
                setAvailableModels(current?.models || []);
                if (provider === 'ollama') setOllamaStatus('unavailable');
            }
        };
        fetchProviders();
    }, [provider]);

    const handleTogglePrivacy = async () => {
        const next = !privacyMode;
        setPrivacyMode(next);
        try {
            await apiTogglePrivacy(next);
            showToast(`Privacy mode ${next ? 'enabled' : 'disabled'}`);
        } catch (err) {
            setPrivacyMode(!next);
            showToast("Failed to update privacy settings");
        }
    };

    const handleSwitch = async () => {
        if (!model) return;
        try {
            await switchProvider(provider, model);
            localStorage.setItem('provider', provider);
            localStorage.setItem('model', model);
            showToast(`Switched to ${provider} (${model})`);
        } catch (err) {
            showToast("Error switching provider");
        }
    };

    const handleGeneralChange = (type, val) => {
        if (type === 'language') setLanguage(val);
        if (type === 'level') setLevel(val);
        localStorage.setItem(type, val);
        showToast(`${type} updated`);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-page-enter relative pb-20">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-2.5 rounded-full text-[12px] font-bold shadow-2xl flex items-center gap-2 z-[100] animate-[slideUp_0.3s_ease-out]">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                    {toast}
                </div>
            )}

            <header className="pb-2">
                <h1 className="text-[20px] font-black text-gray-800 tracking-tight">Settings</h1>
                <p className="text-[13px] text-gray-500 font-medium">Configure your AI experience and preferences</p>
            </header>

            {/* General Section */}
            <div className="card p-6 bg-white border-[0.5px] border-[#3B82F6]/20 space-y-6">
                <div className="text-[13px] font-bold text-[#1E40AF] uppercase tracking-wider">General</div>
                
                <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                        <div className="text-[14px] font-bold text-gray-800">Privacy Mode</div>
                        <div className="text-[11px] text-gray-400 font-medium leading-normal max-w-[280px]">
                            When enabled, session data won't be sent to our analytics server.
                        </div>
                    </div>
                    <button 
                        onClick={handleTogglePrivacy}
                        className={`w-11 h-5.5 rounded-full relative transition-all duration-300 ${privacyMode ? 'bg-[#3B82F6]' : 'bg-gray-200'}`}
                    >
                        <div className={`absolute top-0.75 left-0.75 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${privacyMode ? 'translate-x-5.5' : 'translate-x-0'}`}></div>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Preferred Language</label>
                        <select 
                            value={language}
                            onChange={(e) => handleGeneralChange('language', e.target.value)}
                            className="w-full bg-white border border-[#3B82F6]/25 rounded-[8px] px-3 py-2 text-[13px] font-bold text-gray-700 outline-none focus:ring-2 ring-blue-500/10 focus:border-[#3B82F6] transition-all"
                        >
                            <option>English</option>
                            <option>Spanish</option>
                            <option>French</option>
                            <option>German</option>
                            <option>Hindi</option>
                            <option>Urdu</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Learning Level</label>
                        <select 
                            value={level}
                            onChange={(e) => handleGeneralChange('level', e.target.value)}
                            className="w-full bg-white border border-[#3B82F6]/25 rounded-[8px] px-3 py-2 text-[13px] font-bold text-gray-700 outline-none focus:ring-2 ring-blue-500/10 focus:border-[#3B82F6] transition-all"
                        >
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* AI Provider Section */}
            <div className="card p-6 bg-white border-[0.5px] border-[#3B82F6]/20 space-y-6">
                <div className="text-[13px] font-bold text-[#1E40AF] uppercase tracking-wider">AI Model Provider</div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {['gemini', 'groq', 'ollama'].map((pId) => {
                        const isSelected = provider === pId;
                        const pName = pId === 'gemini' ? 'Google Gemini' : pId === 'groq' ? 'Groq LLaMA' : 'Ollama Local';
                        return (
                            <button
                                key={pId}
                                onClick={() => setProvider(pId)}
                                className={`p-4 rounded-[12px] border transition-all text-center space-y-2 ${
                                    isSelected 
                                        ? 'border-[#3B82F6] bg-[#EFF6FF] ring-2 ring-blue-500/5' 
                                        : 'border-gray-100 hover:border-[#3B82F6]/30 bg-gray-50/50'
                                }`}
                            >
                                <div className={`text-[13px] font-bold ${isSelected ? 'text-[#3B82F6]' : 'text-gray-500'}`}>
                                    {pName}
                                </div>
                                <div className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full inline-block ${
                                    isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'
                                }`}>
                                    {pId === 'ollama' ? 'OFFLINE' : 'CLOUD'}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {provider === 'ollama' && ollamaStatus === 'unavailable' && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-[10px] flex gap-3 items-center animate-[shake_0.5s_ease-in-out]">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-red-600 font-bold">!</span>
                        </div>
                        <div className="text-[12px] text-red-800 font-medium">
                            <span className="font-bold block">Ollama is not running.</span>
                            Start Ollama on your machine first.
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Active Model</label>
                    <select 
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-white border border-[#3B82F6]/25 rounded-[10px] px-4 py-3 text-[14px] font-bold text-gray-800 outline-none focus:border-[#3B82F6] transition-all"
                    >
                        <option value="">-- Select a model --</option>
                        {availableModels.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                <button 
                    onClick={handleSwitch}
                    disabled={!model || (provider === 'ollama' && ollamaStatus === 'unavailable')}
                    className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white py-3.5 rounded-[12px] font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    Switch Provider
                </button>
            </div>

            {/* Danger Zone Section */}
            <div className="card p-6 bg-red-50/30 border-[0.5px] border-red-500/20 space-y-6">
                <div className="text-[13px] font-bold text-red-600 uppercase tracking-wider">Danger Zone</div>
                
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <div className="text-[14px] font-bold text-gray-800">Fresh Start</div>
                        <div className="text-[11px] text-red-600/70 font-medium leading-normal max-w-[280px]">
                            Clear all local data and re-authenticate to start from scratch.
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            if (window.confirm("Are you sure? This will log you out and clear all your local session data.")) {
                                localStorage.clear();
                                window.location.href = '/onboarding';
                            }
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-[12px] font-bold transition-all shadow-md active:scale-95"
                    >
                        Reset All Data
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translate(-50%, 20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
            `}</style>
        </div>
    );
};

export default Settings;
