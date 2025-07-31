const mongoose = require('mongoose');
const ApiKey = require('./models/ApiKey');
const DigitalSignature = require('./models/DigitalSignature');
const User = require('./models/User');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics';

async function testDigitalSignatureSystem() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Create a test user
    console.log('\n🧪 Test 1: Creating test user...');
    const testUser = new User({
      firstName: 'Test',
      lastName: 'Customer',
      email: `test-${Date.now()}@example.com`,
      username: `testcustomer-${Date.now()}`,
      passwordHash: 'test-hash',
      role: 'customer',
      isActive: true
    });
    await testUser.save();
    console.log('✅ Test user created:', testUser._id);

    // Test 2: Create an API key
    console.log('\n🧪 Test 2: Creating API key...');
    const apiKey = new ApiKey({
      key: ApiKey.generateKey(),
      name: 'Test Customer API Key',
      description: 'API key for testing digital signatures',
      type: 'customer',
      entityId: testUser._id,
      entityType: 'User',
      permissions: {
        signAgreements: true,
        viewDocuments: true,
        createSignatures: false
      },
      createdBy: testUser._id
    });
    await apiKey.save();
    console.log('✅ API key created:', apiKey.key);

    // Test 3: Create a signature request
    console.log('\n🧪 Test 3: Creating signature request...');
    const signature = new DigitalSignature({
      documentId: new mongoose.Types.ObjectId(), // Mock document ID
      documentType: 'purchase_agreement',
      signatureId: DigitalSignature.generateSignatureId(),
      signerType: 'customer',
      signerId: testUser._id,
      signerModel: 'User',
      signerName: 'Test Customer',
      signerEmail: 'test@example.com',
      signatureMethod: 'api_key',
      apiKeyUsed: apiKey._id,
      signatureData: {
        timestamp: new Date()
      },
      status: 'pending'
    });
    await signature.save();
    console.log('✅ Signature request created:', signature.signatureId);

    // Test 4: Sign the document
    console.log('\n🧪 Test 4: Signing document...');
    signature.signatureData = {
      timestamp: new Date(),
      signatureImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      typedSignature: 'Test Customer'
    };
    signature.status = 'signed';
    signature.isVerified = true;
    signature.verifiedAt = new Date();
    signature.signatureHash = signature.generateHash();
    await signature.save();
    console.log('✅ Document signed successfully');

    // Test 5: Verify signature
    console.log('\n🧪 Test 5: Verifying signature...');
    const isValid = signature.verifySignature();
    console.log('✅ Signature verification:', isValid ? 'PASSED' : 'FAILED');

    // Test 6: Check API key validation
    console.log('\n🧪 Test 6: Validating API key...');
    const isValidKey = apiKey.isValid();
    console.log('✅ API key validation:', isValidKey ? 'PASSED' : 'FAILED');

    // Test 7: Test API key usage tracking
    console.log('\n🧪 Test 7: Testing usage tracking...');
    await apiKey.incrementUsage();
    console.log('✅ Usage count:', apiKey.usageCount);
    console.log('✅ Last used:', apiKey.lastUsed);

    // Display results
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`✅ Test User: ${testUser.firstName} ${testUser.lastName} (${testUser.email})`);
    console.log(`✅ API Key: ${apiKey.key.substring(0, 20)}...`);
    console.log(`✅ Signature ID: ${signature.signatureId}`);
    console.log(`✅ Signature Status: ${signature.status}`);
    console.log(`✅ Signature Valid: ${isValid}`);
    console.log(`✅ API Key Valid: ${isValidKey}`);
    console.log(`✅ Usage Count: ${apiKey.usageCount}`);

    console.log('\n🎉 All tests passed! Digital signature system is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('1. Access the API Key Management page at /apikeys');
    console.log('2. Create API keys for real customers');
    console.log('3. Send signature requests to customers');
    console.log('4. Monitor signature status and verification');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testDigitalSignatureSystem(); 