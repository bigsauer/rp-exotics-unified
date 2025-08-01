import React, { useState } from 'react';
import { Car, Eye, EyeOff, Lock, User, Shield, Zap } from 'lucide-react';

const LoginPage2 = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const handleLogin = () => {
    console.log('Login attempt:', loginData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">


        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-gray-300">Sign in to your account</p>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Email Address
              </label>
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
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
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

            {/* Login Button */}
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-6 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg"
            >
              Sign In
            </button>

            {/* Forgot Password */}
            <div className="text-center">
              <button 
                onClick={() => setShowForgotPassword(true)}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                Forgot your password?
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-400">Demo Accounts</span>
              </div>
            </div>

            {/* Demo Account Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setLoginData({email: 'admin@rpexotics.com', password: 'admin123'})}
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
                  onClick={() => setLoginData({email: 'backoffice@rpexotics.com', password: 'back123'})}
                  className="flex flex-col items-center bg-purple-600/20 hover:bg-purple-600/30 text-white p-3 rounded-lg transition-colors border border-purple-500/30"
                >
                  <Lock className="h-4 w-4 text-purple-400 mb-1" />
                  <span className="text-xs">Back Office</span>
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

        {/* Security Badge */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
            <Zap className="h-4 w-4 text-yellow-400 mr-2" />
            <span className="text-gray-300 text-sm">Secured by Enterprise Authentication</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal - Ready for future implementation */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-2">Reset Your Password</h3>
            <p className="text-gray-300 text-sm mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                  placeholder="Enter your email"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-xl transition-colors border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement password reset functionality
                    alert('Password reset functionality will be implemented here');
                    setShowForgotPassword(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-xl transition-all transform hover:scale-105"
                >
                  Send Reset Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage2; 