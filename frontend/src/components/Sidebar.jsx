import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navItems, iconPaths } from '../utils/navigation';

const Icon = ({ name, color, isActive }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill={color} 
      className={`w-7 h-7 transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'}`}
    >
      <path d={iconPaths[name] || ""} />
    </svg>
  );
};

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-[--sidebar-width] h-full bg-[#0d0d0d] text-white flex flex-col z-40 border-r border-[#ffffff0a] shadow-[10px_0_30px_-15px_rgba(0,0,0,0.5)] flex-shrink-0">
      <div className="flex-1 flex flex-col items-center pt-12 pb-8 space-y-8">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          
          // Add a divider before Knowledge Graph to separate groups
          const showDivider = item.label === 'Knowledge Graph';

          return (
            <React.Fragment key={item.path}>
              {showDivider && <div className="w-10 h-px bg-white/5 my-3 shadow-sm" />}
              <Link
                to={item.path}
                title={item.label}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 group relative ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-[0_4px_15px_-3px_rgba(255,255,255,0.1)] border border-white/5' 
                    : 'text-gray-500 hover:bg-white/[0.03] hover:text-white'
                }`}
              >
                <Icon name={item.label} color={item.iconColor} isActive={isActive} />
                {isActive && (
                  <div className="absolute -left-1 w-1.5 h-6 rounded-full bg-white shadow-[0_0_10px_white] transition-all duration-500"></div>
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
