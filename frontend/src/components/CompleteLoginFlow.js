// NOTE: All backend API calls should use process.env.REACT_APP_API_URL (set in .env) for the base URL.
import React, { useState, useEffect, useCallback } from 'react';
import { Car, Eye, EyeOff, Lock, User, Shield, Zap, CheckCircle, BarChart3, Users } from 'lucide-react';
import BeautifulDarkLanding from './BeautifulDarkLanding';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

// Login Transition Component
const LoginTransition = ({ user, onComplete }) => {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const stages = useCallback(() => [
    { text: 'Authenticating credentials...', icon: Lock, duration: 800 },
    { text: 'Loading user profile...', icon: (user && user.role === 'admin') ? Shield : (user && user.role === 'sales') ? Car : (user && user.role === 'finance') ? BarChart3 : Eye, duration: 700 },
    { text: 'Initializing workspace...', icon: Users, duration: 600 },
    { text: 'Preparing dashboard...', icon: Zap, duration: 500 },
    { text: 'Welcome to RP Exotics!', icon: CheckCircle, duration: 400 }
  ], [user]);

  React.useEffect(() => {
    let timer;
    let progressTimer;
    const stagesArray = stages();

    const runStage = (stageIndex) => {
      if (stageIndex >= stagesArray.length) {
        setTimeout(() => onComplete(), 300);
        return;
      }

      setStage(stageIndex);
      setProgress(0);

      const progressDuration = stagesArray[stageIndex].duration;
      const progressStep = 100 / (progressDuration / 10);
      
      progressTimer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressTimer);
            return 100;
          }
          return prev + progressStep;
        });
      }, 10);

      timer = setTimeout(() => {
        clearInterval(progressTimer);
        runStage(stageIndex + 1);
      }, progressDuration);
    };

    runStage(0);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [stages, onComplete]);

  const getRoleGradient = (role) => {
    if (!role) return 'from-gray-500 to-gray-600';
    switch(role) {
      case 'admin': return 'from-blue-500 to-cyan-500';
      case 'sales': return 'from-green-500 to-emerald-500';
      case 'finance': return 'from-purple-500 to-pink-500';
      case 'viewer': return 'from-orange-500 to-amber-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getCurrentStage = stages()[stage] || stages()[0];
  const StageIcon = getCurrentStage.icon;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center z-50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative text-center max-w-md mx-auto px-6">
        <div className="mb-8">
          <div className={`mx-auto h-24 w-24 bg-gradient-to-r ${getRoleGradient(user.role)} rounded-2xl flex items-center justify-center mb-6 shadow-2xl animate-pulse`}>
            <Car className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">RP Exotics</h1>
          <p className="text-gray-300">Professional Vehicle Management</p>
        </div>

        <div className="mb-8">
          <div className={`inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r ${getRoleGradient(user.role)} text-white text-sm font-medium mb-3 shadow-lg`}>
            {user.role === 'admin' && <Shield className="h-4 w-4 mr-2" />}
            {user.role === 'sales' && <Car className="h-4 w-4 mr-2" />}
            {user.role === 'finance' && <BarChart3 className="h-4 w-4 mr-2" />}
            {user.role === 'viewer' && <Eye className="h-4 w-4 mr-2" />}
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Access
          </div>
          <h2 className="text-xl font-semibold text-white">Welcome, {user.profile?.displayName || user.email}</h2>
        </div>

        <div className="mb-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-white/10 rounded-full blur-xl"></div>
            <div className={`relative mx-auto h-16 w-16 bg-gradient-to-r ${getRoleGradient(user.role)} rounded-full flex items-center justify-center shadow-xl`}>
              <StageIcon className="h-8 w-8 text-white animate-pulse" />
            </div>
          </div>

          <p className="text-white text-lg font-medium mb-4">{getCurrentStage.text}</p>

          <div className="relative">
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${getRoleGradient(user.role)} rounded-full transition-all duration-100 ease-out shadow-lg`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="flex justify-center space-x-2">
          {stages().map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                index <= stage 
                  ? `bg-gradient-to-r ${getRoleGradient(user.role)} shadow-lg scale-125` 
                  : 'bg-white/20'
              }`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CompleteLoginFlow = () => {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const { user: currentUser, login, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Utility to get backend API URL
  const API_BASE = process.env.REACT_APP_API_URL || '';

  // Auto-login logic
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`/api/auth/profile`, {
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          login(result.user || result);
          setCurrentScreen('dashboard');
        }
      } catch (err) {
        // Not logged in, ignore
      }
    };
    checkSession();
  }, [login, API_BASE]);

  const handleLogin = async () => {
    try {
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...loginData,
          rememberMe
        }),
      });
      if (!response.ok) throw new Error('Login failed');
      const result = await response.json();
      login(result.user || result, result.token);
      setCurrentScreen('transition');
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  };

  const handleTransitionComplete = () => {
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    await logout();
    setLoginData({ email: '', password: '' });
    setCurrentScreen('login');
  };

  if (currentScreen === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="mx-auto h-24 w-24 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 shadow-2xl border border-white/20">
              <Car className="h-16 w-16 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">RP Exotics</h1>
            <p className="text-gray-400">Premium Vehicle Management System</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-gray-300">Sign in to your account</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    className="block w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLogin();
                      }
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="block w-full pl-12 pr-12 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLogin();
                      }
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-white transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center mb-4">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-200">
                  Remember Me (12 hours)
                </label>
              </div>

              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-6 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg"
              >
                Sign In
              </button>

              <div className="text-center">
                {/* <button 
                  onClick={() => setShowForgotPassword(true)}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  Forgot your password?
                </button> */}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-transparent text-gray-400">Demo Accounts</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setLoginData({email: 'chris@rpexotics.com', password: 'Matti11!'})}
                  className="w-full flex items-center justify-between bg-blue-600/20 hover:bg-blue-600/30 text-white p-4 rounded-lg transition-colors border border-blue-500/30"
                >
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-blue-400 mr-3" />
                    <span className="font-medium">Admin Access</span>
                  </div>
                  <span className="text-blue-300 text-sm">Full Control</span>
                </button>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setLoginData({email: 'parker@rpexotics.com', password: '17Hellcat!'})}
                    className="flex flex-col items-center bg-green-600/20 hover:bg-green-600/30 text-white p-3 rounded-lg transition-colors border border-green-500/30"
                  >
                    <Car className="h-4 w-4 text-green-400 mb-1" />
                    <span className="text-xs">Sales</span>
                  </button>
                  
                  <button
                    onClick={() => setLoginData({email: 'lynn@rpexotics.com', password: 'titles123'})}
                    className="flex flex-col items-center bg-purple-600/20 hover:bg-purple-600/30 text-white p-3 rounded-lg transition-colors border border-purple-500/30"
                  >
                    <BarChart3 className="h-4 w-4 text-purple-400 mb-1" />
                    <span className="text-xs">Finance</span>
                  </button>
                  
                  <button
                    onClick={() => setLoginData({email: 'viewer@rpexotics.com', password: 'view123'})}
                    className="flex flex-col items-center bg-orange-600/20 hover:bg-orange-600/30 text-white p-3 rounded-lg transition-colors border border-orange-500/30"
                  >
                    <Eye className="h-4 w-4 text-orange-400 mb-1" />
                    <span className="text-xs">Viewer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            <div className="inline-flex items-center bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
              <Zap className="h-4 w-4 text-yellow-400 mr-2" />
              <span className="text-gray-300 text-sm">Secured by Enterprise Authentication</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === 'transition') {
    return <LoginTransition user={currentUser} onComplete={handleTransitionComplete} />;
  }

  if (currentScreen === 'dashboard') {
    return <BeautifulDarkLanding user={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser) return null;
};

export default CompleteLoginFlow; 