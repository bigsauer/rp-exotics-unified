const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const VehicleRecord = require('./models/VehicleRecord');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testDocumentGeneration() {
  try {
    console.log('🧪 Testing document generation for retail-d2d buy deal...');
    
    // Get a test user for document generation
    const testUser = await User.findOne();
    if (!testUser) {
      console.log('❌ No users found in database');
      return;
    }

    console.log('👤 Using test user:', testUser.email);
    
    // Create a test retail-d2d buy deal with all required fields
    const testDeal = new Deal({
      dealType: 'retail-d2d',
      dealType2: 'Buy',
      dealType2SubType: 'buy',
      vehicle: '2021 Honda Civic', // Required field
      vin: '1HGBH41JXMN109186',
      year: 2021,
      make: 'Honda',
      model: 'Civic',
      stockNumber: 'RETAIL-D2D-001',
      color: 'Blue',
      exteriorColor: 'Blue',
      interiorColor: 'Black',
      mileage: 25000,
      purchasePrice: 15000,
      listPrice: 18000,
      instantOffer: 14000,
      wholesalePrice: 16000,
      salesperson: 'Test Salesperson',
      seller: {
        name: 'Test Private Seller',
        type: 'private',
        contact: {
          phone: '555-123-4567',
          email: 'test@private.com'
        },
        tier: 'Tier 1'
      },
      buyer: {
        name: 'RP Exotics',
        type: 'dealer',
        contact: {
          phone: '555-987-6543',
          email: 'buyer@rpexotics.com'
        },
        tier: 'Tier 1'
      },
      paymentMethod: 'check',
      currentStage: 'contract-received',
      priority: 'medium',
      createdBy: testUser._id,
      workflowHistory: [{
        stage: 'contract-received',
        changedBy: testUser._id,
        notes: 'Test retail-d2d buy deal'
      }]
    });

    await testDeal.save();
    console.log('📋 Created test retail-d2d buy deal:');
    console.log('  - Deal Number:', testDeal.dealNumber);
    console.log('  - Deal Type:', testDeal.dealType);
    console.log('  - Deal Type2:', testDeal.dealType2);
    console.log('  - Deal Type2SubType:', testDeal.dealType2SubType);
    console.log('  - Vehicle:', `${testDeal.year} ${testDeal.make} ${testDeal.model}`);
    console.log('  - VIN:', testDeal.vin);
    console.log('  - Seller Name:', testDeal.seller.name);
    console.log('  - Seller Type:', testDeal.seller.type);
    console.log('  - Salesperson:', testDeal.salesperson);
    console.log('  - Purchase Price:', testDeal.purchasePrice);
    console.log('✅ Test deal saved with ID:', testDeal._id);

    // Create vehicle record
    console.log('📄 Creating vehicle record for retail-d2d buy deal...');
    
    let vehicleRecord = new VehicleRecord({
      vin: testDeal.vin,
      year: testDeal.year,
      make: testDeal.make,
      model: testDeal.model,
      stockNumber: testDeal.stockNumber || 'N/A',
      color: testDeal.color,
      exteriorColor: testDeal.exteriorColor,
      interiorColor: testDeal.interiorColor,
      mileage: testDeal.mileage,
      salesperson: testDeal.salesperson, // Required field
      dealId: testDeal._id,
      dealType: testDeal.dealType,
      dealType2: testDeal.dealType2 || 'Buy',
      dealType2SubType: testDeal.dealType2SubType || 'buy',
      purchasePrice: testDeal.purchasePrice,
      listPrice: testDeal.listPrice,
      wholesalePrice: testDeal.wholesalePrice || 0,
      instantOffer: testDeal.instantOffer,
      commission: {
        rate: 0,
        amount: 0
      },
      brokerFee: 0, // Use number instead of object
      brokerFeePaidTo: 'N/A',
      payoffBalance: 0,
      amountDueToCustomer: 0,
      amountDueToRP: 0,
      seller: testDeal.seller,
      buyer: testDeal.buyer,
      paymentMethod: testDeal.paymentMethod,
      paymentTerms: 'N/A',
      fundingSource: 'N/A',
      vehicleDescription: testDeal.vehicleDescription,
      generalNotes: testDeal.generalNotes,
      rpStockNumber: testDeal.rpStockNumber,
      generatedDocuments: [],
      createdBy: testUser._id
    });

    await vehicleRecord.save();
    console.log('✅ Vehicle record created with ID:', vehicleRecord._id);

    // Test document generation
    console.log('🔧 Generating documents for retail-d2d buy deal...');
    
    const documentGenerator = require('./services/documentGenerator');

    // Generate wholesale purchase agreement for retail-d2d buy deals
    console.log('🔧 Generating wholesale purchase agreement for retail-d2d buy deal...');
    
    const wholesalePurchaseResult = await documentGenerator.generateWholesalePPBuy(testDeal, testUser);
    
    console.log('📄 Wholesale purchase agreement generation result:', {
      success: !!wholesalePurchaseResult.fileName,
      fileName: wholesalePurchaseResult.fileName,
      fileSize: wholesalePurchaseResult.fileSize
    });

    if (wholesalePurchaseResult.fileName) {
      // Add to vehicle record documents
      vehicleRecord.generatedDocuments.push({
        documentType: 'wholesale_purchase_agreement', // Use correct enum value
        fileName: wholesalePurchaseResult.fileName,
        filePath: wholesalePurchaseResult.filePath,
        fileSize: wholesalePurchaseResult.fileSize,
        generatedBy: testUser._id, // Use generatedBy instead of uploadedBy
        documentNumber: wholesalePurchaseResult.documentNumber,
        status: 'draft'
      });

      await vehicleRecord.save();
      console.log('✅ Vehicle record updated with wholesale purchase agreement');
    }

    // Update deal with vehicle record ID
    testDeal.vehicleRecordId = vehicleRecord._id;
    await testDeal.save();
    console.log('✅ Deal updated with vehicle record ID');

    console.log('\n📋 Final Results:');
    console.log('  - Vehicle Record ID:', vehicleRecord._id);
    console.log('  - Generated Documents:', vehicleRecord.generatedDocuments.length);
    for (let i = 0; i < vehicleRecord.generatedDocuments.length; i++) {
      const doc = vehicleRecord.generatedDocuments[i];
      console.log(`    ${i + 1}. ${doc.fileName} (${doc.documentType})`);
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

testDocumentGeneration(); 