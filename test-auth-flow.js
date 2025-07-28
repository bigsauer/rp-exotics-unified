const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'https://astonishing-chicken-production.up.railway.app';

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow...\n');

  try {
    // Step 1: Test login
    console.log('1️⃣ Testing login...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'clayton@rpexotics.com',
        password: '123123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('   User:', loginData.user.email);
    console.log('   Role:', loginData.user.role);
    console.log('   Token:', loginData.token ? 'Present' : 'Missing');

    // Step 2: Test profile with token
    console.log('\n2️⃣ Testing profile with token...');
    const profileResponse = await fetch(`${API_BASE}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('✅ Profile fetch successful');
      console.log('   User:', profileData.user?.email || profileData.email);
    } else {
      console.log('❌ Profile fetch failed:', profileResponse.status);
    }

    // Step 3: Test VIN decode with token
    console.log('\n3️⃣ Testing VIN decode with token...');
    const vinResponse = await fetch(`${API_BASE}/api/deals/vin/decode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        vin: '1HGBH41JXMN109186'
      })
    });

    if (vinResponse.ok) {
      const vinData = await vinResponse.json();
      console.log('✅ VIN decode successful');
      console.log('   Make:', vinData.data?.make);
      console.log('   Model:', vinData.data?.model);
      console.log('   Year:', vinData.data?.year);
    } else {
      const errorText = await vinResponse.text();
      console.log('❌ VIN decode failed:', vinResponse.status, errorText);
    }

    // Step 4: Test document types with token
    console.log('\n4️⃣ Testing document types with token...');
    const docResponse = await fetch(`${API_BASE}/api/backoffice/document-types`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });

    if (docResponse.ok) {
      const docData = await docResponse.json();
      console.log('✅ Document types fetch successful');
      console.log('   Document types count:', docData.data?.length || 0);
    } else {
      const errorText = await docResponse.text();
      console.log('❌ Document types fetch failed:', docResponse.status, errorText);
    }

    console.log('\n🎉 Authentication flow test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthFlow(); 