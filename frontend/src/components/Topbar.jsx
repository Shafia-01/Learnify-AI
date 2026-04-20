import React from 'react';

const Topbar = () => {
  return (
    <header className="h-16 fixed top-0 left-64 right-0 bg-[var(--topbar-bg)] border-b border-white/10 text-white z-40 flex items-center justify-between px-8">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-gray-500 font-bold font-mono">Status</span>
            <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[11px] font-bold text-green-500 uppercase">Live</span>
            </div>
        </div>
        
        <div className="h-4 w-px bg-white/10"></div>
        
        <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-gray-500 font-bold font-mono">Experience</span>
            <div className="text-[13px] text-white font-bold font-mono">
                {localStorage.getItem('xp') || '0'} <span className="text-gray-500 text-[11px]">XP</span>
            </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors px-3 py-1.5 rounded-lg border border-white/10 cursor-default">
            <span className="text-[11px] text-gray-400 font-bold uppercase">Lang</span>
            <span className="text-[12px] font-medium text-white">{localStorage.getItem('language') || 'English'}</span>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors px-3 py-1.5 rounded-lg border border-white/10 cursor-default">
            <span className="text-[11px] text-gray-400 font-bold uppercase">Model</span>
            <span className="text-[12px] font-medium text-white uppercase">{localStorage.getItem('model') || 'Gemini'}</span>
        </div>

        <div className="ml-2 w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer">
             <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
