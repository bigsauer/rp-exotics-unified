#!/usr/bin/env node

/**
 * S3 Configuration and Document Generation Test Script
 * 
 * This script tests:
 * 1. S3 connection and bucket access
 * 2. Document upload to S3
 * 3. Document download from S3
 * 4. Vehicle record generation and storage
 * 
 * Run this script after deployment to verify everything works correctly.
 */

require('dotenv').config();
const cloudStorage = require('./services/cloudStorage');
const documentGenerator = require('./services/documentGenerator');
const fs = require('fs-extra');
const path = require('path');

console.log('🧪 S3 Configuration and Document Generation Test');
console.log('================================================');
console.log('');

// Test configuration
const testData = {
  dealType: 'wholesale-d2d',
  dealType2SubType: 'buy',
  stockNumber: 'TEST-S3-001',
  vin: '1HGBH41JXMN109186',
  year: 2023,
  make: 'Honda',
  model: 'Civic',
  purchasePrice: 25000,
  listPrice: 28000,
  seller: {
    name: 'Test Dealer',
    type: 'dealer',
    contact: {
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'MO',
        zip: '63132'
      },
      phone: '(314) 555-0123',
      email: 'test@dealer.com'
    }
  },
  buyer: {
    name: 'RP Exotics',
    type: 'dealer',
    contact: {
      address: {
        street: '1155 N Warson Rd',
        city: 'Saint Louis',
        state: 'MO',
        zip: '63132'
      },
      phone: '(314) 970-2427',
      email: 'titling@rpexotics.com'
    }
  }
};

const testUser = {
  _id: 'test-user-id',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@rpexotics.com'
};

async function testS3Connection() {
  console.log('🔗 Testing S3 Connection...');
  
  try {
    const bucketInfo = await cloudStorage.getBucketInfo();
    
    if (bucketInfo.success) {
      console.log('✅ S3 connection successful');
      console.log(`   Bucket: ${bucketInfo.bucketName}`);
      console.log(`   Region: ${bucketInfo.region}`);
    } else {
      console.log('❌ S3 connection failed');
      console.log(`   Error: ${bucketInfo.error}`);
      return false;
    }
  } catch (error) {
    console.log('❌ S3 connection test failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
  
  console.log('');
  return true;
}

async function testDocumentUpload() {
  console.log('📤 Testing Document Upload...');
  
  try {
    // Create a test file
    const testFileName = `test-document-${Date.now()}.txt`;
    const testFilePath = path.join(__dirname, 'uploads', 'documents', testFileName);
    const testContent = `Test document created at ${new Date().toISOString()}\nThis is a test file for S3 upload verification.`;
    
    // Ensure uploads directory exists
    await fs.ensureDir(path.dirname(testFilePath));
    
    // Write test file
    await fs.writeFile(testFilePath, testContent);
    console.log(`   Created test file: ${testFileName}`);
    
    // Upload to S3
    const uploadResult = await cloudStorage.uploadFile(testFilePath, testFileName, 'text/plain');
    
    if (uploadResult.success) {
      console.log('✅ Document upload successful');
      console.log(`   URL: ${uploadResult.url}`);
      console.log(`   Size: ${uploadResult.size} bytes`);
      console.log(`   ETag: ${uploadResult.etag}`);
      
      // Test download
      const downloadResult = await cloudStorage.downloadFile(testFileName);
      
      if (downloadResult.success) {
        console.log('✅ Document download successful');
        console.log(`   Content-Type: ${downloadResult.contentType}`);
        console.log(`   Content-Length: ${downloadResult.contentLength}`);
        
        // Verify content
        const downloadedContent = downloadResult.data.toString();
        if (downloadedContent === testContent) {
          console.log('✅ Content verification successful');
        } else {
          console.log('❌ Content verification failed');
          return false;
        }
      } else {
        console.log('❌ Document download failed');
        console.log(`   Error: ${downloadResult.error}`);
        return false;
      }
      
      // Clean up test file from S3
      await cloudStorage.deleteFile(testFileName);
      console.log('✅ Test file cleaned up from S3');
      
    } else {
      console.log('❌ Document upload failed');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Document upload test failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
  
  console.log('');
  return true;
}

async function testVehicleRecordGeneration() {
  console.log('🚗 Testing Vehicle Record Generation...');
  
  try {
    console.log('   Generating vehicle record PDF...');
    const vehicleRecordResult = await documentGenerator.generateVehicleRecordPDF(testData, testUser);
    
    if (vehicleRecordResult && vehicleRecordResult.fileName) {
      console.log('✅ Vehicle record generation successful');
      console.log(`   File: ${vehicleRecordResult.fileName}`);
      console.log(`   Size: ${vehicleRecordResult.fileSize} bytes`);
      console.log(`   Type: ${vehicleRecordResult.documentType}`);
      
      // Check if file is stored in S3
      if (vehicleRecordResult.filePath && vehicleRecordResult.filePath.startsWith('http')) {
        console.log('✅ Vehicle record stored in S3');
        console.log(`   S3 URL: ${vehicleRecordResult.filePath}`);
      } else {
        console.log('⚠️  Vehicle record stored locally (development mode)');
        console.log(`   Local path: ${vehicleRecordResult.filePath}`);
      }
      
      // Test file access
      const fileExists = await cloudStorage.fileExists(vehicleRecordResult.fileName);
      if (fileExists) {
        console.log('✅ Vehicle record accessible in S3');
      } else {
        console.log('⚠️  Vehicle record not found in S3 (may be local storage)');
      }
      
    } else {
      console.log('❌ Vehicle record generation failed');
      console.log(`   Result: ${JSON.stringify(vehicleRecordResult, null, 2)}`);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Vehicle record generation test failed');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    return false;
  }
  
  console.log('');
  return true;
}

async function testDocumentGeneration() {
  console.log('📄 Testing Document Generation...');
  
  try {
    console.log('   Generating bill of sale...');
    const documentResult = await documentGenerator.generateBillOfSale(testData, testUser);
    
    if (documentResult && documentResult.fileName) {
      console.log('✅ Document generation successful');
      console.log(`   File: ${documentResult.fileName}`);
      console.log(`   Size: ${documentResult.fileSize} bytes`);
      console.log(`   Type: ${documentResult.documentType}`);
      
      // Check if file is stored in S3
      if (documentResult.filePath && documentResult.filePath.startsWith('http')) {
        console.log('✅ Document stored in S3');
        console.log(`   S3 URL: ${documentResult.filePath}`);
      } else {
        console.log('⚠️  Document stored locally (development mode)');
        console.log(`   Local path: ${documentResult.filePath}`);
      }
      
    } else {
      console.log('❌ Document generation failed');
      console.log(`   Result: ${JSON.stringify(documentResult, null, 2)}`);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Document generation test failed');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    return false;
  }
  
  console.log('');
  return true;
}

async function runAllTests() {
  console.log('🚀 Starting S3 Configuration and Document Generation Tests');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('');
  
  const results = {
    s3Connection: false,
    documentUpload: false,
    vehicleRecordGeneration: false,
    documentGeneration: false
  };
  
  // Test 1: S3 Connection
  results.s3Connection = await testS3Connection();
  
  // Test 2: Document Upload/Download
  if (results.s3Connection) {
    results.documentUpload = await testDocumentUpload();
  }
  
  // Test 3: Vehicle Record Generation
  results.vehicleRecordGeneration = await testVehicleRecordGeneration();
  
  // Test 4: Document Generation
  results.documentGeneration = await testDocumentGeneration();
  
  // Summary
  console.log('📊 Test Results Summary');
  console.log('========================');
  console.log(`S3 Connection: ${results.s3Connection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Document Upload: ${results.documentUpload ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Vehicle Record Generation: ${results.vehicleRecordGeneration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Document Generation: ${results.documentGeneration ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('🎉 All tests passed! S3 configuration and document generation are working correctly.');
    console.log('');
    console.log('✅ Your deployment is ready for production use.');
    console.log('✅ Vehicle records and documents will be properly stored in S3.');
    console.log('✅ Documents will persist across deployments.');
  } else {
    console.log('❌ Some tests failed. Please check the configuration:');
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Verify AWS credentials are set correctly');
    console.log('2. Check S3 bucket exists and is accessible');
    console.log('3. Ensure IAM user has proper S3 permissions');
    console.log('4. Verify environment variables are set in Railway');
    console.log('5. Check the deployment logs for errors');
    console.log('');
    console.log('📖 See DEPLOYMENT_ENV_CONFIG.md for detailed setup instructions.');
  }
  
  console.log('');
  console.log('🧹 Cleaning up test files...');
  
  // Clean up any local test files
  try {
    const uploadsDir = path.join(__dirname, 'uploads', 'documents');
    const files = await fs.readdir(uploadsDir);
    for (const file of files) {
      if (file.startsWith('test-') || file.includes('TEST-S3-')) {
        await fs.remove(path.join(uploadsDir, file));
        console.log(`   Cleaned up: ${file}`);
      }
    }
  } catch (error) {
    console.log('   No test files to clean up');
  }
  
  console.log('✅ Test cleanup complete');
  console.log('');
  
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
}); 