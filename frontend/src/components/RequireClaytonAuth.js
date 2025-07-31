import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

function RequireClaytonAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  
  if (!user) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is Clayton (clayton@rpexotics.com)
  const isClayton = user.email && user.email.toLowerCase() === 'clayton@rpexotics.com';
  
  if (!isClayton) {
    // Not Clayton, redirect to dashboard with error message
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RequireClaytonAuth; 