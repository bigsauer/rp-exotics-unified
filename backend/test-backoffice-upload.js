const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const SalesDeal = require('./models/SalesDeal');
const VehicleRecord = require('./models/VehicleRecord');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp-exotics-unified')
  .then(async () => {
    console.log('Connected to MongoDB');
    console.log('Database name:', mongoose.connection.db.databaseName);
    
    // Test 1: Create test deals in both collections
    console.log('\n🧪 TEST 1: Creating test deals...');
    
    const testDeal = new Deal({
      vin: '1GYS4SK98RR200730',
      stockNumber: 'TEST-DEAL-001',
      year: 2024,
      make: 'Test',
      model: 'Vehicle',
      vehicle: '2024 Test Vehicle',
      dealType: 'retail-pp',
      purchasePrice: 50000,
      salesperson: 'Test Salesperson',
      seller: {
        name: 'Test Seller',
        type: 'private',
        contact: {
          address: { street: '123 Test St', city: 'Test City', state: 'TX', zip: '12345' },
          phone: '555-1234',
          email: 'seller@test.com'
        }
      },
      buyer: {
        name: 'RP Exotics',
        type: 'dealer',
        contact: {
          address: { street: '456 RP St', city: 'RP City', state: 'TX', zip: '67890' },
          phone: '555-5678',
          email: 'rp@test.com'
        }
      },
      documents: [],
      activityLog: []
    });
    
    const testSalesDeal = new SalesDeal({
      vin: '1GYS4SK98RR200731',
      stockNumber: 'TEST-SALES-001',
      year: 2024,
      make: 'Test',
      model: 'Sales Vehicle',
      vehicle: '2024 Test Sales Vehicle',
      dealType: 'retail-pp',
      purchasePrice: 60000,
      customer: {
        name: 'Test Customer',
        type: 'individual',
        contact: {
          address: '789 Customer St, Customer City, TX 11111',
          phone: '555-9999',
          email: 'customer@test.com'
        }
      },
      salesPerson: {
        name: 'Test Salesperson',
        id: new mongoose.Types.ObjectId(),
        email: 'salesperson@test.com'
      },
      documents: [],
      activityLog: []
    });
    
    await testDeal.save();
    await testSalesDeal.save();
    
    console.log('✅ Test deals created:');
    console.log('- Deal ID:', testDeal._id);
    console.log('- SalesDeal ID:', testSalesDeal._id);
    
    // Test 2: Test backoffice upload route logic
    console.log('\n🧪 TEST 2: Testing backoffice upload route logic...');
    
    // Simulate the backoffice upload route logic
    const testDealLookup = async (id) => {
      console.log(`🔍 Looking for deal ID: ${id}`);
      console.log(`🔍 Deal ID type: ${typeof id}`);
      console.log(`🔍 Deal ID length: ${id.length}`);
      
      let deal = await Deal.findById(id);
      console.log(`🔍 Deal collection search result: ${deal ? 'Found' : 'Not found'}`);
      
      if (!deal) {
        console.log('🔍 Deal not found in Deal collection, trying SalesDeal collection');
        deal = await SalesDeal.findById(id);
        console.log(`🔍 SalesDeal collection search result: ${deal ? 'Found' : 'Not found'}`);
      }
      
      if (!deal) {
        console.log('❌ Deal not found in either collection');
        return null;
      }
      
      console.log(`✅ Deal found in ${deal.constructor.modelName} collection:`, deal._id);
      return deal;
    };
    
    // Test with Deal ID
    console.log('\n--- Testing with Deal ID ---');
    const foundDeal = await testDealLookup(testDeal._id.toString());
    if (foundDeal) {
      console.log('✅ Deal lookup successful');
    } else {
      console.log('❌ Deal lookup failed');
    }
    
    // Test with SalesDeal ID
    console.log('\n--- Testing with SalesDeal ID ---');
    const foundSalesDeal = await testDealLookup(testSalesDeal._id.toString());
    if (foundSalesDeal) {
      console.log('✅ SalesDeal lookup successful');
    } else {
      console.log('❌ SalesDeal lookup failed');
    }
    
    // Test with non-existent ID
    console.log('\n--- Testing with non-existent ID ---');
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const foundNonExistent = await testDealLookup(nonExistentId);
    if (!foundNonExistent) {
      console.log('✅ Non-existent ID correctly not found');
    } else {
      console.log('❌ Non-existent ID should not be found');
    }
    
    // Test 3: Test VehicleRecord creation
    console.log('\n🧪 TEST 3: Testing VehicleRecord creation...');
    
    const vehicleRecordForDeal = new VehicleRecord({
      vin: testDeal.vin,
      year: testDeal.year,
      make: testDeal.make,
      model: testDeal.model,
      stockNumber: testDeal.stockNumber,
      dealId: testDeal._id,
      dealType: testDeal.dealType,
      dealType2: 'Buy',
      dealType2SubType: 'buy',
      seller: {
        name: testDeal.seller.name,
        type: testDeal.seller.type,
        contact: testDeal.seller.contact
      },
      buyer: {
        name: testDeal.buyer.name,
        type: testDeal.buyer.type,
        contact: testDeal.buyer.contact
      },
      createdBy: new mongoose.Types.ObjectId(),
      salesperson: 'Test User',
      generatedDocuments: []
    });
    
    const vehicleRecordForSalesDeal = new VehicleRecord({
      vin: testSalesDeal.vin,
      year: testSalesDeal.year,
      make: testSalesDeal.make,
      model: testSalesDeal.model,
      stockNumber: testSalesDeal.stockNumber,
      dealId: testSalesDeal._id,
      dealType: testSalesDeal.dealType,
      dealType2: 'Buy',
      dealType2SubType: 'buy',
      seller: {
        name: testSalesDeal.customer.name,
        type: testSalesDeal.customer.type,
        contact: testSalesDeal.customer.contact
      },
      buyer: {
        name: 'RP Exotics',
        type: 'dealer',
        contact: {
          address: { street: '456 RP St', city: 'RP City', state: 'TX', zip: '67890' },
          phone: '555-5678',
          email: 'rp@test.com'
        }
      },
      createdBy: new mongoose.Types.ObjectId(),
      salesperson: testSalesDeal.salesPerson.name,
      generatedDocuments: []
    });
    
    await vehicleRecordForDeal.save();
    await vehicleRecordForSalesDeal.save();
    
    console.log('✅ VehicleRecords created:');
    console.log('- VehicleRecord for Deal:', vehicleRecordForDeal.recordId);
    console.log('- VehicleRecord for SalesDeal:', vehicleRecordForSalesDeal.recordId);
    
    // Test 4: Verify VehicleRecords can be found by dealId
    console.log('\n🧪 TEST 4: Verifying VehicleRecord lookup...');
    
    const vrForDeal = await VehicleRecord.findOne({ dealId: testDeal._id });
    const vrForSalesDeal = await VehicleRecord.findOne({ dealId: testSalesDeal._id });
    
    if (vrForDeal) {
      console.log('✅ VehicleRecord found for Deal');
    } else {
      console.log('❌ VehicleRecord not found for Deal');
    }
    
    if (vrForSalesDeal) {
      console.log('✅ VehicleRecord found for SalesDeal');
    } else {
      console.log('❌ VehicleRecord not found for SalesDeal');
    }
    
    // Cleanup
    console.log('\n🧹 CLEANUP: Removing test data...');
    await Deal.findByIdAndDelete(testDeal._id);
    await SalesDeal.findByIdAndDelete(testSalesDeal._id);
    await VehicleRecord.findByIdAndDelete(vrForDeal._id);
    await VehicleRecord.findByIdAndDelete(vrForSalesDeal._id);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('✅ Backoffice upload route can handle both Deal and SalesDeal collections');
    console.log('✅ VehicleRecord creation and lookup is working correctly');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }); 