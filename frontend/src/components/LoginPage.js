import React, { useState } from 'react';
import './LoginPage.css';

function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement actual login API call
      console.log('Login attempt:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, just show success
      alert('Login functionality will be implemented with the backend API');
      
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <div className="logo">
              <span className="logo-text">RP</span>
              <span className="logo-subtitle">EXOTICS</span>
            </div>
            <h1>Welcome Back</h1>
            <p>Sign in to your RP Exotics account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter your username"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                className="form-input"
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="checkbox-input"
                />
                <span className="checkmark"></span>
                Remember me
              </label>
            </div>

            <button 
              type="submit" 
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <p>Don't have an account? <button className="link">Contact Admin</button></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage; 