import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', iconColor: '#7C3AED' },
  { path: '/chat', label: 'Chat', iconColor: '#8B5CF6' },
  { path: '/quiz', label: 'Quiz', iconColor: '#84CC16' },
  { path: '/upload', label: 'Upload', iconColor: '#F97316' },
  { path: '/knowledge', label: 'Knowledge Graph', iconColor: '#14B8A6' },
  { path: '/analytics', label: 'Analytics', iconColor: '#60A5FA' },
  { path: '/settings', label: 'Settings', iconColor: '#94A3B8' },
];

const Icon = ({ name, color, isActive }) => {
  const paths = {
    Dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    Chat: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z",
    Quiz: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
    Upload: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z",
    'Knowledge Graph': "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.5 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z",
    Analytics: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
    Settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22l-1.92 3.32c-.12.21-.07.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32.12.22.37.29.59.22 2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  };

  return (
    <svg 
      viewBox="0 0 24 24" 
      fill={isActive ? color : "#94A3B8"} 
      className="w-5 h-5 transition-colors duration-200"
    >
      <path d={paths[name] || ""} />
    </svg>
  );
};

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-[var(--sidebar-bg)] text-white flex flex-col z-50">
      <div className="p-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[11px]">L</div>
          <span>Learnify <span className="text-gray-400">AI</span></span>
        </h1>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon name={item.label} color={item.iconColor} isActive={isActive} />
              <span className="text-[13px] font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.iconColor }}></div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/10">
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold ring-2 ring-white/10">
             {localStorage.getItem('name')?.[0] || 'U'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold truncate text-white">{localStorage.getItem('name') || 'User'}</span>
            <span className="text-[11px] text-gray-500 font-mono">Lvl {localStorage.getItem('level') || '1'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
