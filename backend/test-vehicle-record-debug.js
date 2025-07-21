const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const VehicleRecord = require('./models/VehicleRecord');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics';

async function testVehicleRecordDebug() {
  console.log('🔍 Vehicle Record Debug Test\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check total counts
    const dealCount = await Deal.countDocuments();
    const vehicleRecordCount = await VehicleRecord.countDocuments();
    
    console.log(`\n📊 Database Summary:`);
    console.log(`   - Total Deals: ${dealCount}`);
    console.log(`   - Total Vehicle Records: ${vehicleRecordCount}`);
    
    if (dealCount === 0) {
      console.log('\n⚠️  No deals found in database. Create a deal first to test vehicle record creation.');
      return;
    }
    
    // Get recent deals
    const recentDeals = await Deal.find().sort({ createdAt: -1 }).limit(5);
    console.log(`\n📋 Recent Deals (last 5):`);
    
    for (const deal of recentDeals) {
      console.log(`\n   Deal ID: ${deal._id}`);
      console.log(`   VIN: ${deal.vin}`);
      console.log(`   Vehicle: ${deal.year} ${deal.make} ${deal.model}`);
      console.log(`   Stock Number: ${deal.rpStockNumber || deal.stockNumber}`);
      console.log(`   Deal Type: ${deal.dealType}`);
      console.log(`   Vehicle Record ID: ${deal.vehicleRecordId || 'NOT SET'}`);
      console.log(`   Created: ${deal.createdAt}`);
      
      // Check if vehicle record exists
      if (deal.vehicleRecordId) {
        const vehicleRecord = await VehicleRecord.findById(deal.vehicleRecordId);
        if (vehicleRecord) {
          console.log(`   ✅ Vehicle Record Found: ${vehicleRecord.recordId}`);
          console.log(`      Documents: ${vehicleRecord.generatedDocuments.length}`);
        } else {
          console.log(`   ❌ Vehicle Record Not Found (ID exists but record missing)`);
        }
      } else {
        // Check if vehicle record exists by dealId
        const vehicleRecord = await VehicleRecord.findOne({ dealId: deal._id });
        if (vehicleRecord) {
          console.log(`   ⚠️  Vehicle Record Found but not linked: ${vehicleRecord.recordId}`);
          console.log(`      Documents: ${vehicleRecord.generatedDocuments.length}`);
        } else {
          console.log(`   ❌ No Vehicle Record Found`);
        }
      }
    }
    
    // Check for orphaned vehicle records
    const orphanedRecords = await VehicleRecord.find({ dealId: { $exists: false } });
    if (orphanedRecords.length > 0) {
      console.log(`\n⚠️  Found ${orphanedRecords.length} orphaned vehicle records (no dealId):`);
      orphanedRecords.forEach(record => {
        console.log(`   - ${record.recordId} (${record.vin})`);
      });
    }
    
    // Check for vehicle records without deals
    const vehicleRecords = await VehicleRecord.find().limit(10);
    console.log(`\n📋 Recent Vehicle Records (last 10):`);
    
    for (const record of vehicleRecords) {
      const deal = await Deal.findById(record.dealId);
      console.log(`\n   Record ID: ${record.recordId}`);
      console.log(`   VIN: ${record.vin}`);
      console.log(`   Deal Type: ${record.dealType}`);
      console.log(`   Deal ID: ${record.dealId}`);
      console.log(`   Deal Found: ${deal ? '✅' : '❌'}`);
      console.log(`   Documents: ${record.generatedDocuments.length}`);
      console.log(`   Created: ${record.createdAt}`);
    }
    
  } catch (error) {
    console.error('❌ Error during debug test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testVehicleRecordDebug(); 