import React from 'react';

const Topbar = () => {
    const provider = localStorage.getItem('provider') || 'Groq';
    const model = localStorage.getItem('model') || 'llama-3.1-8b';
    const name = localStorage.getItem('name') || 'User';

  return (
    <header className="h-[--topbar-height] fixed top-0 left-[--sidebar-width] right-0 bg-[var(--topbar-bg)] border-b border-white/5 text-white z-40 flex items-center justify-between px-4">
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-[#7C3AED] rounded-md flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        </div>
        <span className="text-white font-bold text-[15px] tracking-tight">Learnify AI</span>
      </div>
      
      {/* Right: Status & User */}
      <div className="flex items-center gap-3">
        {/* Provider Pill */}
        <div className="flex items-center gap-2 bg-[#1e3a2f] border border-[#2d5c45] px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6ee7b7]"></div>
            <span className="text-[11px] font-medium text-[#6ee7b7] capitalize">
                {provider} · {model}
            </span>
        </div>
        
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border border-white/10 shadow-md">
            <span className="text-[12px] font-bold text-white uppercase">{name[0]}</span>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
