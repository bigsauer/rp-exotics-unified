import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Utility to get backend API URL
  const API_BASE = process.env.REACT_APP_API_URL || 'https://astonishing-chicken-production.up.railway.app';

  // Check if the current token is valid
  const checkSession = async (authToken) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        return { valid: true, user: result.user || result };
      } else {
        console.log('[AUTH] Session check failed, token may be expired');
        return { valid: false };
      }
    } catch (error) {
      console.error('[AUTH] Session check error:', error);
      return { valid: false };
    }
  };

  useEffect(() => {
    // Try to load user and token from localStorage
    const storedUser = window.localStorage.getItem('user');
    const storedToken = window.localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      // Validate the stored token
      checkSession(storedToken).then(({ valid, user: sessionUser }) => {
        if (valid) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          console.log('[AUTH] Valid session restored from localStorage');
        } else {
          // Token is invalid, clear storage
          console.log('[AUTH] Invalid token found, clearing storage');
          window.localStorage.removeItem('user');
          window.localStorage.removeItem('token');
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // Utility to get auth headers
  const getAuthHeaders = () => {
    console.log('[AUTH DEBUG] getAuthHeaders called');
    console.log('[AUTH DEBUG] Token exists:', !!token);
    console.log('[AUTH DEBUG] Token length:', token ? token.length : 0);
    console.log('[AUTH DEBUG] Token starts with:', token ? token.substring(0, 20) + '...' : 'N/A');
    
    if (token) {
      const headers = { 'Authorization': `Bearer ${token}` };
      console.log('[AUTH DEBUG] Returning headers:', headers);
      return headers;
    }
    console.log('[AUTH DEBUG] No token, returning empty headers');
    return {};
  };

  const login = (userObj, authToken) => {
    console.log('[AUTH] Login called with:', { userObj, authToken });
    setUser(userObj);
    setToken(authToken);
    window.localStorage.setItem('user', JSON.stringify(userObj));
    window.localStorage.setItem('token', authToken);
    console.log('[AUTH] User logged in:', userObj);
    console.log('[AUTH] Token set:', authToken);
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/api/auth/logout`, { 
          method: 'POST', 
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (err) {
      console.error('[AUTH] Logout error:', err);
    }
    setUser(null);
    setToken(null);
    window.localStorage.removeItem('user');
    window.localStorage.removeItem('token');
    console.log('[AUTH] User logged out');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, getAuthHeaders, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 