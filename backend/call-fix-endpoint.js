// Simple script to call the fix-sync-issue endpoint
const axios = require('axios');

async function callFixEndpoint() {
  console.log('🔧 Calling fix-sync-issue endpoint...\n');
  
  try {
    // First, let's try to get a valid token by logging in
    console.log('1️⃣ Getting authentication token...');
    
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'lynn@rpexotics.com',
      password: 'your-password-here' // You'll need to put the actual password
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Got authentication token');
    
    // Now call the fix endpoint
    console.log('\n2️⃣ Calling fix-sync-issue endpoint...');
    
    const fixResponse = await axios.post('http://localhost:5001/api/fix-sync-issue', {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Fix completed successfully!');
    console.log('Response:', fixResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Authentication failed. You can:');
      console.log('1. Put your actual password in the script');
      console.log('2. Or use the manual fix method below');
    }
  }
}

// Alternative: Manual fix function that you can run directly
const manualFix = async () => {
  console.log('🔧 Manual fix - this will work without authentication');
  console.log('Copy and paste this function into your server console:');
  
  const fixCode = `
const fixSyncIssue = async () => {
  try {
    console.log('[MANUAL FIX] Creating sales deals from finance deals...');
    
    const financeDeals = await Deal.find({});
    console.log(\`[MANUAL FIX] Found \${financeDeals.length} finance deals\`);
    
    let salesUser = await db.collection('users').findOne({ role: 'sales' });
    if (!salesUser) {
      salesUser = {
        firstName: 'Sales', lastName: 'Team', email: 'sales@rpexotics.com',
        username: 'salesteam', passwordHash: '$2b$12$default', role: 'sales',
        isActive: true, profile: { firstName: 'Sales', lastName: 'Team', 
        displayName: 'Sales Team', department: 'Sales', phone: '555-0000' }
      };
      const result = await db.collection('users').insertOne(salesUser);
      salesUser._id = result.insertedId;
    }
    
    let createdCount = 0;
    const stageMapping = {
      'contract_received': 'purchased', 'title_processing': 'documentation',
      'payment_approved': 'verification', 'funds_disbursed': 'title-processing',
      'title_received': 'ready-to-list', 'deal_complete': 'ready-to-list'
    };
    
    for (const financeDeal of financeDeals) {
      const existingSalesDeal = await SalesDeal.findOne({ vin: financeDeal.vin });
      if (existingSalesDeal) continue;
      
      const mappedStage = stageMapping[financeDeal.currentStage] || 'purchased';
      
      const salesDeal = new SalesDeal({
        vehicle: financeDeal.vehicle || \`\${financeDeal.year} \${financeDeal.make} \${financeDeal.model}\`,
        vin: financeDeal.vin, stockNumber: financeDeal.rpStockNumber || \`SALES-\${Date.now()}\`,
        year: financeDeal.year, make: financeDeal.make, model: financeDeal.model,
        salesPerson: { id: salesUser._id, name: salesUser.profile.displayName, 
        email: salesUser.email, phone: salesUser.profile.phone },
        customer: { name: financeDeal.seller?.name || 'Auto-created', type: 'dealer',
        contact: { email: 'auto@rpexotics.com', phone: '555-0000' } },
        financial: { purchasePrice: financeDeal.purchasePrice, 
        listPrice: financeDeal.listPrice || financeDeal.purchasePrice * 1.1 },
        timeline: { purchaseDate: financeDeal.purchaseDate || financeDeal.createdAt || new Date(),
        estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        currentStage: mappedStage, previousStage: null,
        stageHistory: [{ stage: mappedStage, enteredAt: new Date(),
        notes: \`Auto-created from finance deal stage: \${financeDeal.currentStage}\` }],
        priority: financeDeal.priority || 'normal', status: 'active',
        createdAt: financeDeal.createdAt || new Date(), updatedAt: new Date(),
        createdBy: salesUser._id, updatedBy: salesUser._id
      });
      
      await salesDeal.save();
      createdCount++;
      console.log(\`[MANUAL FIX] Created sales deal for VIN: \${financeDeal.vin} (\${financeDeal.currentStage} → \${mappedStage})\`);
    }
    
    console.log(\`[MANUAL FIX] ✅ Created \${createdCount} sales deals!\`);
    
    // Test sync
    const StatusSyncService = require('./services/statusSyncService');
    const syncCount = await StatusSyncService.syncAllDeals();
    console.log(\`[MANUAL FIX] Sync test completed. \${syncCount} deals synchronized\`);
    
  } catch (error) {
    console.error('[MANUAL FIX] Error:', error);
  }
};

// Run it:
fixSyncIssue();
`;
  
  console.log(fixCode);
  console.log('\n📋 Instructions:');
  console.log('1. Copy the function above');
  console.log('2. Paste it into your server console (where npm start is running)');
  console.log('3. Press Enter to run it');
  console.log('4. Watch the logs to see the progress');
};

// Run the manual fix instructions
manualFix(); 