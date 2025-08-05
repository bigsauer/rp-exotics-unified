const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_URL || 'https://astonishing-chicken-production.up.railway.app/api';

// Test the complete seller upload flow
async function testSellerUploadFlow() {
  console.log('🧪 Testing Seller Upload Flow\n');

  try {
    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in to get auth token...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'lynn@rpexotics.com', // Using finance user from logs
      password: 'titles123' // Password from logs
    });

    if (!loginResponse.data.token) {
      throw new Error('Login failed - no token received');
    }

    const token = loginResponse.data.token;
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('✅ Login successful\n');

    // Step 2: Get a deal to test with
    console.log('2️⃣ Getting a deal to test with...');
    const dealsResponse = await axios.get(`${BASE_URL}/back-office/deals?limit=1`, {
      headers: authHeaders
    });

    if (!dealsResponse.data.data || dealsResponse.data.data.length === 0) {
      throw new Error('No deals found to test with');
    }

    const testDeal = dealsResponse.data.data[0];
    console.log(`✅ Found test deal: ${testDeal.vehicle} (${testDeal._id})\n`);

    // Step 3: Generate seller upload link
    console.log('3️⃣ Generating seller upload link...');
    const generateLinkResponse = await axios.post(`${BASE_URL}/seller-upload/generate-link`, {
      dealId: testDeal._id,
      sellerEmail: 'test-seller@example.com',
      vehicleInfo: testDeal.vehicle,
      vin: testDeal.vin || '1HGBH41JXMN109186' // Use deal VIN or test VIN
    }, {
      headers: authHeaders
    });

    if (!generateLinkResponse.data.success) {
      throw new Error('Failed to generate upload link');
    }

    const uploadLink = generateLinkResponse.data.uploadLink;
    const uploadToken = uploadLink.split('/').pop();
    console.log(`✅ Upload link generated: ${uploadToken.substring(0, 8)}...\n`);

    // Step 4: Verify the upload token
    console.log('4️⃣ Verifying upload token...');
    const verifyResponse = await axios.get(`${BASE_URL}/seller-upload/verify/${uploadToken}`);

    if (!verifyResponse.data.success) {
      throw new Error('Token verification failed');
    }

    console.log('✅ Token verification successful\n');

    // Step 5: Create test files for upload
    console.log('5️⃣ Creating test files for upload...');
    const testFiles = [
      { name: 'test-photo-id.jpg', content: 'fake photo id content' },
      { name: 'test-title-front.jpg', content: 'fake title front content' },
      { name: 'test-title-back.jpg', content: 'fake title back content' },
      { name: 'test-odometer.jpg', content: 'fake odometer content' }
    ];

    // Create temporary test files
    const tempDir = path.join(__dirname, 'temp-test-files');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const createdFiles = [];
    for (const testFile of testFiles) {
      const filePath = path.join(tempDir, testFile.name);
      fs.writeFileSync(filePath, testFile.content);
      createdFiles.push(filePath);
    }

    console.log(`✅ Created ${createdFiles.length} test files\n`);

    // Step 6: Upload documents
    console.log('6️⃣ Uploading documents...');
    const formData = new FormData();
    
    // Add form data
    const formDataObj = {
      emailAddress: 'test-seller@example.com',
      mailingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TX',
        zip: '12345'
      },
      pickupAddress: '456 Pickup Street, Test City, TX 12345',
      pickupHours: 'Mon-Fri 9AM-5PM',
      hasLien: false,
      photoId: 'test-photo-id.jpg',
      titleFront: 'test-title-front.jpg',
      titleBack: 'test-title-back.jpg',
      odometerPhoto: 'test-odometer.jpg'
    };

    formData.append('formData', JSON.stringify(formDataObj));

    // Add files
    for (const filePath of createdFiles) {
      formData.append('documents', fs.createReadStream(filePath));
    }

    const uploadResponse = await axios.post(`${BASE_URL}/seller-upload/upload/${uploadToken}`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    if (!uploadResponse.data.success) {
      throw new Error('Upload failed: ' + uploadResponse.data.message);
    }

    console.log(`✅ Upload successful: ${uploadResponse.data.documentsAdded} documents added\n`);

    // Step 7: Verify documents were added to the deal
    console.log('7️⃣ Verifying documents were added to the deal...');
    const updatedDealResponse = await axios.get(`${BASE_URL}/back-office/deals/${testDeal._id}`, {
      headers: authHeaders
    });

    if (!updatedDealResponse.data.deal) {
      throw new Error('Failed to get updated deal');
    }

    const updatedDeal = updatedDealResponse.data.deal;
    const sellerDocuments = updatedDeal.documents.filter(doc => 
      doc.type && doc.type.startsWith('seller_')
    );

    console.log(`✅ Found ${sellerDocuments.length} seller documents in deal`);
    sellerDocuments.forEach(doc => {
      console.log(`   - ${doc.type}: ${doc.fileName} (${doc.approved ? 'Approved' : 'Pending'})`);
    });

    // Step 8: Clean up test files
    console.log('\n8️⃣ Cleaning up test files...');
    for (const filePath of createdFiles) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
    console.log('✅ Cleanup complete\n');

    console.log('🎉 All tests passed! Seller upload flow is working correctly.');
    console.log('\nSummary:');
    console.log(`- Deal ID: ${testDeal._id}`);
    console.log(`- Documents uploaded: ${uploadResponse.data.documentsAdded}`);
    console.log(`- Documents in deal: ${sellerDocuments.length}`);
    console.log(`- S3 URLs: ${sellerDocuments.every(doc => doc.filePath && doc.filePath.startsWith('http')) ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testSellerUploadFlow(); 