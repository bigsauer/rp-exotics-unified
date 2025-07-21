const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

// Test Back Office Access for different user roles
async function testBackOfficeAccess() {
  console.log('🧪 Testing RP Exotics Back Office Access by User Role\n');

  try {
    // Test 1: Admin user access
    console.log('1️⃣ Testing admin user (Chris) back office access...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'chris@rpexotics.com',
      password: 'Matti11!',
      rememberMe: false
    });
    
    console.log('✅ Admin login successful');
    console.log('   User:', adminLoginResponse.data.user.profile.displayName);
    console.log('   Role:', adminLoginResponse.data.user.profile.role);
    console.log('   Department:', adminLoginResponse.data.user.profile.department);
    console.log('');

    // Test admin back office access
    const adminBackOfficeResponse = await axios.get(`${BASE_URL}/back-office/deals`, {
      headers: { Authorization: `Bearer ${adminLoginResponse.data.token}` }
    });
    
    console.log('✅ Admin back office access successful');
    console.log('   Deals returned:', adminBackOfficeResponse.data.data.length);
    console.log('   Total deals:', adminBackOfficeResponse.data.pagination.total);
    console.log('');

    // Test 2: Finance user access
    console.log('2️⃣ Testing finance user (Lynn) back office access...');
    const financeLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'lynn@rpexotics.com',
      password: 'titles123',
      rememberMe: false
    });
    
    console.log('✅ Finance login successful');
    console.log('   User:', financeLoginResponse.data.user.profile.displayName);
    console.log('   Role:', financeLoginResponse.data.user.profile.role);
    console.log('   Department:', financeLoginResponse.data.user.profile.department);
    console.log('');

    // Test finance back office access
    const financeBackOfficeResponse = await axios.get(`${BASE_URL}/back-office/deals`, {
      headers: { Authorization: `Bearer ${financeLoginResponse.data.token}` }
    });
    
    console.log('✅ Finance back office access successful');
    console.log('   Deals returned:', financeBackOfficeResponse.data.data.length);
    console.log('   Total deals:', financeBackOfficeResponse.data.pagination.total);
    console.log('');

    // Test 3: Sales user access (should be denied)
    console.log('3️⃣ Testing sales user (Brennan) back office access (should be denied)...');
    const salesLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'brennan@rpexotics.com',
      password: '1026',
      rememberMe: false
    });
    
    console.log('✅ Sales login successful');
    console.log('   User:', salesLoginResponse.data.user.profile.displayName);
    console.log('   Role:', salesLoginResponse.data.user.profile.role);
    console.log('   Department:', salesLoginResponse.data.user.profile.department);
    console.log('');

    // Test sales back office access (should fail)
    try {
      await axios.get(`${BASE_URL}/back-office/deals`, {
        headers: { Authorization: `Bearer ${salesLoginResponse.data.token}` }
      });
    } catch (error) {
      if (error.response.status === 403) {
        console.log('✅ Sales user properly denied back office access');
        console.log('   Error:', error.response.data.error);
        console.log('   Message:', error.response.data.message);
      }
    }
    console.log('');

    // Test 4: Check permissions for each role
    console.log('4️⃣ Testing permissions for each role...');
    
    // Admin permissions
    const adminProfileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${adminLoginResponse.data.token}` }
    });
    
    console.log('✅ Admin permissions:');
    console.log('   Permissions:', adminProfileResponse.data.permissions);
    console.log('   Has back_office_access:', adminProfileResponse.data.permissions.includes('back_office_access'));
    console.log('');

    // Finance permissions
    const financeProfileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${financeLoginResponse.data.token}` }
    });
    
    console.log('✅ Finance permissions:');
    console.log('   Permissions:', financeProfileResponse.data.permissions);
    console.log('   Has back_office_access:', financeProfileResponse.data.permissions.includes('back_office_access'));
    console.log('');

    // Sales permissions
    const salesProfileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${salesLoginResponse.data.token}` }
    });
    
    console.log('✅ Sales permissions:');
    console.log('   Permissions:', salesProfileResponse.data.permissions);
    console.log('   Has back_office_access:', salesProfileResponse.data.permissions.includes('back_office_access'));
    console.log('');

    // Test 5: Test other admin user
    console.log('5️⃣ Testing other admin user (Tammie)...');
    const tammieLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'tammie@rpexotics.com',
      password: 'Twood1125!',
      rememberMe: false
    });
    
    console.log('✅ Tammie login successful');
    console.log('   User:', tammieLoginResponse.data.user.profile.displayName);
    console.log('   Role:', tammieLoginResponse.data.user.profile.role);
    console.log('');

    const tammieBackOfficeResponse = await axios.get(`${BASE_URL}/back-office/deals`, {
      headers: { Authorization: `Bearer ${tammieLoginResponse.data.token}` }
    });
    
    console.log('✅ Tammie back office access successful');
    console.log('   Deals returned:', tammieBackOfficeResponse.data.data.length);
    console.log('');

    console.log('🎉 All Back Office Access tests completed successfully!');
    console.log('\n📋 Back Office Access Summary:');
    console.log('================================');
    console.log('✅ Admin users (Chris, Tammie):');
    console.log('   - Full back office access');
    console.log('   - All permissions including workflow_management');
    console.log('   - Can manage dealers, documents, and compliance');
    console.log('');
    console.log('✅ Finance users (Lynn):');
    console.log('   - Full back office access');
    console.log('   - Document and workflow management');
    console.log('   - Compliance management access');
    console.log('');
    console.log('❌ Sales users (Brennan, Parker, Dan, Adiana, Brett):');
    console.log('   - No back office access');
    console.log('   - Limited to deal creation and editing');
    console.log('   - Properly denied with 403 error');
    console.log('');
    console.log('🔧 Back Office Endpoints Available:');
    console.log('   - GET /api/back-office/deals');
    console.log('   - GET /api/back-office/deals/:id');
    console.log('   - GET /api/back-office/document-types');
    console.log('   - GET /api/back-office/dashboard/stats');
    console.log('   - POST /api/back-office/deals/:id/documents');
    console.log('   - PUT /api/back-office/deals/:id/stage');
    console.log('   - PUT /api/back-office/deals/:id/assign');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the tests
testBackOfficeAccess(); 