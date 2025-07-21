const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

async function testAutoDealerCreation() {
  console.log('🧪 Testing Auto-Dealer Creation System\n');

  try {
    // Test 1: Search for dealers (should return empty if no dealers exist yet)
    console.log('1️⃣ Testing dealer search...');
    try {
      const searchResponse = await axios.get(`${API_BASE_URL}/dealers/search?q=test`);
      console.log('✅ Dealer search working');
      console.log('   Found dealers:', searchResponse.data.length);
    } catch (error) {
      console.log('⚠️  Dealer search failed (expected if MongoDB not connected)');
    }
    console.log('');

    // Test 2: Create a deal with a new dealer (seller)
    console.log('2️⃣ Creating deal with new dealer as seller...');
    const dealData = {
      vin: 'SBM14FCA4LW004366',
      year: '2020',
      make: 'McLaren',
      model: '720S',
      trim: 'Coupe',
      rpStockNumber: 'RP2025001',
      currentStage: 'purchased',
      seller: {
        name: 'Exotic Motors of Miami',
        contactPerson: 'Carlos Rodriguez',
        phone: '305-555-0123',
        email: 'carlos@exoticmotorsmiami.com'
      },
      purchasePrice: 285000,
      notes: 'Test deal with auto-dealer creation'
    };

    try {
      const dealResponse = await axios.post(`${API_BASE_URL}/deals`, dealData);
      console.log('✅ Deal created successfully');
      console.log('   Deal ID:', dealResponse.data.id);
      console.log('   Seller auto-created:', dealResponse.data.sellerCreated || false);
    } catch (error) {
      console.log('❌ Deal creation failed:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 3: Create another deal with the same dealer (should not create duplicate)
    console.log('3️⃣ Creating deal with existing dealer...');
    const dealData2 = {
      vin: 'SBM14FCA4LW004367',
      year: '2021',
      make: 'McLaren',
      model: '765LT',
      trim: 'Spider',
      rpStockNumber: 'RP2025002',
      currentStage: 'purchased',
      seller: {
        name: 'Exotic Motors of Miami', // Same dealer
        contactPerson: 'Carlos Rodriguez',
        phone: '305-555-0123',
        email: 'carlos@exoticmotorsmiami.com'
      },
      purchasePrice: 320000,
      notes: 'Second deal with same dealer'
    };

    try {
      const dealResponse2 = await axios.post(`${API_BASE_URL}/deals`, dealData2);
      console.log('✅ Second deal created successfully');
      console.log('   Deal ID:', dealResponse2.data.id);
      console.log('   Seller auto-created:', dealResponse2.data.sellerCreated || false);
    } catch (error) {
      console.log('❌ Second deal creation failed:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 4: Create a deal with a new dealer as buyer
    console.log('4️⃣ Creating deal with new dealer as buyer...');
    const dealData3 = {
      vin: 'SBM14FCA4LW004368',
      year: '2019',
      make: 'McLaren',
      model: '600LT',
      trim: 'Coupe',
      rpStockNumber: 'RP2025003',
      currentStage: 'sold',
      seller: {
        name: 'Private Seller',
        contactPerson: 'John Doe',
        phone: '555-123-4567'
      },
      buyer: {
        name: 'Luxury Auto Gallery',
        contactPerson: 'Sarah Johnson',
        phone: '212-555-9876',
        email: 'sarah@luxuryautogallery.com'
      },
      purchasePrice: 180000,
      salePrice: 195000,
      notes: 'Deal with new buyer dealer'
    };

    try {
      const dealResponse3 = await axios.post(`${API_BASE_URL}/deals`, dealData3);
      console.log('✅ Deal with buyer created successfully');
      console.log('   Deal ID:', dealResponse3.data.id);
      console.log('   Buyer auto-created:', dealResponse3.data.buyerCreated || false);
    } catch (error) {
      console.log('❌ Deal with buyer failed:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 5: Get all dealers to see what was created
    console.log('5️⃣ Checking all dealers in database...');
    try {
      const dealersResponse = await axios.get(`${API_BASE_URL}/dealers`);
      console.log('✅ Retrieved dealers successfully');
      console.log('   Total dealers:', dealersResponse.data.count);
      dealersResponse.data.data.forEach((dealer, index) => {
        console.log(`   ${index + 1}. ${dealer.name} (${dealer.type})`);
      });
    } catch (error) {
      console.log('❌ Failed to retrieve dealers:', error.response?.data?.message || error.message);
    }
    console.log('');

    console.log('🎉 Auto-dealer creation test completed!');
    console.log('\n📋 Summary:');
    console.log('===========');
    console.log('✅ The system should automatically create dealers when:');
    console.log('   - You create a deal with a new seller');
    console.log('   - You create a deal with a new buyer');
    console.log('   - The dealer name, email, or phone doesn\'t match existing dealers');
    console.log('');
    console.log('✅ The system should NOT create duplicates when:');
    console.log('   - You use the same dealer name, email, or phone');
    console.log('   - You use "Private Seller" or "Private Buyer"');
    console.log('');
    console.log('✅ All dealer data is stored in MongoDB for persistence');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
testAutoDealerCreation(); 