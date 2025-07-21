// Direct test of sync service
const StatusSyncService = require('./services/statusSyncService');

async function testSyncDirect() {
  console.log('🧪 Testing sync service directly...\n');
  
  try {
    // Test 1: Check sync status for a known VIN
    console.log('1️⃣ Testing sync status...');
    
    // Get a sample VIN from the logs (we saw WAU8SAF83MN019065 in the logs)
    const testVin = 'WAU8SAF83MN019065';
    
    try {
      const status = await StatusSyncService.getSyncStatus(testVin);
      console.log(`VIN ${testVin}:`);
      console.log(`  Finance stage: ${status.financeDeal?.stage || 'N/A'}`);
      console.log(`  Sales stage: ${status.salesDeal?.stage || 'N/A'}`);
      console.log(`  In sync: ${status.inSync ? '✅' : '❌'}`);
      if (status.syncIssues.length > 0) {
        console.log(`  Issues: ${status.syncIssues.join(', ')}`);
      }
    } catch (error) {
      console.log(`  Error checking sync status: ${error.message}`);
    }
    
    // Test 2: Run full sync
    console.log('\n2️⃣ Testing full sync...');
    try {
      const syncCount = await StatusSyncService.syncAllDeals();
      console.log(`✅ Full sync completed. ${syncCount} deals synchronized`);
    } catch (error) {
      console.log(`❌ Error during full sync: ${error.message}`);
    }
    
    // Test 3: Check sync status again
    console.log('\n3️⃣ Checking sync status after sync...');
    try {
      const status = await StatusSyncService.getSyncStatus(testVin);
      console.log(`VIN ${testVin} after sync:`);
      console.log(`  Finance stage: ${status.financeDeal?.stage || 'N/A'}`);
      console.log(`  Sales stage: ${status.salesDeal?.stage || 'N/A'}`);
      console.log(`  In sync: ${status.inSync ? '✅' : '❌'}`);
      if (status.syncIssues.length > 0) {
        console.log(`  Issues: ${status.syncIssues.join(', ')}`);
      }
    } catch (error) {
      console.log(`  Error checking sync status after sync: ${error.message}`);
    }
    
    console.log('\n🎉 Direct sync testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing sync directly:', error);
  }
}

// Run the test
testSyncDirect(); 