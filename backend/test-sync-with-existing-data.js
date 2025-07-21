// Test sync functionality using the existing server
const axios = require('axios');

const API_BASE = 'http://localhost:5001';

async function testSyncWithExistingData() {
  console.log('🧪 Testing sync functionality with existing data...\n');
  
  try {
    // First, let's check what deals exist
    console.log('1️⃣ Checking existing deals...');
    
    const dealsResponse = await axios.get(`${API_BASE}/api/deals`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log(`Found ${dealsResponse.data.data?.length || 0} deals`);
    
    // Get the first few VINs to test sync
    const deals = dealsResponse.data.data || [];
    if (deals.length === 0) {
      console.log('No deals found to test sync with');
      return;
    }
    
    const testVins = deals.slice(0, 3).map(deal => deal.vin);
    console.log(`Testing sync with VINs: ${testVins.join(', ')}`);
    
    // Test sync status for each VIN
    console.log('\n2️⃣ Testing sync status...');
    for (const vin of testVins) {
      try {
        const statusResponse = await axios.get(`${API_BASE}/api/sync/status/${vin}`, {
          headers: {
            'Authorization': 'Bearer test-token'
          }
        });
        
        const status = statusResponse.data;
        console.log(`VIN ${vin}:`);
        console.log(`  Finance stage: ${status.financeDeal?.stage || 'N/A'}`);
        console.log(`  Sales stage: ${status.salesDeal?.stage || 'N/A'}`);
        console.log(`  In sync: ${status.inSync ? '✅' : '❌'}`);
        if (status.syncIssues.length > 0) {
          console.log(`  Issues: ${status.syncIssues.join(', ')}`);
        }
      } catch (error) {
        console.log(`  Error checking sync status for ${vin}: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Test manual sync
    console.log('\n3️⃣ Testing manual sync...');
    for (const vin of testVins) {
      try {
        const syncResponse = await axios.post(`${API_BASE}/api/sync/deal/${vin}`, {
          direction: 'both'
        }, {
          headers: {
            'Authorization': 'Bearer test-token'
          }
        });
        
        console.log(`✅ Manual sync for VIN ${vin}:`, syncResponse.data);
      } catch (error) {
        console.log(`❌ Error syncing VIN ${vin}: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Test full sync
    console.log('\n4️⃣ Testing full sync...');
    try {
      const fullSyncResponse = await axios.post(`${API_BASE}/api/sync/all`, {}, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      console.log(`✅ Full sync completed:`, fullSyncResponse.data);
    } catch (error) {
      console.log(`❌ Error during full sync: ${error.response?.data?.error || error.message}`);
    }
    
    console.log('\n🎉 Sync testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing sync:', error.response?.data || error.message);
  }
}

// Run the test
testSyncWithExistingData(); 