import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [language, setLanguage] = useState('');
  const navigate = useNavigate();

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleComplete = () => {
    const userId = crypto.randomUUID();
    localStorage.setItem('user_id', userId);
    localStorage.setItem('name', name);
    localStorage.setItem('level', level);
    localStorage.setItem('language', language);
    navigate('/upload');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800 p-8 rounded-xl shadow-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-400">Welcome to Learnify AI</h1>
        
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-xl">Step 1: What's your name?</h2>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 outline-none"
              placeholder="Enter your name"
            />
            <button 
              onClick={handleNext}
              disabled={!name}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-xl mb-4">Step 2: Select your level</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { id: 'Beginner', desc: 'Starting from scratch. Needs simple explanations.' },
                { id: 'Intermediate', desc: 'Has some background knowledge. Needs deeper dives.' },
                { id: 'Advanced', desc: 'Expert level. Needs concise, technical answers.' }
              ].map((lvl) => (
                <div 
                  key={lvl.id}
                  onClick={() => setLevel(lvl.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${level === lvl.id ? 'border-blue-500 bg-gray-700' : 'border-gray-600 hover:border-gray-500'}`}
                >
                  <h3 className="font-bold text-lg">{lvl.id}</h3>
                  <p className="text-sm text-gray-400 mt-2">{lvl.desc}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={handleBack} className="w-1/3 py-3 bg-gray-600 hover:bg-gray-500 rounded font-semibold transition-colors">Back</button>
              <button 
                onClick={handleNext}
                disabled={!level}
                className="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-xl">Step 3: Select preferred language</h2>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded border border-gray-600 outline-none"
            >
              <option value="">Choose a language</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Urdu">Urdu</option>
              <option value="French">French</option>
              <option value="Spanish">Spanish</option>
              <option value="German">German</option>
            </select>
            <div className="flex gap-4 mt-6">
              <button onClick={handleBack} className="w-1/3 py-3 bg-gray-600 hover:bg-gray-500 rounded font-semibold transition-colors">Back</button>
              <button 
                onClick={handleComplete}
                disabled={!language}
                className="w-2/3 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold disabled:opacity-50 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
