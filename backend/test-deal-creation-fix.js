const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

async function testDealCreationFix() {
  console.log('🧪 Testing Deal Creation Fix\n');

  try {
    // Test 1: Create a deal with proper data
    console.log('1️⃣ Creating deal with proper data...');
    const dealData = {
      vin: 'SBM14FCA4LW004366',
      year: 2020,
      make: 'McLaren',
      model: '720S',
      mileage: 5000,
      exteriorColor: 'Orange',
      interiorColor: 'Black',
      dealType: 'wholesale',
      dealType2SubType: 'buy', // This should be mapped to 'Buy'
      purchasePrice: 285000,
      listPrice: 320000,
      killPrice: 300000,
      seller: {
        name: 'Test Dealer',
        company: 'Test Company',
        phone: '555-123-4567',
        email: 'test@dealer.com'
      },
      fundingSource: 'cash',
      paymentMethod: 'check',
      purchaseDate: new Date(),
      salesperson: 'Test User'
    };

    const response = await axios.post(`${API_BASE_URL}/deals`, dealData);
    
    console.log('✅ Deal created successfully');
    console.log('   Deal ID:', response.data.deal._id);
    console.log('   Vehicle Record ID:', response.data.vehicleRecord._id);
    console.log('   Deal Type 2:', response.data.vehicleRecord.dealType2);
    console.log('');

    // Test 2: Create a deal with 'sale' type
    console.log('2️⃣ Creating deal with sale type...');
    const saleDealData = {
      ...dealData,
      vin: 'WBS8M9C50J5K123456',
      dealType2SubType: 'sale', // This should be mapped to 'Sale'
      seller: {
        name: 'Private Seller',
        company: '',
        phone: '555-987-6543',
        email: 'private@email.com'
      }
    };

    const saleResponse = await axios.post(`${API_BASE_URL}/deals`, saleDealData);
    
    console.log('✅ Sale deal created successfully');
    console.log('   Deal ID:', saleResponse.data.deal._id);
    console.log('   Vehicle Record ID:', saleResponse.data.vehicleRecord._id);
    console.log('   Deal Type 2:', saleResponse.data.vehicleRecord.dealType2);
    console.log('');

    console.log('🎉 All tests passed! Deal creation is working properly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('📋 Validation details:', error.response.data.details);
    }
  }
}

testDealCreationFix(); 