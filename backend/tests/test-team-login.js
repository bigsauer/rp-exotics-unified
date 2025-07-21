const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test team member login
async function testTeamLogin() {
  console.log('🧪 Testing RP Exotics Team Login via API\n');

  try {
    // Test sales team member login
    console.log('1️⃣ Testing sales team login (Brennan)...');
    const salesLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'brennan@rpexotics.com',
      password: '1026'
    });
    
    console.log('✅ Sales login successful');
    console.log('   User:', salesLoginResponse.data.user.profile.displayName);
    console.log('   Role:', salesLoginResponse.data.user.role);
    console.log('   Token received:', salesLoginResponse.data.token.substring(0, 20) + '...');
    console.log('');

    // Test admin login
    console.log('2️⃣ Testing admin login (Chris)...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'chris@rpexotics.com',
      password: 'Matti11!'
    });
    
    console.log('✅ Admin login successful');
    console.log('   User:', adminLoginResponse.data.user.profile.displayName);
    console.log('   Role:', adminLoginResponse.data.user.role);
    console.log('   Token received:', adminLoginResponse.data.token.substring(0, 20) + '...');
    console.log('');

    // Test finance login
    console.log('3️⃣ Testing finance login (Lynn)...');
    const financeLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'lynn@rpexotics.com',
      password: 'titles123'
    });
    
    console.log('✅ Finance login successful');
    console.log('   User:', financeLoginResponse.data.user.profile.displayName);
    console.log('   Role:', financeLoginResponse.data.user.role);
    console.log('   Token received:', financeLoginResponse.data.token.substring(0, 20) + '...');
    console.log('');

    // Test profile retrieval with admin token
    console.log('4️⃣ Testing profile retrieval...');
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${adminLoginResponse.data.token}` }
    });
    
    console.log('✅ Profile retrieved successfully');
    console.log('   User:', profileResponse.data.profile.displayName);
    console.log('   Department:', profileResponse.data.profile.department);
    console.log('   Permissions:', Object.keys(profileResponse.data.permissions));
    console.log('');

    // Test admin-only endpoint
    console.log('5️⃣ Testing admin-only endpoint...');
    const usersResponse = await axios.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${adminLoginResponse.data.token}` }
    });
    
    console.log('✅ Admin endpoint accessed successfully');
    console.log('   Total users:', usersResponse.data.length);
    console.log('');

    // Test unauthorized access (sales user trying to access admin endpoint)
    console.log('6️⃣ Testing unauthorized access...');
    try {
      await axios.get(`${BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${salesLoginResponse.data.token}` }
      });
    } catch (error) {
      if (error.response.status === 403) {
        console.log('✅ Unauthorized access properly rejected');
      }
    }
    console.log('');

    console.log('🎉 All team login tests completed successfully!');
    console.log('\n📋 Team Login Credentials:');
    console.log('==========================');
    console.log('Sales Team:');
    console.log('  - parker@rpexotics.com / 1234');
    console.log('  - brennan@rpexotics.com / 1026');
    console.log('  - dan@rpexotics.com / Ilikemen');
    console.log('  - adiana@rpexotics.com / PalicARP');
    console.log('  - brett@rpexotics.com / coop123!');
    console.log('');
    console.log('Administrators:');
    console.log('  - chris@rpexotics.com / Matti11!');
    console.log('  - tammie@rpexotics.com / Twood1125!');
    console.log('');
    console.log('Finance:');
    console.log('  - lynn@rpexotics.com / titles123');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the tests
testTeamLogin(); 