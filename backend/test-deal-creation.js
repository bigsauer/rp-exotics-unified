const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const VehicleRecord = require('./models/VehicleRecord');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testDealCreation() {
  try {
    console.log('🧪 Testing deal creation and document generation...');
    
    // Create a test deal
    const testDeal = new Deal({
      vin: 'TEST12345678901234',
      year: '2023',
      make: 'Test',
      model: 'Vehicle',
      vehicle: '2023 Test Vehicle', // Required field
      mileage: 50000,
      exteriorColor: 'Red',
      interiorColor: 'Black',
      dealType: 'wholesale-d2d',
      dealType2SubType: 'buy',
      purchasePrice: 25000,
      seller: {
        name: 'Test Seller',
        phone: '555-1234',
        email: 'test@example.com'
      },
      salesperson: 'Test User'
    });
    
    console.log('📝 Creating test deal...');
    await testDeal.save();
    console.log('✅ Test deal created with ID:', testDeal._id);
    
    // Check if vehicle record was created
    console.log('🔍 Checking for vehicle record...');
    const vehicleRecord = await VehicleRecord.findOne({ dealId: testDeal._id });
    
    if (vehicleRecord) {
      console.log('✅ Vehicle record found:', vehicleRecord._id);
      console.log('  - Generated documents:', vehicleRecord.generatedDocuments ? vehicleRecord.generatedDocuments.length : 0);
    } else {
      console.log('❌ No vehicle record found');
    }
    
    // Check if deal was updated with vehicle record ID
    const updatedDeal = await Deal.findById(testDeal._id);
    console.log('📋 Updated deal:');
    console.log('  - Vehicle Record ID:', updatedDeal.vehicleRecordId);
    console.log('  - Documents count:', updatedDeal.documents ? updatedDeal.documents.length : 0);
    
    // Clean up
    console.log('🧹 Cleaning up test data...');
    await Deal.findByIdAndDelete(testDeal._id);
    if (vehicleRecord) {
      await VehicleRecord.findByIdAndDelete(vehicleRecord._id);
    }
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Error testing deal creation:', error);
  } finally {
    mongoose.connection.close();
  }
}

testDealCreation(); 