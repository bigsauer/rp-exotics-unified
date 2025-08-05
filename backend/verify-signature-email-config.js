#!/usr/bin/env node

/**
 * Signature Email Configuration Verification Script
 * 
 * This script verifies that all required environment variables are set
 * for the client signature email functionality to work properly in production.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Signature Email Configuration...\n');

// Required environment variables for signature emails
const requiredEnvVars = {
  'FRONTEND_URL': 'Frontend URL for signature links (e.g., https://your-app.vercel.app)',
  'RESEND_API_KEY': 'Resend API key for sending emails',
  'NODE_ENV': 'Node environment (should be "production" for live deployment)'
};

// Optional but recommended environment variables
const recommendedEnvVars = {
  'AWS_ACCESS_KEY_ID': 'AWS S3 access key for document storage',
  'AWS_SECRET_ACCESS_KEY': 'AWS S3 secret key for document storage',
  'AWS_REGION': 'AWS region (e.g., us-east-2)',
  'AWS_S3_BUCKET_NAME': 'S3 bucket name for document storage',
  'MONGODB_URI': 'MongoDB connection string',
  'JWT_SECRET': 'JWT secret for authentication'
};

let allRequiredSet = true;
let missingRequired = [];
let missingRecommended = [];

console.log('📋 Checking Required Environment Variables:');
console.log('==========================================');

// Check required environment variables
Object.entries(requiredEnvVars).forEach(([varName, description]) => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
  } else {
    console.log(`❌ ${varName}: MISSING - ${description}`);
    missingRequired.push(varName);
    allRequiredSet = false;
  }
});

console.log('\n📋 Checking Recommended Environment Variables:');
console.log('==============================================');

// Check recommended environment variables
Object.entries(recommendedEnvVars).forEach(([varName, description]) => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes('SECRET') || varName.includes('KEY') ? '***SET***' : value.substring(0, 20) + (value.length > 20 ? '...' : '')}`);
  } else {
    console.log(`⚠️  ${varName}: MISSING - ${description}`);
    missingRecommended.push(varName);
  }
});

console.log('\n🔗 Frontend URL Configuration:');
console.log('==============================');

const frontendUrl = process.env.FRONTEND_URL;
if (frontendUrl) {
  console.log(`✅ Frontend URL: ${frontendUrl}`);
  
  // Test if the URL looks like a production URL
  if (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1')) {
    console.log('⚠️  Warning: Frontend URL appears to be localhost - this may not work for client signature emails');
  } else if (frontendUrl.startsWith('https://')) {
    console.log('✅ Frontend URL uses HTTPS (secure)');
  } else {
    console.log('⚠️  Warning: Frontend URL does not use HTTPS - this may cause issues with email clients');
  }
  
  // Generate a test signature URL
  const testSignatureUrl = `${frontendUrl}/sign/test-signature-id`;
  console.log(`🔗 Test Signature URL: ${testSignatureUrl}`);
} else {
  console.log('❌ Frontend URL not set - client signature emails will not work');
}

console.log('\n📧 Email Service Configuration:');
console.log('================================');

const resendApiKey = process.env.RESEND_API_KEY;
if (resendApiKey) {
  console.log('✅ Resend API key is set');
  
  // Check if it looks like a valid API key
  if (resendApiKey.startsWith('re_') && resendApiKey.length > 20) {
    console.log('✅ Resend API key format appears valid');
  } else {
    console.log('⚠️  Warning: Resend API key format may be invalid');
  }
} else {
  console.log('❌ Resend API key not set - emails will not be sent');
}

console.log('\n🚀 Deployment Environment:');
console.log('==========================');

const nodeEnv = process.env.NODE_ENV;
if (nodeEnv === 'production') {
  console.log('✅ Running in production mode');
} else if (nodeEnv === 'development') {
  console.log('⚠️  Running in development mode - some features may be limited');
} else {
  console.log('⚠️  NODE_ENV not set - defaulting to development mode');
}

console.log('\n📊 Summary:');
console.log('===========');

if (allRequiredSet) {
  console.log('✅ All required environment variables are set');
  console.log('🎉 Signature email functionality should work properly');
} else {
  console.log('❌ Missing required environment variables:');
  missingRequired.forEach(varName => {
    console.log(`   - ${varName}: ${requiredEnvVars[varName]}`);
  });
  console.log('\n🔧 Please set the missing environment variables before deploying');
}

if (missingRecommended.length > 0) {
  console.log('\n⚠️  Missing recommended environment variables:');
  missingRecommended.forEach(varName => {
    console.log(`   - ${varName}: ${recommendedEnvVars[varName]}`);
  });
  console.log('\n💡 These are not required but recommended for full functionality');
}

console.log('\n📝 Next Steps:');
console.log('==============');

if (allRequiredSet) {
  console.log('1. ✅ Environment is properly configured');
  console.log('2. 🚀 Deploy to production');
  console.log('3. 🧪 Test client signature email functionality');
  console.log('4. 📧 Verify emails are received by clients');
  console.log('5. 🔗 Verify signature links work correctly');
} else {
  console.log('1. 🔧 Set missing required environment variables');
  console.log('2. 🔄 Re-run this verification script');
  console.log('3. 🚀 Deploy to production');
  console.log('4. 🧪 Test client signature email functionality');
}

console.log('\n📚 Documentation:');
console.log('=================');
console.log('- Deployment Guide: backend/DEPLOYMENT_ENV_CONFIG.md');
console.log('- Email Service: backend/services/emailService.js');
console.log('- Signature Routes: backend/routes/signatures.js');

// Exit with appropriate code
if (allRequiredSet) {
  console.log('\n✅ Configuration verification completed successfully');
  process.exit(0);
} else {
  console.log('\n❌ Configuration verification failed - please fix missing variables');
  process.exit(1);
} 