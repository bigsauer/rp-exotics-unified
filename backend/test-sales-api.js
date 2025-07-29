const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.REACT_APP_API_URL || 'https://astonishing-chicken-production.up.railway.app';

async function testSalesAPI() {
  try {
    console.log('🔗 Testing Sales API endpoint...');
    console.log('📍 API Base:', API_BASE);
    
    // First, try to login to get a token
    console.log('\n🔐 Attempting login...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'lynn@rpexotics.com',
      password: 'titles123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test the sales deals endpoint
    console.log('\n📊 Testing sales deals endpoint...');
    const salesResponse = await axios.get(`${API_BASE}/api/sales/deals`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Sales deals endpoint response status:', salesResponse.status);
    console.log('📋 Response data:', JSON.stringify(salesResponse.data, null, 2));
    
    if (salesResponse.data.deals && salesResponse.data.deals.length > 0) {
      console.log(`\n🎉 Found ${salesResponse.data.deals.length} deals!`);
      salesResponse.data.deals.forEach((deal, index) => {
        console.log(`\n--- Deal ${index + 1} ---`);
        console.log('ID:', deal._id);
        console.log('Vehicle:', deal.vehicle);
        console.log('VIN:', deal.vin);
        console.log('Current Stage:', deal.currentStage);
        console.log('Customer:', deal.customer?.name);
      });
    } else {
      console.log('❌ No deals found in response');
    }
    
  } catch (error) {
    console.error('❌ Error testing sales API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testSalesAPI(); 