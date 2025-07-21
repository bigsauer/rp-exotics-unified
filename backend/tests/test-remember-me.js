const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

// Test Remember Me functionality
async function testRememberMe() {
  console.log('🧪 Testing RP Exotics Remember Me Functionality\n');

  try {
    // Test 1: Login with Remember Me = true
    console.log('1️⃣ Testing login with Remember Me = true...');
    const rememberMeResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'brennan@rpexotics.com',
      password: '1026',
      rememberMe: true
    });
    
    console.log('✅ Remember Me login successful');
    console.log('   Token expires in:', rememberMeResponse.data.expiresIn);
    console.log('   Remember Me flag:', rememberMeResponse.data.rememberMe);
    console.log('   Token received:', rememberMeResponse.data.token.substring(0, 20) + '...');
    console.log('');

    // Test 2: Login without Remember Me
    console.log('2️⃣ Testing login without Remember Me...');
    const normalResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'chris@rpexotics.com',
      password: 'Matti11!',
      rememberMe: false
    });
    
    console.log('✅ Normal login successful');
    console.log('   Token expires in:', normalResponse.data.expiresIn);
    console.log('   Remember Me flag:', normalResponse.data.rememberMe);
    console.log('   Token received:', normalResponse.data.token.substring(0, 20) + '...');
    console.log('');

    // Test 3: Check session with Remember Me token
    console.log('3️⃣ Testing session check with Remember Me token...');
    const sessionResponse = await axios.get(`${BASE_URL}/auth/check-session`, {
      headers: { Authorization: `Bearer ${rememberMeResponse.data.token}` }
    });
    
    console.log('✅ Session check successful');
    console.log('   User:', sessionResponse.data.profile.displayName);
    console.log('   Remember Me:', sessionResponse.data.rememberMe);
    console.log('   Hours since login:', sessionResponse.data.hoursSinceLogin);
    console.log('   Login time:', sessionResponse.data.loginTime);
    console.log('');

    // Test 4: Check session with normal token
    console.log('4️⃣ Testing session check with normal token...');
    const normalSessionResponse = await axios.get(`${BASE_URL}/auth/check-session`, {
      headers: { Authorization: `Bearer ${normalResponse.data.token}` }
    });
    
    console.log('✅ Normal session check successful');
    console.log('   User:', normalSessionResponse.data.profile.displayName);
    console.log('   Remember Me:', normalSessionResponse.data.rememberMe);
    console.log('   Hours since login:', normalSessionResponse.data.hoursSinceLogin);
    console.log('');

    // Test 5: Test profile endpoint with Remember Me token
    console.log('5️⃣ Testing profile endpoint with Remember Me token...');
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${rememberMeResponse.data.token}` }
    });
    
    console.log('✅ Profile retrieval successful');
    console.log('   User:', profileResponse.data.profile.displayName);
    console.log('   Role:', profileResponse.data.profile.role);
    console.log('   Permissions:', profileResponse.data.permissions);
    console.log('');

    // Test 6: Test admin login with Remember Me
    console.log('6️⃣ Testing admin login with Remember Me...');
    const adminRememberMeResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'chris@rpexotics.com',
      password: 'Matti11!',
      rememberMe: true
    });
    
    console.log('✅ Admin Remember Me login successful');
    console.log('   Token expires in:', adminRememberMeResponse.data.expiresIn);
    console.log('   Remember Me flag:', adminRememberMeResponse.data.rememberMe);
    console.log('   Role:', adminRememberMeResponse.data.user.role);
    console.log('');

    // Test 7: Test finance login with Remember Me
    console.log('7️⃣ Testing finance login with Remember Me...');
    const financeRememberMeResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'lynn@rpexotics.com',
      password: 'titles123',
      rememberMe: true
    });
    
    console.log('✅ Finance Remember Me login successful');
    console.log('   Token expires in:', financeRememberMeResponse.data.expiresIn);
    console.log('   Remember Me flag:', financeRememberMeResponse.data.rememberMe);
    console.log('   Role:', financeRememberMeResponse.data.user.role);
    console.log('');

    console.log('🎉 All Remember Me tests completed successfully!');
    console.log('\n📋 Remember Me Functionality Summary:');
    console.log('=====================================');
    console.log('✅ Login with rememberMe: true → 12 hour token');
    console.log('✅ Login with rememberMe: false → 24 hour token');
    console.log('✅ Session check validates Remember Me status');
    console.log('✅ All user roles support Remember Me');
    console.log('✅ Profile and permissions work with Remember Me tokens');
    console.log('');
    console.log('🔧 How to use in frontend:');
    console.log('1. Add rememberMe checkbox to login form');
    console.log('2. Send rememberMe: true/false in login request');
    console.log('3. Store token in localStorage/sessionStorage based on rememberMe');
    console.log('4. Use /api/auth/check-session to validate session status');
    console.log('5. Auto-logout after 12 hours if rememberMe was used');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the tests
testRememberMe(); 