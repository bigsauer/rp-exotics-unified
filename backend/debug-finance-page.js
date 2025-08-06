const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const SalesDeal = require('./models/SalesDeal');
const VehicleRecord = require('./models/VehicleRecord');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp-exotics-unified')
  .then(async () => {
    console.log('Connected to MongoDB');
    console.log('Database name:', mongoose.connection.db.databaseName);
    
    // Check the specific deal and VehicleRecord from the logs
    const dealId = '6892b5ec2ac38a6e5b8c8271';
    const vehicleRecordId = '6892b5ec2ac38a6e5b8c8274';
    const recordId = 'VR-MDZBFFL2-R79QO';
    const vin = 'ZFF96NMA6R0310402';
    const stockNumber = 'RP1754445292278';
    
    console.log('\n🔍 DEBUGGING FINANCE PAGE ISSUE');
    console.log('=====================================');
    console.log('Deal ID from logs:', dealId);
    console.log('VehicleRecord ID from logs:', vehicleRecordId);
    console.log('Record ID from logs:', recordId);
    console.log('VIN from logs:', vin);
    console.log('Stock Number from logs:', stockNumber);
    
    // Check if the deal exists
    console.log('\n📋 CHECKING DEAL EXISTENCE');
    console.log('=====================================');
    
    let deal = await Deal.findById(dealId);
    if (deal) {
      console.log('✅ Deal found in Deal collection');
      console.log('Deal details:', {
        id: deal._id,
        vin: deal.vin,
        stockNumber: deal.stockNumber,
        dealType: deal.dealType,
        createdAt: deal.createdAt
      });
    } else {
      console.log('❌ Deal not found in Deal collection');
      
      // Check SalesDeal collection
      deal = await SalesDeal.findById(dealId);
      if (deal) {
        console.log('✅ Deal found in SalesDeal collection');
        console.log('SalesDeal details:', {
          id: deal._id,
          vin: deal.vin,
          stockNumber: deal.stockNumber,
          dealType: deal.dealType,
          createdAt: deal.createdAt
        });
      } else {
        console.log('❌ Deal not found in SalesDeal collection either');
      }
    }
    
    // Check if the VehicleRecord exists
    console.log('\n📋 CHECKING VEHICLE RECORD EXISTENCE');
    console.log('=====================================');
    
    let vehicleRecord = await VehicleRecord.findById(vehicleRecordId);
    if (vehicleRecord) {
      console.log('✅ VehicleRecord found by ID');
      console.log('VehicleRecord details:', {
        id: vehicleRecord._id,
        recordId: vehicleRecord.recordId,
        vin: vehicleRecord.vin,
        stockNumber: vehicleRecord.stockNumber,
        dealId: vehicleRecord.dealId,
        dealType: vehicleRecord.dealType,
        dealType2: vehicleRecord.dealType2,
        createdAt: vehicleRecord.createdAt
      });
    } else {
      console.log('❌ VehicleRecord not found by ID');
    }
    
    // Check by recordId
    vehicleRecord = await VehicleRecord.findOne({ recordId });
    if (vehicleRecord) {
      console.log('✅ VehicleRecord found by recordId');
      console.log('VehicleRecord details:', {
        id: vehicleRecord._id,
        recordId: vehicleRecord.recordId,
        vin: vehicleRecord.vin,
        stockNumber: vehicleRecord.stockNumber,
        dealId: vehicleRecord.dealId,
        dealType: vehicleRecord.dealType,
        dealType2: vehicleRecord.dealType2,
        createdAt: vehicleRecord.createdAt
      });
    } else {
      console.log('❌ VehicleRecord not found by recordId');
    }
    
    // Check by VIN
    vehicleRecord = await VehicleRecord.findOne({ vin });
    if (vehicleRecord) {
      console.log('✅ VehicleRecord found by VIN');
      console.log('VehicleRecord details:', {
        id: vehicleRecord._id,
        recordId: vehicleRecord.recordId,
        vin: vehicleRecord.vin,
        stockNumber: vehicleRecord.stockNumber,
        dealId: vehicleRecord.dealId,
        dealType: vehicleRecord.dealType,
        dealType2: vehicleRecord.dealType2,
        createdAt: vehicleRecord.createdAt
      });
    } else {
      console.log('❌ VehicleRecord not found by VIN');
    }
    
    // Check by stockNumber
    vehicleRecord = await VehicleRecord.findOne({ stockNumber });
    if (vehicleRecord) {
      console.log('✅ VehicleRecord found by stockNumber');
      console.log('VehicleRecord details:', {
        id: vehicleRecord._id,
        recordId: vehicleRecord.recordId,
        vin: vehicleRecord.vin,
        stockNumber: vehicleRecord.stockNumber,
        dealId: vehicleRecord.dealId,
        dealType: vehicleRecord.dealType,
        dealType2: vehicleRecord.dealType2,
        createdAt: vehicleRecord.createdAt
      });
    } else {
      console.log('❌ VehicleRecord not found by stockNumber');
    }
    
    // Check all VehicleRecords
    console.log('\n📋 CHECKING ALL VEHICLE RECORDS');
    console.log('=====================================');
    
    const allVehicleRecords = await VehicleRecord.find().sort({ createdAt: -1 }).limit(10);
    console.log(`Total VehicleRecords in database: ${allVehicleRecords.length}`);
    
    if (allVehicleRecords.length > 0) {
      console.log('Recent VehicleRecords:');
      allVehicleRecords.forEach((vr, index) => {
        console.log(`${index + 1}. ${vr.recordId} - ${vr.vin} - ${vr.stockNumber} - ${vr.dealType} - ${vr.createdAt}`);
      });
    } else {
      console.log('No VehicleRecords found in database');
    }
    
    // Check if there are any VehicleRecords with the same dealId
    if (deal) {
      console.log('\n📋 CHECKING VEHICLE RECORDS FOR DEAL');
      console.log('=====================================');
      
      const vehicleRecordsForDeal = await VehicleRecord.find({ dealId: deal._id });
      console.log(`VehicleRecords for deal ${deal._id}: ${vehicleRecordsForDeal.length}`);
      
      vehicleRecordsForDeal.forEach((vr, index) => {
        console.log(`${index + 1}. ${vr.recordId} - ${vr.vin} - ${vr.stockNumber} - ${vr.dealType}`);
      });
    }
    
    // Test the finance page query
    console.log('\n📋 TESTING FINANCE PAGE QUERY');
    console.log('=====================================');
    
    const financePageQuery = {};
    const financePageRecords = await VehicleRecord.find(financePageQuery)
      .populate('dealId', 'vehicle vin stockNumber')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(20);
    
    console.log(`Finance page query returned: ${financePageRecords.length} records`);
    
    if (financePageRecords.length > 0) {
      console.log('Finance page records:');
      financePageRecords.forEach((vr, index) => {
        console.log(`${index + 1}. ${vr.recordId} - ${vr.vin} - ${vr.stockNumber} - ${vr.dealType} - ${vr.createdAt}`);
      });
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Debug failed:', err);
    process.exit(1);
  }); 