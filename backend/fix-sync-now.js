// Fix sync issue by calling the server endpoint
const axios = require('axios');

const API_BASE = 'http://localhost:5001';

async function fixSyncNow() {
  console.log('🔧 Fixing sync issue now...\n');
  
  try {
    console.log('Calling fix-sync-issue endpoint...');
    
    const response = await axios.post(`${API_BASE}/api/fix-sync-issue`, {}, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('✅ Fix completed successfully!');
    console.log('Response:', response.data);
    
    if (response.data.summary) {
      console.log('\n📊 Summary:');
      console.log(`   Created: ${response.data.summary.created} sales deals`);
      console.log(`   Skipped: ${response.data.summary.skipped} (already existed)`);
      console.log(`   Errors: ${response.data.summary.errors}`);
      console.log(`   Sync count: ${response.data.summary.syncCount}`);
    }
    
    console.log('\n🎉 The sync system should now be working properly!');
    console.log('Check the server logs to see the sync in action.');
    
  } catch (error) {
    console.error('❌ Error fixing sync issue:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 The endpoint requires authentication. You may need to:');
      console.log('1. Log in to the system first');
      console.log('2. Use a valid authentication token');
      console.log('3. Or check the server logs for manual execution');
    }
  }
}

// Run the fix
fixSyncNow(); 