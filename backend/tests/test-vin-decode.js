const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testVinDecode() {
  console.log('🧪 Testing VIN Decode API\n');

  try {
    // Test VIN decode with a sample VIN
    console.log('1️⃣ Testing VIN decode...');
    const response = await axios.post(`${BASE_URL}/vin/decode`, {
      vin: '1HGBH41JXMN109186' // Sample Honda Civic VIN
    });
    
    console.log('✅ VIN decode successful');
    console.log('   Year:', response.data.data.year);
    console.log('   Make:', response.data.data.make);
    console.log('   Model:', response.data.data.model);
    console.log('   Body Style:', response.data.data.bodyStyle);
    console.log('');

    // Test invalid VIN
    console.log('2️⃣ Testing invalid VIN...');
    try {
      await axios.post(`${BASE_URL}/vin/decode`, {
        vin: 'INVALID'
      });
    } catch (error) {
      if (error.response.status === 400) {
        console.log('✅ Invalid VIN properly rejected');
      }
    }
    console.log('');

    console.log('🎉 VIN decode tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the tests
testVinDecode(); 