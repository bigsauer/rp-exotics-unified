#!/usr/bin/env node

/**
 * Quick Deployment Verification Script
 * 
 * This script quickly verifies that all critical services are working
 * after deployment to Railway and Vercel.
 * 
 * Run this after deployment: node verify-deployment.js
 */

require('dotenv').config();
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

console.log('🔍 Quick Deployment Verification');
console.log('================================');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log('');

async function checkHealthEndpoint() {
  console.log('🏥 Checking health endpoint...');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, {
      timeout: 10000
    });
    
    console.log('✅ Health endpoint accessible');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Database: ${response.data.database}`);
    console.log(`   S3 Storage: ${response.data.s3_storage}`);
    console.log(`   Environment: ${response.data.environment}`);
    
    if (response.data.s3_error) {
      console.log(`   ⚠️  S3 Error: ${response.data.s3_error}`);
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.log('❌ Health endpoint failed');
    console.log(`   Error: ${error.message}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function checkS3Configuration() {
  console.log('☁️  Checking S3 configuration...');
  
  const requiredEnvVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET_NAME',
    'AWS_REGION'
  ];
  
  const missing = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  if (missing.length > 0) {
    console.log('❌ Missing S3 environment variables:');
    missing.forEach(envVar => console.log(`   - ${envVar}`));
    return false;
  }
  
  console.log('✅ All S3 environment variables are set');
  console.log(`   Bucket: ${process.env.AWS_S3_BUCKET_NAME}`);
  console.log(`   Region: ${process.env.AWS_REGION}`);
  
  return true;
}

async function checkMongoDBConnection() {
  console.log('🗄️  Checking MongoDB connection...');
  
  if (!process.env.MONGODB_URI) {
    console.log('❌ MONGODB_URI environment variable not set');
    return false;
  }
  
  console.log('✅ MONGODB_URI environment variable is set');
  console.log(`   Connection: ${process.env.MONGODB_URI.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local MongoDB'}`);
  
  return true;
}

async function runVerification() {
  console.log('🚀 Starting deployment verification...');
  console.log('');
  
  const results = {
    health: false,
    s3Config: false,
    mongoConfig: false
  };
  
  // Check environment variables
  results.s3Config = await checkS3Configuration();
  console.log('');
  
  results.mongoConfig = await checkMongoDBConnection();
  console.log('');
  
  // Check health endpoint
  const healthResult = await checkHealthEndpoint();
  results.health = healthResult.success;
  console.log('');
  
  // Summary
  console.log('📊 Verification Summary');
  console.log('=======================');
  console.log(`Health Endpoint: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`S3 Configuration: ${results.s3Config ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`MongoDB Configuration: ${results.mongoConfig ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('🎉 Deployment verification successful!');
    console.log('');
    console.log('✅ Your deployment is working correctly.');
    console.log('✅ All critical services are accessible.');
    console.log('✅ Ready for production use.');
  } else {
    console.log('❌ Deployment verification failed.');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('1. Check Railway deployment logs for errors');
    console.log('2. Verify environment variables are set correctly');
    console.log('3. Run the full S3 test: npm run test-s3');
    console.log('4. Check the DEPLOYMENT_ENV_CONFIG.md guide');
  }
  
  console.log('');
  
  if (healthResult.success && healthResult.data.s3_storage === 'error') {
    console.log('⚠️  S3 Storage Issues Detected');
    console.log('================================');
    console.log('The health check shows S3 storage is not working properly.');
    console.log('');
    console.log('🔧 To fix S3 issues:');
    console.log('1. Verify AWS credentials are correct');
    console.log('2. Check S3 bucket exists and is accessible');
    console.log('3. Ensure IAM user has proper S3 permissions');
    console.log('4. Run: npm run test-s3');
    console.log('');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run verification
runVerification().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
}); 