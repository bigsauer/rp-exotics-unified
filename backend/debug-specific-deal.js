const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const SalesDeal = require('./models/SalesDeal');
const VehicleRecord = require('./models/VehicleRecord');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics';

async function debugSpecificDeal() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const targetStockNumber = 'RP1754431542414';
    const targetVin = 'SCAXZ0C07MU206423';

    console.log(`🔍 Looking for deal with stockNumber: ${targetStockNumber} and VIN: ${targetVin}`);

    // Check in Deal collection
    console.log('\n📋 Checking Deal collection...');
    const deal = await Deal.findOne({ 
      $or: [
        { stockNumber: targetStockNumber },
        { rpStockNumber: targetStockNumber },
        { vin: targetVin }
      ]
    }).lean();

    if (deal) {
      console.log('✅ Found in Deal collection:');
      console.log('  - ID:', deal._id);
      console.log('  - Stock Number:', deal.stockNumber);
      console.log('  - RP Stock Number:', deal.rpStockNumber);
      console.log('  - VIN:', deal.vin);
      console.log('  - Vehicle:', deal.vehicle);
      console.log('  - Deal Type:', deal.dealType);
      console.log('  - Created At:', deal.createdAt);
      console.log('  - Vehicle Record ID:', deal.vehicleRecordId);
    } else {
      console.log('❌ Not found in Deal collection');
    }

    // Check in SalesDeal collection
    console.log('\n📋 Checking SalesDeal collection...');
    const salesDeal = await SalesDeal.findOne({ 
      $or: [
        { stockNumber: targetStockNumber },
        { rpStockNumber: targetStockNumber },
        { vin: targetVin }
      ]
    }).lean();

    if (salesDeal) {
      console.log('✅ Found in SalesDeal collection:');
      console.log('  - ID:', salesDeal._id);
      console.log('  - Stock Number:', salesDeal.stockNumber);
      console.log('  - RP Stock Number:', salesDeal.rpStockNumber);
      console.log('  - VIN:', salesDeal.vin);
      console.log('  - Vehicle:', salesDeal.vehicle);
      console.log('  - Created At:', salesDeal.createdAt);
      console.log('  - Vehicle Record ID:', salesDeal.vehicleRecordId);
    } else {
      console.log('❌ Not found in SalesDeal collection');
    }

    // Check in VehicleRecord collection
    console.log('\n📋 Checking VehicleRecord collection...');
    const vehicleRecord = await VehicleRecord.findOne({ 
      $or: [
        { stockNumber: targetStockNumber },
        { rpStockNumber: targetStockNumber },
        { vin: targetVin }
      ]
    }).lean();

    if (vehicleRecord) {
      console.log('✅ Found in VehicleRecord collection:');
      console.log('  - ID:', vehicleRecord._id);
      console.log('  - Record ID:', vehicleRecord.recordId);
      console.log('  - Stock Number:', vehicleRecord.stockNumber);
      console.log('  - RP Stock Number:', vehicleRecord.rpStockNumber);
      console.log('  - VIN:', vehicleRecord.vin);
      console.log('  - Deal ID:', vehicleRecord.dealId);
      console.log('  - Deal Type:', vehicleRecord.dealType);
      console.log('  - Created At:', vehicleRecord.createdAt);
    } else {
      console.log('❌ Not found in VehicleRecord collection');
    }

    // Check all recent deals with similar VIN or stock number patterns
    console.log('\n📊 Checking for similar deals...');
    const similarDeals = await Deal.find({
      $or: [
        { vin: { $regex: 'SCAXZ0C07MU206423', $options: 'i' } },
        { stockNumber: { $regex: 'RP1754431542414', $options: 'i' } },
        { rpStockNumber: { $regex: 'RP1754431542414', $options: 'i' } }
      ]
    }).lean();

    console.log(`Found ${similarDeals.length} similar deals in Deal collection:`);
    similarDeals.forEach((deal, index) => {
      console.log(`  ${index + 1}. ${deal.vehicle} - ${deal.stockNumber} - ${deal.rpStockNumber} - ${deal.vin} - ${deal.createdAt}`);
    });

    const similarSalesDeals = await SalesDeal.find({
      $or: [
        { vin: { $regex: 'SCAXZ0C07MU206423', $options: 'i' } },
        { stockNumber: { $regex: 'RP1754431542414', $options: 'i' } },
        { rpStockNumber: { $regex: 'RP1754431542414', $options: 'i' } }
      ]
    }).lean();

    console.log(`Found ${similarSalesDeals.length} similar deals in SalesDeal collection:`);
    similarSalesDeals.forEach((deal, index) => {
      console.log(`  ${index + 1}. ${deal.vehicle} - ${deal.stockNumber} - ${deal.rpStockNumber} - ${deal.vin} - ${deal.createdAt}`);
    });

    // Check total counts
    console.log('\n📊 Total counts:');
    const dealCount = await Deal.countDocuments();
    const salesDealCount = await SalesDeal.countDocuments();
    const vehicleRecordCount = await VehicleRecord.countDocuments();
    console.log(`  - Deal records: ${dealCount}`);
    console.log(`  - SalesDeal records: ${salesDealCount}`);
    console.log(`  - VehicleRecord records: ${vehicleRecordCount}`);

    // Check recent deals (last 10)
    console.log('\n📊 Recent deals (last 10):');
    const recentDeals = await Deal.find({}).sort({ createdAt: -1 }).limit(10).lean();
    console.log('Recent Deal records:');
    recentDeals.forEach((deal, index) => {
      console.log(`  ${index + 1}. ${deal.vehicle} - ${deal.stockNumber} - ${deal.rpStockNumber} - ${deal.vin} - ${deal.createdAt}`);
    });

    const recentSalesDeals = await SalesDeal.find({}).sort({ createdAt: -1 }).limit(10).lean();
    console.log('\nRecent SalesDeal records:');
    recentSalesDeals.forEach((deal, index) => {
      console.log(`  ${index + 1}. ${deal.vehicle} - ${deal.stockNumber} - ${deal.rpStockNumber} - ${deal.vin} - ${deal.createdAt}`);
    });

    const recentVehicleRecords = await VehicleRecord.find({}).sort({ createdAt: -1 }).limit(10).lean();
    console.log('\nRecent VehicleRecord records:');
    recentVehicleRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.recordId} - ${record.stockNumber} - ${record.rpStockNumber} - ${record.vin} - ${record.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the debug
debugSpecificDeal(); 