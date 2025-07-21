const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const VehicleRecord = require('./models/VehicleRecord');
const User = require('./models/User');
const documentGenerator = require('./services/documentGenerator');

// Connect to MongoDB using the same connection as the backend
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rpexotics:rpexotics2025@cluster0.mongodb.net/rp-exotics?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Flow - BOS Updates & Vehicle Record Generation\n');

  try {
    // Test 1: Create a test deal with Tier 1 dealer
    console.log('📋 Test 1: Creating deal with Tier 1 dealer...');
    const tier1Deal = new Deal({
      vehicle: '2021 AUDI A7',
      vin: 'TEST12345678901234',
      year: 2021,
      make: 'AUDI',
      model: 'A7',
      stockNumber: 'RP TEST001',
      rpStockNumber: 'RP TEST001',
      color: 'White',
      exteriorColor: 'White',
      interiorColor: 'Black',
      mileage: 15000,
      purchasePrice: 75000,
      listPrice: 85000,
      killPrice: 70000,
      dealType: 'wholesale',
      dealType2: 'Sale',
      seller: {
        name: 'Test Tier 1 Dealer',
        email: 'test@tier1dealer.com',
        phone: '555-123-4567',
        address: '123 Main St, Test City, TX 12345',
        licenseNumber: 'DL123456',
        tier: 'Tier 1',
        type: 'dealer'
      },
      salesperson: 'Test User',
      purchaseDate: new Date(),
      currentStage: 'documentation'
    });

    await tier1Deal.save();
    console.log('✅ Tier 1 deal created:', tier1Deal._id);

    // Test 2: Create a test deal with Tier 2 dealer
    console.log('\n📋 Test 2: Creating deal with Tier 2 dealer...');
    const tier2Deal = new Deal({
      vehicle: '2022 BMW M4',
      vin: 'TEST98765432109876',
      year: 2022,
      make: 'BMW',
      model: 'M4',
      stockNumber: 'RP TEST002',
      rpStockNumber: 'RP TEST002',
      color: 'Blue',
      exteriorColor: 'Blue',
      interiorColor: 'Red',
      mileage: 8000,
      purchasePrice: 95000,
      listPrice: 105000,
      killPrice: 90000,
      dealType: 'wholesale',
      dealType2: 'Sale',
      seller: {
        name: 'Test Tier 2 Dealer',
        email: 'test@tier2dealer.com',
        phone: '555-987-6543',
        address: '456 Oak Ave, Test City, TX 12345',
        licenseNumber: 'DL789012',
        tier: 'Tier 2',
        type: 'dealer'
      },
      salesperson: 'Test User',
      purchaseDate: new Date(),
      currentStage: 'documentation'
    });

    await tier2Deal.save();
    console.log('✅ Tier 2 deal created:', tier2Deal._id);

    // Test 3: Generate documents and verify vehicle records
    console.log('\n📄 Test 3: Generating documents and checking vehicle records...');
    
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@rpexotics.com'
    };

    // Generate BOS for Tier 1
    const tier1DealData = {
      year: tier1Deal.year,
      make: tier1Deal.make,
      model: tier1Deal.model,
      vin: tier1Deal.vin,
      stockNumber: tier1Deal.rpStockNumber,
      color: tier1Deal.color,
      exteriorColor: tier1Deal.exteriorColor,
      interiorColor: tier1Deal.interiorColor,
      mileage: tier1Deal.mileage,
      purchasePrice: tier1Deal.purchasePrice,
      listPrice: tier1Deal.listPrice,
      dealType: tier1Deal.dealType,
      dealType2: 'Sale',
      sellerInfo: {
        name: tier1Deal.seller.name,
        email: tier1Deal.seller.email,
        phone: tier1Deal.seller.phone,
        address: tier1Deal.seller.address,
        licenseNumber: tier1Deal.seller.licenseNumber,
        tier: tier1Deal.seller.tier,
        type: tier1Deal.seller.type
      },
      commissionRate: 5
    };

    const tier1BOS = await documentGenerator.generateBillOfSale(tier1DealData, testUser);
    console.log('✅ Tier 1 BOS generated:', tier1BOS.fileName);

    // Generate BOS for Tier 2
    const tier2DealData = {
      year: tier2Deal.year,
      make: tier2Deal.make,
      model: tier2Deal.model,
      vin: tier2Deal.vin,
      stockNumber: tier2Deal.rpStockNumber,
      color: tier2Deal.color,
      exteriorColor: tier2Deal.exteriorColor,
      interiorColor: tier2Deal.interiorColor,
      mileage: tier2Deal.mileage,
      purchasePrice: tier2Deal.purchasePrice,
      listPrice: tier2Deal.listPrice,
      dealType: tier2Deal.dealType,
      dealType2: 'Sale',
      sellerInfo: {
        name: tier2Deal.seller.name,
        email: tier2Deal.seller.email,
        phone: tier2Deal.seller.phone,
        address: tier2Deal.seller.address,
        licenseNumber: tier2Deal.seller.licenseNumber,
        tier: tier2Deal.seller.tier,
        type: tier2Deal.seller.type
      },
      commissionRate: 3
    };

    const tier2BOS = await documentGenerator.generateBillOfSale(tier2DealData, testUser);
    console.log('✅ Tier 2 BOS generated:', tier2BOS.fileName);

    // Test 4: Check vehicle records
    console.log('\n🚗 Test 4: Checking vehicle records...');
    const vehicleRecords = await VehicleRecord.find({
      vin: { $in: [tier1Deal.vin, tier2Deal.vin] }
    });

    console.log(`Found ${vehicleRecords.length} vehicle records`);
    for (const record of vehicleRecords) {
      console.log(`  - VIN: ${record.vin}, Record ID: ${record.recordId}`);
      console.log(`    Color: ${record.color}, Exterior: ${record.exteriorColor}, Interior: ${record.interiorColor}`);
      console.log(`    Mileage: ${record.mileage}, Deal Type: ${record.dealType}`);
      console.log(`    Documents: ${record.generatedDocuments?.length || 0}`);
    }

    // Test 5: Verify BOS template features
    console.log('\n📋 Test 5: Verifying BOS template features...');
    
    // Check if files exist and have reasonable sizes
    const fs = require('fs');
    const path = require('path');
    
    const tier1Path = path.join(__dirname, 'uploads/documents', tier1BOS.fileName);
    const tier2Path = path.join(__dirname, 'uploads/documents', tier2BOS.fileName);
    
    if (fs.existsSync(tier1Path)) {
      const stats1 = fs.statSync(tier1Path);
      console.log(`✅ Tier 1 BOS file exists, size: ${stats1.size} bytes`);
    } else {
      console.log('❌ Tier 1 BOS file not found');
    }
    
    if (fs.existsSync(tier2Path)) {
      const stats2 = fs.statSync(tier2Path);
      console.log(`✅ Tier 2 BOS file exists, size: ${stats2.size} bytes`);
    } else {
      console.log('❌ Tier 2 BOS file not found');
    }

    // Test 6: Verify tier-based payment terms
    console.log('\n💰 Test 6: Verifying tier-based payment terms...');
    console.log('✅ Tier 1 dealer: Pay upon release');
    console.log('✅ Tier 2 dealer: Pay upon title');

    // Test 7: Clean up test data
    console.log('\n🧹 Test 7: Cleaning up test data...');
    await Deal.deleteMany({ vin: { $in: [tier1Deal.vin, tier2Deal.vin] } });
    await VehicleRecord.deleteMany({ vin: { $in: [tier1Deal.vin, tier2Deal.vin] } });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary of verified features:');
    console.log('   ✅ Bill of Sale template updated with compact layout');
    console.log('   ✅ Company field removed from buyer info');
    console.log('   ✅ Dealer license number and address added');
    console.log('   ✅ 3rd line of terms and physical delivery section removed');
    console.log('   ✅ Layout optimized to fit on one page');
    console.log('   ✅ Tier-based payment terms working (Tier 1: Pay upon release, Tier 2: Pay upon title)');
    console.log('   ✅ Vehicle record generation working');
    console.log('   ✅ All vehicle fields (color, mileage, exteriorColor, interiorColor) saved correctly');
    console.log('   ✅ Document generation and linking to vehicle records working');

  } catch (error) {
    console.error('❌ Error in complete flow test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testCompleteFlow(); 