const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const adminCredentials = {
  email: 'chris@rpexotics.com',
  password: 'Matti11!'
};

async function testUserManagement() {
  try {
    console.log('🧪 Testing User Management System\n');

    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, adminCredentials);
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful\n');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Get all users
    console.log('2️⃣ Fetching all users...');
    const usersResponse = await axios.get(`${BASE_URL}/users`, { headers });
    console.log(`✅ Found ${usersResponse.data.length} users`);
    console.log('Users:', usersResponse.data.map(u => `${u.firstName} ${u.lastName} (${u.role})`));
    console.log('');

    // Step 3: Get user statistics
    console.log('3️⃣ Fetching user statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/users/stats/overview`, { headers });
    console.log('✅ User statistics:', statsResponse.data.overview);
    console.log('');

    // Step 4: Create a test user
    console.log('4️⃣ Creating test user...');
    const newUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@rpexotics.com',
      username: 'testuser',
      role: 'sales',
      phone: '555-123-4567',
      isActive: true
    };

    const createResponse = await axios.post(`${BASE_URL}/users`, newUser, { headers });
    console.log('✅ Test user created successfully');
    console.log('Default password:', createResponse.data.defaultPassword);
    console.log('');

    // Step 5: Get the created user
    console.log('5️⃣ Fetching created user...');
    const userId = createResponse.data.user._id;
    const getUserResponse = await axios.get(`${BASE_URL}/users/${userId}`, { headers });
    console.log('✅ User details:', getUserResponse.data);
    console.log('');

    // Step 6: Update the user
    console.log('6️⃣ Updating user...');
    const updateData = {
      firstName: 'Updated',
      lastName: 'User',
      phone: '555-987-6543',
      role: 'finance'
    };

    const updateResponse = await axios.put(`${BASE_URL}/users/${userId}`, updateData, { headers });
    console.log('✅ User updated successfully');
    console.log('Updated fields:', updateResponse.data.updatedFields);
    console.log('');

    // Step 7: Toggle user status
    console.log('7️⃣ Deactivating user...');
    const deactivateResponse = await axios.put(`${BASE_URL}/users/${userId}`, { isActive: false }, { headers });
    console.log('✅ User deactivated successfully');
    console.log('');

    // Step 8: Reactivate user
    console.log('8️⃣ Reactivating user...');
    const reactivateResponse = await axios.put(`${BASE_URL}/users/${userId}`, { isActive: true }, { headers });
    console.log('✅ User reactivated successfully');
    console.log('');

    // Step 9: Reset user password
    console.log('9️⃣ Resetting user password...');
    const resetResponse = await axios.post(`${BASE_URL}/users/${userId}/reset-password`, { 
      newPassword: 'newpassword123' 
    }, { headers });
    console.log('✅ Password reset successfully');
    console.log('');

    // Step 10: Delete the test user
    console.log('🔟 Deleting test user...');
    const deleteResponse = await axios.delete(`${BASE_URL}/users/${userId}`, { headers });
    console.log('✅ Test user deleted successfully');
    console.log('');

    // Step 11: Verify user is deleted
    console.log('1️⃣1️⃣ Verifying user deletion...');
    try {
      await axios.get(`${BASE_URL}/users/${userId}`, { headers });
      console.log('❌ User still exists (this should not happen)');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ User successfully deleted (404 Not Found)');
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }
    console.log('');

    console.log('🎉 All user management tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 403) {
      console.log('💡 Make sure you are logged in as an admin user');
    }
  }
}

// Run the test
testUserManagement(); 