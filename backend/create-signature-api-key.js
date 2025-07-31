const mongoose = require('mongoose');
const ApiKey = require('./models/ApiKey');
const User = require('./models/User');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics';

async function createSignatureApiKey() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Example: Create API key for a customer
    const customerEmail = process.argv[2] || 'customer@example.com';
    const customerName = process.argv[3] || 'John Doe';
    
    console.log(`\n🔑 Creating API key for: ${customerName} (${customerEmail})`);

    // First, create or find the user
    let user = await User.findOne({ email: customerEmail });
    if (!user) {
      user = new User({
        firstName: customerName.split(' ')[0],
        lastName: customerName.split(' ').slice(1).join(' ') || 'Customer',
        email: customerEmail,
        username: customerEmail.split('@')[0],
        passwordHash: 'temp-hash', // They'll use API key instead
        role: 'customer',
        isActive: true
      });
      await user.save();
      console.log('✅ Created new user for customer');
    } else {
      console.log('✅ Found existing user');
    }

    // Create API key
    const apiKey = new ApiKey({
      key: ApiKey.generateKey(),
      name: `Signature Key - ${customerName}`,
      description: `API key for ${customerName} to sign documents`,
      type: 'customer',
      entityId: user._id,
      entityType: 'User',
      permissions: {
        signAgreements: true,
        viewDocuments: true,
        createSignatures: false
      },
      createdBy: user._id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    await apiKey.save();
    
    console.log('\n🎉 API Key Created Successfully!');
    console.log('================================');
    console.log(`Customer: ${customerName}`);
    console.log(`Email: ${customerEmail}`);
    console.log(`API Key: ${apiKey.key}`);
    console.log(`Expires: ${apiKey.expiresAt.toDateString()}`);
    console.log('\n📋 Next Steps:');
    console.log('1. Send this API key to the customer securely');
    console.log('2. Create a signature request for the document');
    console.log('3. Customer can sign using the API key');

  } catch (error) {
    console.error('❌ Error creating API key:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Usage: node create-signature-api-key.js "customer@example.com" "John Doe"
if (require.main === module) {
  createSignatureApiKey();
}

module.exports = { createSignatureApiKey }; 