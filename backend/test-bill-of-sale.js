const documentGenerator = require('./services/documentGenerator');

async function testBillOfSale() {
  console.log('🧪 Testing Bill of Sale Generation\n');
  
  try {
    // Test data for Bill of Sale
    const testDealData = {
      year: 2023,
      make: 'LAMBORGHINI',
      model: 'Huracan',
      vin: 'ZHWUD4ZF7KLA12744',
      stockNumber: 'RP2025001',
      color: 'Rosso Mars', // Exterior color
      exteriorColor: 'Rosso Mars',
      interiorColor: 'Nero Alcantara',
      mileage: 15000,
      purchasePrice: 285000,
      listPrice: 320000,
      dealType: 'wholesale',
      dealType2: 'sale',
      sellerInfo: {
        name: 'GMTV Motors',
        email: 'sales@gmtvmotors.com',
        phone: '(305) 555-0123',
        company: 'GMTV Motors Inc.',
        // Address fields removed as requested
        // address: '123 Main St',
        // city: 'Miami',
        // state: 'FL',
        // zip: '33101'
      },
      commissionRate: 5
    };

    // Mock user
    const mockUser = {
      firstName: 'Parker',
      lastName: 'G',
      email: 'parker@rpexotics.com'
    };

    console.log('📋 Test Deal Data:');
    console.log('   - Vehicle:', `${testDealData.year} ${testDealData.make} ${testDealData.model}`);
    console.log('   - VIN:', testDealData.vin);
    console.log('   - Exterior Color:', testDealData.exteriorColor);
    console.log('   - Interior Color:', testDealData.interiorColor);
    console.log('   - Seller:', testDealData.sellerInfo.name);
    console.log('   - Deal Type:', testDealData.dealType);
    console.log('   - Contact Info:');
    console.log('     * Email:', testDealData.sellerInfo.email);
    console.log('     * Phone:', testDealData.sellerInfo.phone);
    console.log('     * Company:', testDealData.sellerInfo.company);

    console.log('\n🔄 Generating Bill of Sale...');
    
    // Generate Bill of Sale
    const result = await documentGenerator.generateBillOfSale(testDealData, mockUser);
    
    console.log('\n✅ Bill of Sale Generated Successfully!');
    console.log('   - File Name:', result.fileName);
    console.log('   - File Size:', result.fileSize, 'bytes');
    console.log('   - Document Number:', result.documentNumber);
    console.log('   - File Path:', result.filePath);
    
    console.log('\n📄 Bill of Sale should now include:');
    console.log('   ✅ Exterior Color: Rosso Mars');
    console.log('   ✅ Interior Color: Nero Alcantara');
    console.log('   ✅ No address fields (CITY, STATE, ZIP removed)');
    console.log('   ✅ Company field instead of address');
    console.log('   ✅ Contact Info:');
    console.log('     * Buyer Name: GMTV Motors');
    console.log('     * Email: sales@gmtvmotors.com');
    console.log('     * Phone: (305) 555-0123');
    console.log('     * Company: GMTV Motors Inc.');
    
    console.log('\n🎯 PDF file created at:', result.filePath);
    console.log('   You can open this file to verify the contact info is displayed correctly.');
    
  } catch (error) {
    console.error('❌ Error during Bill of Sale test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testBillOfSale(); 