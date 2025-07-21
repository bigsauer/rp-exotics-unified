const documentGenerator = require('./backend/services/documentGenerator');

async function testWholesaleFlipVehicleRecord() {
  console.log('🧪 Testing Wholesale Flip Vehicle Record Generation...');
  
  // Test data for wholesale flip buy/sell deal
  const testDealData = {
    dealType: 'wholesale-flip',
    dealType2SubType: 'buy-sell',
    stockNumber: 'TEST123',
    year: 2023,
    make: 'CADILLAC',
    model: 'Escalade',
    vin: '1GYS4BKL5PR171004',
    mileage: 67000,
    color: 'Blue',
    seller: {
      name: 'John Smith',
      phone: '(555) 123-4567',
      email: 'john@example.com',
      address: '123 Main St, St. Louis, MO 63101'
    },
    buyer: {
      name: 'ABC Motors',
      phone: '(555) 987-6543',
      email: 'sales@abcmotors.com',
      address: '456 Dealer Ave, St. Louis, MO 63102',
      licenseNumber: 'DL12345'
    },
    financial: {
      purchasePrice: 50000,
      listPrice: 55000,
      wholesalePrice: 52000,
      payoffBalance: 45000,
      amountDueToCustomer: 5000,
      amountDueToRP: 2000,
      commissionRate: 4,
      brokerFee: 1000,
      brokerFeePaidTo: 'RP Exotics'
    },
    notes: 'Test wholesale flip deal'
  };
  
  const testUser = {
    firstName: 'Parker',
    lastName: 'Gelber'
  };
  
  try {
    console.log('📄 Generating wholesale flip vehicle record...');
    const result = await documentGenerator.generateWholesaleFlipVehicleRecord(testDealData, testUser);
    
    console.log('✅ Success! Generated vehicle record:');
    console.log('   File Name:', result.fileName);
    console.log('   File Path:', result.filePath);
    console.log('   File Size:', result.fileSize, 'bytes');
    console.log('   Document Number:', result.documentNumber);
    
    console.log('\n🎯 Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testWholesaleFlipVehicleRecord(); 