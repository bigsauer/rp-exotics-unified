import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to load user and token from localStorage
    const storedUser = window.localStorage.getItem('user');
    const storedToken = window.localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  // Utility to get auth headers
  const getAuthHeaders = () => {
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
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
        await fetch('/api/auth/logout', { 
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
    <AuthContext.Provider value={{ user, token, loading, login, logout, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 