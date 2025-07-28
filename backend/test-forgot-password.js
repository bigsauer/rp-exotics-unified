const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'https://astonishing-chicken-production.up.railway.app';

async function testForgotPassword() {
  console.log('🧪 Testing Forgot Password Functionality...\n');

  try {
    // Test 1: Request password reset for existing user
    console.log('1. Testing password reset request for clayton@rpexotics.com...');
    const resetResponse = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'clayton@rpexotics.com',
        newPassword: 'newpassword123'
      })
    });

    if (resetResponse.ok) {
      const resetData = await resetResponse.json();
      console.log('✅ Password reset request successful:', resetData.message);
    } else {
      const errorData = await resetResponse.json();
      console.log('❌ Password reset request failed:', errorData.error);
    }

    // Test 2: Request password reset for non-existent user
    console.log('\n2. Testing password reset request for non-existent user...');
    const invalidResetResponse = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        newPassword: 'newpassword123'
      })
    });

    if (!invalidResetResponse.ok) {
      const errorData = await invalidResetResponse.json();
      console.log('✅ Correctly rejected non-existent user:', errorData.error);
    } else {
      console.log('❌ Should have rejected non-existent user');
    }

    // Test 3: Test with missing email
    console.log('\n3. Testing password reset request with missing email...');
    const missingEmailResponse = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newPassword: 'newpassword123'
      })
    });

    if (!missingEmailResponse.ok) {
      const errorData = await missingEmailResponse.json();
      console.log('✅ Correctly rejected missing email:', errorData.error);
    } else {
      console.log('❌ Should have rejected missing email');
    }

    // Test 4: Test with missing password
    console.log('\n4. Testing password reset request with missing password...');
    const missingPasswordResponse = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'clayton@rpexotics.com'
      })
    });

    if (!missingPasswordResponse.ok) {
      const errorData = await missingPasswordResponse.json();
      console.log('✅ Correctly rejected missing password:', errorData.error);
    } else {
      console.log('❌ Should have rejected missing password');
    }

    console.log('\n🎉 Forgot password functionality tests completed!');
    console.log('\n📧 Check your email at brennan@rpexotics.com for the password reset request.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testForgotPassword(); 