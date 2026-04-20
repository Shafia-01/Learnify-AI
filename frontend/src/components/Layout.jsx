import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import EmotionPanel from './EmotionPanel';

const pageStyles = {
  '/dashboard': { bg: '#FDFAF4', accent: '#7C3AED' },
  '/chat': { bg: '#F5F0FF', accent: '#8B5CF6' },
  '/quiz': { bg: '#F7FFED', accent: '#84CC16' },
  '/upload': { bg: '#FFF7F3', accent: '#F97316' },
  '/games': { bg: '#FEFCE8', accent: '#EAB308' },
  '/settings': { bg: '#EFF6FF', accent: '#3B82F6' },
  '/knowledge-graph': { bg: '#F0FDFA', accent: '#14B8A6' },
  '/analytics': { bg: '#F0F9FF', accent: '#60A5FA' },
  '/ml-monitor': { bg: '#FDF2F8', accent: '#F472B6' },
  '/onboarding': { bg: '#FFF0F6', accent: '#EC4899' },
};

const Layout = ({ children }) => {
  const [showMLPanel, setShowMLPanel] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;
  
  const style = pageStyles[currentPath] || { bg: '#FDFAF4', accent: '#7C3AED' };
  const isOnboarding = currentPath === '/onboarding' || currentPath === '/';

  if (isOnboarding) {
    return (
      <div 
        className="min-h-screen transition-colors duration-500 flex flex-col" 
        style={{ backgroundColor: style.bg }}
      >
        {children}
      </div>
    );
  }

  return (
    <div 
        className="h-screen flex flex-col transition-colors duration-500 overflow-hidden text-[#1a1a1a]"
        style={{ backgroundColor: style.bg, '--accent': style.accent }}
    >
      <Topbar />

      <div className="flex flex-1 mt-[--topbar-height] relative overflow-hidden">
        <Sidebar aria-label="Sidebar Navigation" />

        <main 
            className={`flex-1 overflow-y-auto pt-10 pb-8 px-8 lg:pt-16 lg:pb-12 lg:px-20 transition-all duration-300 ${showMLPanel ? 'mr-80' : ''}`}
            style={{ scrollBehavior: 'smooth' }}
        >
          <div className="max-w-7xl mx-auto space-y-16">
            {children}
          </div>
          <div className="h-20 w-full flex-shrink-0" />
        </main>

        {/* Floating ML Control Button */}
        {currentPath !== '/ml-monitor' && (
          <button 
            onClick={() => setShowMLPanel(!showMLPanel)}
            className={`fixed right-6 bottom-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${showMLPanel ? 'bg-red-500 hover:bg-red-600 rotate-45' : 'bg-purple-600 hover:bg-purple-700'}`}
            title={showMLPanel ? "Close ML Monitor" : "Open ML Monitor"}
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showMLPanel ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              )}
              {!showMLPanel && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
            </svg>
          </button>
        )}

        {/* Global ML Side Panel */}
        {showMLPanel && currentPath !== '/ml-monitor' && (
          <aside className="fixed right-0 top-[--topbar-height] bottom-0 w-80 bg-black/90 backdrop-blur-xl border-l border-white/10 z-40 p-4 transition-all animate-in slide-in-from-right duration-300">
            <div className="h-full overflow-y-auto custom-scrollbar">
              <EmotionPanel sessionId="global-session" />
              <div className="mt-8 p-4 bg-white/5 rounded-xl text-xs text-white/60 leading-relaxed">
                <p className="font-bold text-white/80 mb-1">Active Monitoring</p>
                The AI is currently analyzing your state to provide real-time interventions during your learning session.
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default Layout;
