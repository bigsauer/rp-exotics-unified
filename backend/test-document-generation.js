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
    console.log('🧪 Testing document generation...');
    
    // Get the most recent deal
    const latestDeal = await Deal.findOne().sort({ createdAt: -1 });
    
    if (!latestDeal) {
      console.log('❌ No deals found in database');
      return;
    }
    
    console.log('📋 Testing with deal:');
    console.log('  - ID:', latestDeal._id);
    console.log('  - VIN:', latestDeal.vin);
    console.log('  - Deal Type:', latestDeal.dealType);
    console.log('  - Deal Type 2 Sub Type:', latestDeal.dealType2SubType);
    
    // Simulate the document generation request
    const documentGenerationData = {
      dealType2SubType: latestDeal.dealType2SubType,
      dealType2: latestDeal.dealType2,
      sellerType: latestDeal.sellerType || 'private',
      buyerType: latestDeal.buyerType || 'dealer'
    };
    
    console.log('📤 Document generation data:', documentGenerationData);
    
    // Check if vehicle record exists before
    const vehicleRecordBefore = await VehicleRecord.findOne({ dealId: latestDeal._id });
    console.log('🔍 Vehicle record before generation:', vehicleRecordBefore ? vehicleRecordBefore._id : 'None');
    
    // Simulate the API call by directly calling the document generation logic
    console.log('🚀 Simulating document generation...');
    
    // Import the document generation service
    const documentGenerator = require('./services/documentGenerator');
    
    // Call the document generation function directly
    const result = await documentGenerator.generateDocument(
      latestDeal,
      { _id: 'test-user-id', firstName: 'Test', lastName: 'User' }
    );
    
    console.log('📄 Document generation result:', result);
    
    // Check if vehicle record was created
    const vehicleRecordAfter = await VehicleRecord.findOne({ dealId: latestDeal._id });
    console.log('🔍 Vehicle record after generation:', vehicleRecordAfter ? vehicleRecordAfter._id : 'None');
    
    if (vehicleRecordAfter) {
      console.log('✅ Vehicle record created successfully!');
      console.log('  - Generated documents:', vehicleRecordAfter.generatedDocuments ? vehicleRecordAfter.generatedDocuments.length : 0);
      
      if (vehicleRecordAfter.generatedDocuments && vehicleRecordAfter.generatedDocuments.length > 0) {
        console.log('📄 Generated documents:');
        vehicleRecordAfter.generatedDocuments.forEach((doc, index) => {
          console.log(`  ${index + 1}. ${doc.fileName} (${doc.documentType})`);
        });
      }
    } else {
      console.log('❌ No vehicle record created');
    }
    
    // Check if deal was updated
    const updatedDeal = await Deal.findById(latestDeal._id);
    console.log('📋 Updated deal:');
    console.log('  - Vehicle Record ID:', updatedDeal.vehicleRecordId);
    console.log('  - Documents count:', updatedDeal.documents ? updatedDeal.documents.length : 0);
    
  } catch (error) {
    console.error('❌ Error testing document generation:', error);
  } finally {
    mongoose.connection.close();
  }
}

testDocumentGeneration(); 