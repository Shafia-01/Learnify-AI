import React from 'react';
import { useLocation } from 'react-router-dom';
import { navItems, iconPaths } from '../utils/navigation';

const Topbar = () => {
    const location = useLocation();
    const provider = localStorage.getItem('provider') || 'Groq';
    const model = localStorage.getItem('model') || 'llama-3.1-8b';
    const name = localStorage.getItem('name') || 'User';

    const currentItem = navItems.find(item => item.path === location.pathname) || { label: 'Learnify AI', iconColor: '#7C3AED', iconName: 'Dashboard' };
    const currentTitle = currentItem.label;
    const currentIconPath = iconPaths[currentItem.iconName] || "M13 10V3L4 14h7v7l9-11h-7z";

  return (
    <header className="h-[--topbar-height] fixed top-0 left-0 right-0 bg-[var(--topbar-bg)] border-b border-white/10 text-white z-50 flex items-center justify-between px-8 backdrop-blur-xl bg-opacity-95 shadow-2xl">
      {/* Left Area: Offset by sidebar width to prevent overlap with sidebar area */}
      <div className="flex items-center gap-4 z-10 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width)' }}>
        <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105"
            style={{ backgroundColor: currentItem.iconColor + '25', border: `1px solid ${currentItem.iconColor}50` }}
        >
            <svg className="w-6 h-6" style={{ color: currentItem.iconColor }} fill="currentColor" viewBox="0 0 24 24">
                <path d={currentIconPath} />
            </svg>
        </div>
        <div className="flex flex-col">
            <span className="text-white font-black text-[18px] tracking-tight leading-none">{currentTitle}</span>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Workspace</span>
        </div>
      </div>

      {/* Center: Learnify AI Branding */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 select-none group pointer-events-none">
        <div className="w-8 h-8 bg-[#EC4899] rounded-[10px] flex items-center justify-center text-white text-[14px] font-black shadow-xl shadow-pink-500/40 group-hover:rotate-12 transition-all duration-500">L</div>
        <div className="flex flex-col items-start leading-none gap-0.5">
            <span className="text-[20px] font-black text-[#EC4899] tracking-tighter">Learnify AI</span>
            <span className="text-[9px] font-bold text-pink-400/60 uppercase tracking-[0.2em] ml-0.5">Live Learning</span>
        </div>
      </div>
      
      {/* Right: User & Status */}
      <div className="flex items-center gap-5 z-10">
        <div className="hidden lg:flex flex-col items-end mr-2">
            <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">{name}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[10px] font-black text-emerald-400/80 uppercase tracking-tighter">Active Tool</span>
            </div>
        </div>

        <div className="hidden sm:flex items-center gap-2.5 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md shadow-inner">
            <span className="text-[11px] font-black text-white/80 capitalize tracking-wide">
                {provider} · {model}
            </span>
        </div>
        
        <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center border-2 border-white/10 shadow-xl hover:rotate-3 transition-all cursor-pointer">
            <span className="text-[16px] font-black text-white uppercase">{name[0] || 'U'}</span>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
