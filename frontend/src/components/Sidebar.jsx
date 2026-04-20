import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', iconColor: '#7C3AED' },
  { path: '/chat', label: 'Chat', iconColor: '#8B5CF6' },
  { path: '/quiz', label: 'Quiz', iconColor: '#84CC16' },
  { path: '/upload', label: 'Upload', iconColor: '#F97316' },
  { path: '/games', label: 'Games', iconColor: '#EAB308' },
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
    Games: "M21.58 7.19c-.23-.23-.51-.35-.83-.35H3.25c-.32 0-.6.12-.83.35-.23.23-.35.51-.35.83v8.92c0 .32.12.6.35.83.23.23.51.35.83.35h17.5c.32 0 .6-.12.83-.35.23-.23.35-.51.35-.83V8.02c0-.32-.12-.6-.35-.83zM12 13c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
    'Knowledge Graph': "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.5 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z",
    Analytics: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
    Settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22l-1.92 3.32c-.12.21-.07.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32.12.22.37.29.59.22 2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  };

  return (
    <svg 
      viewBox="0 0 24 24" 
      fill={isActive ? color : "currentColor"} 
      className="w-5 h-5 transition-colors duration-200"
    >
      <path d={paths[name] || ""} />
    </svg>
  );
};

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-[--sidebar-width] h-screen fixed left-0 top-0 bg-[var(--sidebar-bg)] text-white flex flex-col z-50 p-2">
      <div className="flex-1 flex flex-col items-center py-4 space-y-3 pt-12">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          
          // Add a divider before Analytics and Knowledge Graph to separate groups
          const showDivider = item.label === 'Knowledge Graph';

          return (
            <React.Fragment key={item.path}>
              {showDivider && <div className="w-6 h-px bg-white/5 my-1" />}
              <Link
                to={item.path}
                title={item.label}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-white/13 text-white' 
                    : 'text-gray-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon name={item.label} color={item.iconColor} isActive={isActive} />
                {isActive && (
                  <div className="absolute -left-2 w-1 h-3 rounded-full bg-white transition-all duration-300"></div>
                )}
              </Link>
            </React.Fragment>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
