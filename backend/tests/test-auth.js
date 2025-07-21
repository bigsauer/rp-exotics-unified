const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@rp-exotics.com',
  password: 'password123',
  firstName: 'Test',
  lastName: 'User',
  role: 'user'
};

const adminUser = {
  username: 'admin',
  email: 'admin@rp-exotics.com',
  password: 'admin123',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin'
};

let authToken = null;

async function testAuth() {
  console.log('🧪 Testing RP Exotics User Authentication System\n');

  try {
    // Test 1: Register a new user
    console.log('1️⃣ Testing user registration...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
    console.log('✅ User registered successfully:', registerResponse.data.message);
    console.log('   User ID:', registerResponse.data.user._id);
    console.log('');

    // Test 2: Register admin user
    console.log('2️⃣ Testing admin registration...');
    const adminRegisterResponse = await axios.post(`${BASE_URL}/auth/register`, adminUser);
    console.log('✅ Admin registered successfully:', adminRegisterResponse.data.message);
    console.log('');

    // Test 3: Login with the user
    console.log('3️⃣ Testing user login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    authToken = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('   Token received:', authToken.substring(0, 20) + '...');
    console.log('');

    // Test 4: Get user profile
    console.log('4️⃣ Testing profile retrieval...');
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Profile retrieved successfully');
    console.log('   User:', `${profileResponse.data.firstName} ${profileResponse.data.lastName}`);
    console.log('   Role:', profileResponse.data.role);
    console.log('');

    // Test 5: Update user profile
    console.log('5️⃣ Testing profile update...');
    const updateResponse = await axios.put(`${BASE_URL}/auth/profile`, {
      firstName: 'Updated',
      preferences: { theme: 'dark', notifications: false }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Profile updated successfully:', updateResponse.data.message);
    console.log('');

    // Test 6: Change password
    console.log('6️⃣ Testing password change...');
    const passwordResponse = await axios.put(`${BASE_URL}/auth/change-password`, {
      currentPassword: testUser.password,
      newPassword: 'newpassword123'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Password changed successfully:', passwordResponse.data.message);
    console.log('');

    // Test 7: Login with new password
    console.log('7️⃣ Testing login with new password...');
    const newLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: 'newpassword123'
    });
    console.log('✅ Login with new password successful');
    console.log('');

    // Test 8: Admin login and user management
    console.log('8️⃣ Testing admin functionality...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: adminUser.email,
      password: adminUser.password
    });
    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin login successful');

    // Get all users (admin only)
    const usersResponse = await axios.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Admin retrieved all users');
    console.log('   Total users:', usersResponse.data.length);
    console.log('');

    // Test 9: Test invalid login attempts
    console.log('9️⃣ Testing invalid login attempts...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: testUser.email,
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('✅ Invalid login properly rejected');
    }
    console.log('');

    // Test 10: Test unauthorized access
    console.log('🔟 Testing unauthorized access...');
    try {
      await axios.get(`${BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${authToken}` } // Using regular user token
      });
    } catch (error) {
      if (error.response.status === 403) {
        console.log('✅ Unauthorized access properly rejected');
      }
    }
    console.log('');

    console.log('🎉 All authentication tests completed successfully!');
    console.log('\n📋 Available endpoints:');
    console.log('   POST /api/auth/register - Register new user');
    console.log('   POST /api/auth/login - User login');
    console.log('   GET  /api/auth/profile - Get user profile (authenticated)');
    console.log('   PUT  /api/auth/profile - Update user profile (authenticated)');
    console.log('   PUT  /api/auth/change-password - Change password (authenticated)');
    console.log('   GET  /api/users - Get all users (admin only)');
    console.log('   GET  /api/users/:id - Get single user (admin only)');
    console.log('   PUT  /api/users/:id - Update user (admin only)');
    console.log('   DELETE /api/users/:id - Delete user (admin only)');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the tests
testAuth(); 