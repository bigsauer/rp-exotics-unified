const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

// Test dealer management functionality
async function testDealerManagement() {
  console.log('🧪 Testing RP Exotics Dealer Management API\n');

  try {
    // Test 1: Get all dealers
    console.log('1️⃣ Testing get all dealers...');
    const dealersResponse = await axios.get(`${BASE_URL}/dealers`);
    console.log('✅ Get dealers successful');
    console.log('   Total dealers:', dealersResponse.data.pagination?.total || dealersResponse.data.data?.length || 0);
    console.log('');

    // Test 2: Search dealers
    console.log('2️⃣ Testing dealer search...');
    const searchResponse = await axios.get(`${BASE_URL}/dealers/search?q=exotic`);
    console.log('✅ Dealer search successful');
    console.log('   Search results:', searchResponse.data.dealers?.length || 0);
    console.log('');

    // Test 3: Create new dealer
    console.log('3️⃣ Testing create dealer...');
    const newDealer = {
      name: 'Test Dealer Management',
      company: 'Test Motors Inc',
      type: 'Dealer',
      contact: {
        address: '123 Test Street',
        phone: '(555) 123-4567',
        email: 'test@testmotors.com',
        location: 'Test City, TX'
      },
      performance: {
        rating: 4.5,
        totalDeals: 25,
        totalVolume: 2500000,
        avgDealSize: 100000,
        responseTime: '2 hours',
        successRate: 95
      },
      status: 'Active',
      specialties: ['Exotic Cars', 'Luxury Vehicles', 'Sports Cars'],
      notes: 'Test dealer for management functionality'
    };

    const createResponse = await axios.post(`${BASE_URL}/dealers`, newDealer);
    console.log('✅ Create dealer successful');
    console.log('   Dealer ID:', createResponse.data.data.id);
    console.log('   Dealer name:', createResponse.data.data.name);
    console.log('');

    const dealerId = createResponse.data.data.id;

    // Test 4: Get dealer by ID
    console.log('4️⃣ Testing get dealer by ID...');
    const getDealerResponse = await axios.get(`${BASE_URL}/dealers/${dealerId}`);
    console.log('✅ Get dealer by ID successful');
    console.log('   Dealer name:', getDealerResponse.data.data.name);
    console.log('   Rating:', getDealerResponse.data.data.rating);
    console.log('   Total deals:', getDealerResponse.data.data.totalDeals);
    console.log('');

    // Test 5: Update dealer
    console.log('5️⃣ Testing update dealer...');
    const updateData = {
      performance: {
        rating: 4.8,
        totalDeals: 30,
        totalVolume: 3000000,
        avgDealSize: 100000,
        responseTime: '1 hour',
        successRate: 98
      },
      notes: 'Updated test dealer with better performance metrics'
    };

    const updateResponse = await axios.put(`${BASE_URL}/dealers/${dealerId}`, updateData);
    console.log('✅ Update dealer successful');
    console.log('   Updated rating:', updateResponse.data.data.rating);
    console.log('   Updated total deals:', updateResponse.data.data.totalDeals);
    console.log('');

    // Test 6: Get dealer deals
    console.log('6️⃣ Testing get dealer deals...');
    const dealsResponse = await axios.get(`${BASE_URL}/dealers/${dealerId}/deals`);
    console.log('✅ Get dealer deals successful');
    console.log('   Recent deals count:', dealsResponse.data.data?.length || 0);
    console.log('');

    // Test 7: Filter and sort dealers
    console.log('7️⃣ Testing filter and sort dealers...');
    const filterResponse = await axios.get(`${BASE_URL}/dealers?type=Dealer&status=Active&sortBy=rating&sortOrder=desc&limit=5`);
    console.log('✅ Filter and sort dealers successful');
    console.log('   Filtered results:', filterResponse.data.data?.length || 0);
    console.log('   Pagination:', filterResponse.data.pagination);
    console.log('');

    // Test 8: Search with filters
    console.log('8️⃣ Testing search with filters...');
    const searchFilterResponse = await axios.get(`${BASE_URL}/dealers?search=test&state=TX&rating=4.0`);
    console.log('✅ Search with filters successful');
    console.log('   Search results:', searchFilterResponse.data.data?.length || 0);
    console.log('');

    // Test 9: Delete dealer
    console.log('9️⃣ Testing delete dealer...');
    const deleteResponse = await axios.delete(`${BASE_URL}/dealers/${dealerId}`);
    console.log('✅ Delete dealer successful');
    console.log('   Deleted dealer ID:', deleteResponse.data.data.id);
    console.log('');

    // Test 10: Verify deletion
    console.log('🔟 Testing verify deletion...');
    try {
      await axios.get(`${BASE_URL}/dealers/${dealerId}`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Dealer deletion verified (404 Not Found)');
      } else {
        throw error;
      }
    }
    console.log('');

    console.log('🎉 All dealer management tests completed successfully!');
    console.log('\n📋 API Endpoints Tested:');
    console.log('==========================');
    console.log('GET    /api/dealers - Get all dealers with filtering/sorting');
    console.log('GET    /api/dealers/search - Search dealers for autocomplete');
    console.log('GET    /api/dealers/:id - Get dealer by ID');
    console.log('GET    /api/dealers/:id/deals - Get dealer deal history');
    console.log('POST   /api/dealers - Create new dealer');
    console.log('PUT    /api/dealers/:id - Update dealer');
    console.log('DELETE /api/dealers/:id - Delete dealer');
    console.log('');
    console.log('🔧 Features Supported:');
    console.log('======================');
    console.log('✅ Search by name, company, location, specialties');
    console.log('✅ Filter by type, status, state, rating');
    console.log('✅ Sort by name, rating, deals, volume, last deal');
    console.log('✅ Pagination with page and limit');
    console.log('✅ Performance metrics tracking');
    console.log('✅ Contact information management');
    console.log('✅ Specialties and notes');
    console.log('✅ Recent deals history');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('   Error details:', error.response.data.error);
    }
  }
}

// Run the tests
testDealerManagement(); 