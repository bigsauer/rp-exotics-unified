const StatusSyncService = require('./services/statusSyncService');
const Deal = require('./models/Deal');
const SalesDeal = require('./models/SalesDeal');

async function testSyncSystem() {
  console.log('🧪 Testing Status Synchronization System\n');
  
  try {
    // Test 1: Check if there are any deals to sync
    console.log('1️⃣ Checking existing deals...');
    const financeDeals = await Deal.find({});
    const salesDeals = await SalesDeal.find({});
    
    console.log(`   Finance deals: ${financeDeals.length}`);
    console.log(`   Sales deals: ${salesDeals.length}`);
    
    if (financeDeals.length === 0 && salesDeals.length === 0) {
      console.log('   ⚠️  No deals found to test sync');
      return;
    }
    
    // Test 2: Check sync status for each deal
    console.log('\n2️⃣ Checking sync status...');
    for (const financeDeal of financeDeals.slice(0, 3)) { // Test first 3 deals
      const status = await StatusSyncService.getSyncStatus(financeDeal.vin);
      console.log(`   VIN ${financeDeal.vin}:`);
      console.log(`     Finance stage: ${status.financeDeal?.stage || 'N/A'}`);
      console.log(`     Sales stage: ${status.salesDeal?.stage || 'N/A'}`);
      console.log(`     In sync: ${status.inSync ? '✅' : '❌'}`);
      if (status.syncIssues.length > 0) {
        console.log(`     Issues: ${status.syncIssues.join(', ')}`);
      }
    }
    
    // Test 3: Run full sync
    console.log('\n3️⃣ Running full sync...');
    const syncCount = await StatusSyncService.syncAllDeals();
    console.log(`   Synced ${syncCount} deals`);
    
    // Test 4: Check sync status again
    console.log('\n4️⃣ Checking sync status after sync...');
    for (const financeDeal of financeDeals.slice(0, 3)) {
      const status = await StatusSyncService.getSyncStatus(financeDeal.vin);
      console.log(`   VIN ${financeDeal.vin}: In sync: ${status.inSync ? '✅' : '❌'}`);
    }
    
    console.log('\n✅ Sync system test completed!');
    
  } catch (error) {
    console.error('❌ Error testing sync system:', error);
  }
}

// Run the test
testSyncSystem(); 