// Test sync using API endpoints
const axios = require('axios');

const API_BASE = 'http://localhost:5001';

async function testSyncAPI() {
  console.log('🧪 Testing sync using API endpoints...\n');
  
  try {
    // Test with the VIN from the image: WBS4Y9C50JAC86977
    const testVin = 'WBS4Y9C50JAC86977';
    
    console.log(`1️⃣ Checking sync status for VIN: ${testVin}`);
    
    try {
      const statusResponse = await axios.get(`${API_BASE}/api/sync/status/${testVin}`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      const status = statusResponse.data;
      
      console.log('Sync Status:');
      console.log(`  Finance deal: ${status.financeDeal ? 'Found' : 'Not found'}`);
      if (status.financeDeal) {
        console.log(`    Stage: ${status.financeDeal.stage}`);
        console.log(`    Priority: ${status.financeDeal.priority}`);
      }
      
      console.log(`  Sales deal: ${status.salesDeal ? 'Found' : 'Not found'}`);
      if (status.salesDeal) {
        console.log(`    Stage: ${status.salesDeal.stage}`);
        console.log(`    Priority: ${status.salesDeal.priority}`);
      }
      
      console.log(`  In sync: ${status.inSync ? '✅' : '❌'}`);
      if (status.syncIssues && status.syncIssues.length > 0) {
        console.log(`  Issues: ${status.syncIssues.join(', ')}`);
      }
    } catch (error) {
      console.log(`  Error checking sync status: ${error.response?.data?.error || error.message}`);
    }
    
    // Test manual sync for this specific VIN
    console.log('\n2️⃣ Testing manual sync for specific VIN...');
    try {
      const syncResponse = await axios.post(`${API_BASE}/api/sync/deal/${testVin}`, {
        direction: 'both'
      }, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      console.log('Manual sync result:', syncResponse.data);
    } catch (error) {
      console.log(`  Error during manual sync: ${error.response?.data?.error || error.message}`);
    }
    
    // Test full manual sync
    console.log('\n3️⃣ Testing full manual sync...');
    try {
      const fullSyncResponse = await axios.post(`${API_BASE}/api/sync/all`, {}, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      console.log('Full manual sync result:', fullSyncResponse.data);
    } catch (error) {
      console.log(`  Error during full manual sync: ${error.response?.data?.error || error.message}`);
    }
    
    // Check status again after sync
    console.log('\n4️⃣ Checking sync status after manual sync...');
    try {
      const statusResponse = await axios.get(`${API_BASE}/api/sync/status/${testVin}`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      const status = statusResponse.data;
      
      console.log('Sync Status After Manual Sync:');
      console.log(`  Finance deal: ${status.financeDeal ? 'Found' : 'Not found'}`);
      if (status.financeDeal) {
        console.log(`    Stage: ${status.financeDeal.stage}`);
        console.log(`    Priority: ${status.financeDeal.priority}`);
      }
      
      console.log(`  Sales deal: ${status.salesDeal ? 'Found' : 'Not found'}`);
      if (status.salesDeal) {
        console.log(`    Stage: ${status.salesDeal.stage}`);
        console.log(`    Priority: ${status.salesDeal.priority}`);
      }
      
      console.log(`  In sync: ${status.inSync ? '✅' : '❌'}`);
      if (status.syncIssues && status.syncIssues.length > 0) {
        console.log(`  Issues: ${status.syncIssues.join(', ')}`);
      }
    } catch (error) {
      console.log(`  Error checking sync status after sync: ${error.response?.data?.error || error.message}`);
    }
    
    console.log('\n🎉 API sync testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing sync API:', error.response?.data || error.message);
  }
}

// Run the test
testSyncAPI(); 