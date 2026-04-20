import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const pageStyles = {
  '/dashboard': { bg: '#FDFAF4', accent: '#7C3AED' },
  '/chat': { bg: '#F5F0FF', accent: '#8B5CF6' },
  '/quiz': { bg: '#F7FFED', accent: '#84CC16' },
  '/upload': { bg: '#FFF7F3', accent: '#F97316' },
  '/games': { bg: '#FEFCE8', accent: '#EAB308' },
  '/settings': { bg: '#EFF6FF', accent: '#3B82F6' },
  '/knowledge-graph': { bg: '#F0FDFA', accent: '#14B8A6' },
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
        className="h-screen flex flex-col transition-colors duration-500 overflow-hidden text-[#1a1a1a]"
        style={{ backgroundColor: style.bg, '--accent': style.accent }}
    >
      {/* 1. Full-Width Fixed Topbar */}
      <Topbar />

      {/* 2. Lower Area: Sidebar + Main Content */}
      <div className="flex flex-1 mt-[--topbar-height] relative overflow-hidden">
        {/* Sidebar: Anchored below Topbar */}
        <Sidebar aria-label="Sidebar Navigation" />

        {/* Main Content Area: Clearly offset from Sidebar */}
        <main 
            className="flex-1 overflow-y-auto p-12 lg:p-16"
            style={{ scrollBehavior: 'smooth' }}
        >
          <div className="max-w-7xl mx-auto space-y-12">
            {children}
          </div>
          {/* Bottom Buffer to ensure nothing is cut off */}
          <div className="h-20 w-full flex-shrink-0" />
        </main>
      </div>
    </div>
  );
};

export default Layout;
