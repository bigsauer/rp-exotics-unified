import React from 'react';
import { useLocation } from 'react-router-dom';
import SideNavigation from './SideNavigation';
import { useAuth } from './AuthContext';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();

  // Don't show navigation on the landing page (root path)
  const isLandingPage = location.pathname === '/';
  
  if (isLandingPage) {
    return children;
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Side Navigation - Always visible */}
      <SideNavigation 
        isOpen={true}
        onClose={() => {}} // No-op since it's always open
        user={user}
      />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default AppLayout; 