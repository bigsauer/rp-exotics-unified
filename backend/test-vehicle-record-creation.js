const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const VehicleRecord = require('./models/VehicleRecord');
const documentGenerator = require('./services/documentGenerator');

// Test data for creating a deal and then generating a wholesale purchase order
const testDealData = {
  year: 2024,
  make: 'McLaren',
  model: '720S',
  vin: 'SBM12AA46KW123456',
  stockNumber: 'RP2025001',
  color: 'Volcano Yellow',
  interiorColor: 'Black Alcantara',
  mileage: 12000,
  purchasePrice: 285000,
  listPrice: 300000,
  killPrice: 250000,
  purchaseDate: new Date(),
  vehicle: '2024 McLaren 720S',
  salesperson: 'Test Salesperson',
  dealType: 'wholesale',
  seller: {
    name: 'Premium Auto Group',
    phone: '(555) 123-4567',
    address: '1234 Business Blvd',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    email: 'sales@premiumautogroup.com'
  },
  currentStage: 'documentation',
  priority: 'medium',
  createdBy: null // Remove this since it's not a valid ObjectId
};

const testUser = {
  firstName: 'John',
  lastName: 'Smith',
  id: 'test-user-123'
};

async function testVehicleRecordCreation() {
  try {
    console.log('🚀 Testing Vehicle Record Creation...');
    
    // Step 1: Create a test deal
    console.log('\n📝 Step 1: Creating test deal...');
    const newDeal = new Deal(testDealData);
    await newDeal.save();
    console.log(`✅ Deal created with ID: ${newDeal._id}`);
    
    // Step 2: Check if vehicle record was created automatically
    console.log('\n🔍 Step 2: Checking for auto-created vehicle record...');
    let vehicleRecord = await VehicleRecord.findOne({ dealId: newDeal._id });
    
    if (vehicleRecord) {
      console.log(`✅ Vehicle record found (auto-created): ${vehicleRecord._id}`);
      console.log(`   - VIN: ${vehicleRecord.vin}`);
      console.log(`   - Deal Type: ${vehicleRecord.dealType}`);
      console.log(`   - Generated Documents: ${vehicleRecord.generatedDocuments.length}`);
    } else {
      console.log('❌ No vehicle record found (should be auto-created)');
    }
    
    // Step 3: Generate wholesale purchase order
    console.log('\n📄 Step 3: Generating wholesale purchase order...');
    const wholesaleDealData = {
      year: newDeal.year,
      make: newDeal.make,
      model: newDeal.model,
      vin: newDeal.vin,
      stockNumber: newDeal.stockNumber,
      color: newDeal.color || 'N/A',
      interiorColor: newDeal.interiorColor || 'N/A',
      mileage: newDeal.mileage,
      purchasePrice: newDeal.purchasePrice,
      dealType: 'wholesale',
      sellerInfo: newDeal.seller,
      notes: 'Test wholesale purchase order',
      vehicleDescription: 'Test vehicle description'
    };
    
    const documentResult = await documentGenerator.generateWholesalePurchaseOrder(wholesaleDealData, testUser);
    console.log(`✅ Wholesale purchase order generated: ${documentResult.fileName}`);
    
    // Step 4: Check if vehicle record was updated with the document
    console.log('\n🔍 Step 4: Checking vehicle record after document generation...');
    vehicleRecord = await VehicleRecord.findOne({ dealId: newDeal._id });
    
    if (vehicleRecord) {
      console.log(`✅ Vehicle record found: ${vehicleRecord._id}`);
      console.log(`   - VIN: ${vehicleRecord.vin}`);
      console.log(`   - Deal Type: ${vehicleRecord.dealType}`);
      console.log(`   - Generated Documents: ${vehicleRecord.generatedDocuments.length}`);
      
      if (vehicleRecord.generatedDocuments.length > 0) {
        console.log('   - Documents:');
        vehicleRecord.generatedDocuments.forEach((doc, index) => {
          console.log(`     ${index + 1}. ${doc.documentType} - ${doc.fileName}`);
        });
      }
    } else {
      console.log('❌ No vehicle record found after document generation');
    }
    
    // Step 5: Clean up test data
    console.log('\n🧹 Step 5: Cleaning up test data...');
    if (vehicleRecord) {
      await VehicleRecord.findByIdAndDelete(vehicleRecord._id);
      console.log('✅ Vehicle record deleted');
    }
    await Deal.findByIdAndDelete(newDeal._id);
    console.log('✅ Deal deleted');
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testVehicleRecordCreation(); 