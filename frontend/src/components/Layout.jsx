import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const pageStyles = {
  '/dashboard': { bg: '#FDFAF4', accent: '#7C3AED' },
  '/chat': { bg: '#F5F0FF', accent: '#8B5CF6' },
  '/quiz': { bg: '#F7FFED', accent: '#84CC16' },
  '/upload': { bg: '#FFF7F3', accent: '#F97316' },
  '/games': { bg: '#FFFBEB', accent: '#EAB308' },
  '/settings': { bg: '#EFF6FF', accent: '#3B82F6' },
  '/knowledge': { bg: '#F0FDFA', accent: '#14B8A6' },
  '/analytics': { bg: '#F0F9FF', accent: '#60A5FA' },
  '/onboarding': { bg: '#FFF0F6', accent: '#EC4899' },
};

const Layout = ({ children }) => {
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
        className="min-h-screen flex text-[#1a1a1a]"
        style={{ '--accent': style.accent }}
    >
      <Sidebar />
      <div 
        className="flex-1 ml-[--sidebar-width] min-h-screen transition-colors duration-500 overflow-hidden flex flex-col"
        style={{ backgroundColor: style.bg }}
      >
        <Topbar />
        <main className="mt-[--topbar-height] p-6 h-[calc(100vh-var(--topbar-height))] overflow-y-auto animate-page-enter">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
