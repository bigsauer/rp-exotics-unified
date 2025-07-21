// Test sync for the specific BMW M4 deal
const StatusSyncService = require('./services/statusSyncService');

async function testSpecificSync() {
  console.log('🧪 Testing sync for specific BMW M4 deal...\n');
  
  try {
    // Test with the VIN from the image: WBS4Y9C50JAC86977
    const testVin = 'WBS4Y9C50JAC86977';
    
    console.log(`1️⃣ Checking sync status for VIN: ${testVin}`);
    
    try {
      const status = await StatusSyncService.getSyncStatus(testVin);
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
      if (status.syncIssues.length > 0) {
        console.log(`  Issues: ${status.syncIssues.join(', ')}`);
      }
    } catch (error) {
      console.log(`  Error checking sync status: ${error.message}`);
    }
    
    // Test manual sync
    console.log('\n2️⃣ Testing manual sync...');
    try {
      const result = await StatusSyncService.syncDealByVin(testVin, 'both');
      console.log('Manual sync result:', result);
    } catch (error) {
      console.log(`  Error during manual sync: ${error.message}`);
    }
    
    // Check status again after sync
    console.log('\n3️⃣ Checking sync status after manual sync...');
    try {
      const status = await StatusSyncService.getSyncStatus(testVin);
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
      if (status.syncIssues.length > 0) {
        console.log(`  Issues: ${status.syncIssues.join(', ')}`);
      }
    } catch (error) {
      console.log(`  Error checking sync status after sync: ${error.message}`);
    }
    
    console.log('\n🎉 Specific sync testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing specific sync:', error);
  }
}

// Run the test
testSpecificSync(); 