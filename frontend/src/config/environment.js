// Environment Configuration
// This file handles different API URLs for testing and production environments

const getEnvironmentConfig = () => {
  const environment = process.env.REACT_APP_ENVIRONMENT || 'production';
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Determine the environment
  let config = {
    environment: 'production',
    apiUrl: 'https://astonishing-chicken-production.up.railway.app',
    isProduction: true,
    isTesting: false,
    isDevelopment: false
  };

  // Testing Environment (Vercel Preview + RP Exotics Testing Railway)
  if (isPreview || environment === 'testing') {
    config = {
      environment: 'testing',
      apiUrl: 'https://rp-exotics-testing.up.railway.app',
      isProduction: false,
      isTesting: true,
      isDevelopment: false
    };
  }
  
  // Development Environment (Local)
  else if (isDevelopment || environment === 'development') {
    config = {
      environment: 'development',
      apiUrl: 'http://localhost:5000',
      isProduction: false,
      isTesting: false,
      isDevelopment: true
    };
  }
  
  // Production Environment (Vercel Production + Astonishing Chicken Railway)
  else {
    config = {
      environment: 'production',
      apiUrl: 'https://astonishing-chicken-production.up.railway.app',
      isProduction: true,
      isTesting: false,
      isDevelopment: false
    };
  }

  // Override with explicit API URL if provided
  if (process.env.REACT_APP_API_URL) {
    config.apiUrl = process.env.REACT_APP_API_URL;
  }

  console.log('[ENV] Environment Configuration:', {
    environment: config.environment,
    apiUrl: config.apiUrl,
    isPreview,
    isDevelopment,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    REACT_APP_ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT
  });

  return config;
};

export const envConfig = getEnvironmentConfig();
export const API_BASE = envConfig.apiUrl; 