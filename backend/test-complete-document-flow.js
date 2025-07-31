const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const VehicleRecord = require('./models/VehicleRecord');
const User = require('./models/User');
const documentGenerator = require('./services/documentGenerator');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testCompleteDocumentFlow() {
  try {
    console.log('🧪 Testing complete document generation and S3 storage flow...');
    
    // Create a test deal with all required fields
    const testDeal = new Deal({
      vin: 'TEST12345678901234',
      year: '2023',
      make: 'Test',
      model: 'Vehicle',
      vehicle: '2023 Test Vehicle',
      mileage: 50000,
      exteriorColor: 'Red',
      interiorColor: 'Black',
      dealType: 'wholesale-d2d',
      dealType2SubType: 'buy',
      purchasePrice: 25000,
      listPrice: 30000,
      wholesalePrice: 22000,
      killPrice: 20000,
      seller: {
        name: 'Test Seller',
        phone: '555-1234',
        email: 'test@example.com',
        address: '123 Test St, Test City, TS 12345'
      },
      buyer: {
        name: 'Test Buyer',
        phone: '555-5678',
        email: 'buyer@example.com',
        address: '456 Buyer Ave, Buyer City, BC 67890'
      },
      salesperson: 'Test User',
      stockNumber: 'TEST-001',
      rpStockNumber: 'RP-TEST-001'
    });
    
    console.log('📝 Creating test deal...');
    await testDeal.save();
    console.log('✅ Test deal created with ID:', testDeal._id);
    
    // Test document generation
    console.log('🚀 Testing document generation...');
    const mockUser = {
      _id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com'
    };
    
    try {
      const result = await documentGenerator.generateDocument(testDeal, mockUser);
      console.log('✅ Document generation result:', result);
      
      // Check if vehicle record was created
      const vehicleRecord = await VehicleRecord.findOne({ dealId: testDeal._id });
      if (vehicleRecord) {
        console.log('✅ Vehicle record created:', vehicleRecord._id);
        console.log('  - Generated documents:', vehicleRecord.generatedDocuments ? vehicleRecord.generatedDocuments.length : 0);
        
        if (vehicleRecord.generatedDocuments && vehicleRecord.generatedDocuments.length > 0) {
          console.log('📄 Generated documents:');
          vehicleRecord.generatedDocuments.forEach((doc, index) => {
            console.log(`  ${index + 1}. ${doc.fileName} (${doc.documentType})`);
            console.log(`     - File size: ${doc.fileSize} bytes`);
            console.log(`     - S3 URL: ${doc.filePath}`);
            console.log(`     - Status: ${doc.status}`);
          });
        }
      } else {
        console.log('❌ No vehicle record created');
      }
      
      // Check if deal was updated
      const updatedDeal = await Deal.findById(testDeal._id);
      console.log('📋 Updated deal:');
      console.log('  - Vehicle Record ID:', updatedDeal.vehicleRecordId);
      console.log('  - Documents count:', updatedDeal.documents ? updatedDeal.documents.length : 0);
      
      if (updatedDeal.documents && updatedDeal.documents.length > 0) {
        console.log('📄 Deal documents:');
        updatedDeal.documents.forEach((doc, index) => {
          console.log(`  ${index + 1}. ${doc.fileName} (${doc.type})`);
          console.log(`     - File size: ${doc.fileSize} bytes`);
          console.log(`     - S3 URL: ${doc.filePath}`);
          console.log(`     - Uploaded: ${doc.uploaded}`);
        });
      }
      
    } catch (genError) {
      console.error('❌ Document generation failed:', genError);
    }
    
    // Clean up
    console.log('🧹 Cleaning up test data...');
    await Deal.findByIdAndDelete(testDeal._id);
    const vehicleRecord = await VehicleRecord.findOne({ dealId: testDeal._id });
    if (vehicleRecord) {
      await VehicleRecord.findByIdAndDelete(vehicleRecord._id);
    }
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Error testing complete document flow:', error);
  } finally {
    mongoose.connection.close();
  }
}

testCompleteDocumentFlow(); 