const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const VehicleRecord = require('./models/VehicleRecord');
const User = require('./models/User');
const documentGenerator = require('./services/documentGenerator');
require('dotenv').config();

async function testDocumentGeneration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Create a test user
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@rpexotics.com',
      role: 'admin',
      isActive: true
    });
    await testUser.save();
    console.log('✅ Created test user');

    // Create a test deal
    const testDeal = new Deal({
      vehicle: '2020 McLaren 720S',
      vin: 'SBM12AA51LW123456',
      year: 2020,
      make: 'McLaren',
      model: '720S',
      stockNumber: 'RP2025001',
      color: 'Orange',
      mileage: 15000,
      purchasePrice: 220000,
      listPrice: 250000,
      killPrice: 200000,
      dealType: 'retail',
      seller: {
        name: 'John Smith',
        type: 'private',
        contact: {
          address: '123 Main St, Anytown, USA',
          phone: '555-123-4567',
          email: 'john@example.com'
        }
      },
      fundingSource: 'cash',
      paymentMethod: 'check',
      purchaseDate: new Date(),
      currentStage: 'documentation',
      createdBy: testUser._id
    });
    await testDeal.save();
    console.log('✅ Created test deal');

    // Test document generation
    const dealData = {
      year: testDeal.year,
      make: testDeal.make,
      model: testDeal.model,
      vin: testDeal.vin,
      stockNumber: testDeal.stockNumber,
      color: testDeal.color,
      mileage: testDeal.mileage,
      purchasePrice: testDeal.purchasePrice,
      listPrice: testDeal.listPrice,
      dealType: testDeal.dealType,
      dealType2: 'Buy',
      sellerInfo: testDeal.seller,
      commissionRate: 5
    };

    console.log('🔄 Generating document...');
    const documentResult = await documentGenerator.generateDocument(dealData, testUser);
    console.log('✅ Document generated:', documentResult);

    // Create vehicle record
    const vehicleRecord = new VehicleRecord({
      vin: testDeal.vin,
      year: testDeal.year,
      make: testDeal.make,
      model: testDeal.model,
      stockNumber: testDeal.stockNumber,
      color: testDeal.color,
      exteriorColor: testDeal.exteriorColor,
      interiorColor: testDeal.interiorColor,
      mileage: testDeal.mileage,
      dealId: testDeal._id,
      dealType: testDeal.dealType,
      dealType2: 'Buy',
      purchasePrice: testDeal.purchasePrice,
      listPrice: testDeal.listPrice,
      commission: {
        rate: 5,
        amount: testDeal.purchasePrice * 0.05
      },
      generatedDocuments: [{
        documentType: documentResult.documentType,
        fileName: documentResult.fileName,
        filePath: documentResult.filePath,
        fileSize: documentResult.fileSize,
        generatedBy: testUser._id,
        documentNumber: documentResult.documentNumber,
        status: 'draft'
      }],
      createdBy: testUser._id
    });
    await vehicleRecord.save();
    console.log('✅ Created vehicle record:', vehicleRecord.recordId);

    // Update deal with vehicle record reference
    testDeal.vehicleRecordId = vehicleRecord._id;
    await testDeal.save();
    console.log('✅ Updated deal with vehicle record reference');

    console.log('\n🎉 Test completed successfully!');
    console.log('📄 Generated document:', documentResult.fileName);
    console.log('🚗 Vehicle Record ID:', vehicleRecord.recordId);
    console.log('📋 Document Number:', documentResult.documentNumber);

    // Clean up test data
    await Deal.findByIdAndDelete(testDeal._id);
    await VehicleRecord.findByIdAndDelete(vehicleRecord._id);
    await User.findByIdAndDelete(testUser._id);
    console.log('🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testDocumentGeneration(); 