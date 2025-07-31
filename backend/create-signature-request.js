const mongoose = require('mongoose');
const DigitalSignature = require('./models/DigitalSignature');
const Deal = require('./models/Deal');
const ApiKey = require('./models/ApiKey');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics';

async function createSignatureRequest() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get parameters from command line
    const dealId = process.argv[2];
    const documentType = process.argv[3] || 'wholesale_bos';
    const signerEmail = process.argv[4];
    const signerName = process.argv[5];
    const apiKeyValue = process.argv[6];

    if (!dealId || !signerEmail || !signerName || !apiKeyValue) {
      console.log('\n❌ Missing required parameters');
      console.log('Usage: node create-signature-request.js <dealId> <documentType> <signerEmail> <signerName> <apiKey>');
      console.log('Example: node create-signature-request.js 507f1f77bcf86cd799439011 wholesale_bos john@example.com "John Doe" rpex_abc123...');
      return;
    }

    console.log(`\n📄 Creating signature request for:`);
    console.log(`   Deal ID: ${dealId}`);
    console.log(`   Document Type: ${documentType}`);
    console.log(`   Signer: ${signerName} (${signerEmail})`);

    // Verify deal exists
    const deal = await Deal.findById(dealId);
    if (!deal) {
      console.log('❌ Deal not found');
      return;
    }
    console.log(`✅ Found deal: ${deal.vehicle} (${deal.vin})`);

    // Verify API key exists and is valid
    const apiKey = await ApiKey.findOne({ key: apiKeyValue, isActive: true });
    if (!apiKey) {
      console.log('❌ Invalid or inactive API key');
      return;
    }
    if (!apiKey.isValid()) {
      console.log('❌ API key has expired');
      return;
    }
    console.log(`✅ Valid API key found: ${apiKey.name}`);

    // Create signature request
    const signature = new DigitalSignature({
      documentId: dealId,
      documentType: documentType,
      signatureId: DigitalSignature.generateSignatureId(),
      signerType: 'customer',
      signerId: apiKey.entityId,
      signerModel: apiKey.entityType,
      signerName: signerName,
      signerEmail: signerEmail,
      signatureMethod: 'api_key',
      apiKeyUsed: apiKey._id,
      signatureData: {
        timestamp: new Date()
      },
      status: 'pending',
      // Initialize consent fields
      intentToSign: false,
      consentToElectronicBusiness: false,
      signatureAssociation: {
        signerIdentityVerified: false,
        identityVerificationMethod: 'api_key'
      }
    });

    await signature.save();
    
    console.log('\n🎉 Signature Request Created Successfully!');
    console.log('==========================================');
    console.log(`Signature ID: ${signature.signatureId}`);
    console.log(`Status: ${signature.status}`);
    console.log(`Document: ${deal.vehicle} (${deal.vin})`);
    console.log(`Signer: ${signerName} (${signerEmail})`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Send the signature ID to the customer');
    console.log('2. Customer needs to provide consent and sign');
    console.log('3. Monitor signature status');
    
    console.log('\n🔗 Signature URL (for customer):');
    console.log(`https://your-domain.com/sign/${signature.signatureId}`);
    
    console.log('\n📊 To check status:');
    console.log(`GET /api/signatures/status/${signature.signatureId}`);

  } catch (error) {
    console.error('❌ Error creating signature request:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Usage: node create-signature-request.js <dealId> <documentType> <signerEmail> <signerName> <apiKey>
if (require.main === module) {
  createSignatureRequest();
}

module.exports = { createSignatureRequest }; 