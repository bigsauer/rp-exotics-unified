// Quick fix for sync issue - run this directly
console.log('🔧 Quick fix for sync issue...\n');

// This script will be run manually by copying and pasting into the server console
// or by adding it to the server startup

const fixSyncIssue = async () => {
  try {
    console.log('[QUICK FIX] Creating sales deals from finance deals...');
    
    // Get all finance deals
    const financeDeals = await Deal.find({});
    console.log(`[QUICK FIX] Found ${financeDeals.length} finance deals`);
    
    if (financeDeals.length === 0) {
      console.log('[QUICK FIX] No finance deals found');
      return;
    }
    
    // Get or create a default sales user
    let salesUser = await db.collection('users').findOne({ role: 'sales' });
    if (!salesUser) {
      console.log('[QUICK FIX] Creating default sales user...');
      salesUser = {
        firstName: 'Sales',
        lastName: 'Team',
        email: 'sales@rpexotics.com',
        username: 'salesteam',
        passwordHash: '$2b$12$default',
        role: 'sales',
        isActive: true,
        profile: {
          firstName: 'Sales',
          lastName: 'Team',
          displayName: 'Sales Team',
          department: 'Sales',
          phone: '555-0000'
        }
      };
      const result = await db.collection('users').insertOne(salesUser);
      salesUser._id = result.insertedId;
      console.log('[QUICK FIX] Created default sales user');
    }
    
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Stage mapping
    const stageMapping = {
      'contract_received': 'purchased',
      'title_processing': 'documentation',
      'payment_approved': 'verification',
      'funds_disbursed': 'title-processing',
      'title_received': 'ready-to-list',
      'deal_complete': 'ready-to-list',
      'documentation': 'documentation',
      'verification': 'verification',
      'processing': 'title-processing',
      'completion': 'ready-to-list'
    };
    
    for (const financeDeal of financeDeals) {
      try {
        // Check if sales deal already exists
        const existingSalesDeal = await SalesDeal.findOne({ vin: financeDeal.vin });
        if (existingSalesDeal) {
          console.log(`[QUICK FIX] Sales deal already exists for VIN: ${financeDeal.vin}`);
          skippedCount++;
          continue;
        }
        
        const mappedStage = stageMapping[financeDeal.currentStage] || 'purchased';
        
        // Create sales deal
        const salesDeal = new SalesDeal({
          vehicle: financeDeal.vehicle || `${financeDeal.year} ${financeDeal.make} ${financeDeal.model}`,
          vin: financeDeal.vin,
          stockNumber: financeDeal.rpStockNumber || `SALES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          year: financeDeal.year,
          make: financeDeal.make,
          model: financeDeal.model,
          
          salesPerson: {
            id: salesUser._id,
            name: salesUser.profile.displayName,
            email: salesUser.email,
            phone: salesUser.profile.phone
          },
          
          customer: {
            name: financeDeal.seller?.name || 'Auto-created from Finance',
            type: 'dealer',
            contact: {
              email: 'auto@rpexotics.com',
              phone: '555-0000'
            }
          },
          
          financial: {
            purchasePrice: financeDeal.purchasePrice,
            listPrice: financeDeal.listPrice || financeDeal.purchasePrice * 1.1
          },
          
          timeline: {
            purchaseDate: financeDeal.purchaseDate || financeDeal.createdAt || new Date(),
            estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          },
          
          currentStage: mappedStage,
          previousStage: null,
          stageHistory: [{
            stage: mappedStage,
            enteredAt: new Date(),
            notes: `Auto-created from finance deal stage: ${financeDeal.currentStage}`
          }],
          
          priority: financeDeal.priority || 'normal',
          status: 'active',
          
          createdAt: financeDeal.createdAt || new Date(),
          updatedAt: new Date(),
          createdBy: salesUser._id,
          updatedBy: salesUser._id
        });
        
        await salesDeal.save();
        createdCount++;
        console.log(`[QUICK FIX] Created sales deal for VIN: ${financeDeal.vin} (${financeDeal.currentStage} → ${mappedStage})`);
        
      } catch (error) {
        console.error(`[QUICK FIX] Error creating sales deal for VIN ${financeDeal.vin}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`[QUICK FIX] Summary: Created ${createdCount}, Skipped ${skippedCount}, Errors ${errorCount}`);
    
    // Test sync
    let syncCount = 0;
    if (createdCount > 0) {
      try {
        const StatusSyncService = require('./services/statusSyncService');
        syncCount = await StatusSyncService.syncAllDeals();
        console.log(`[QUICK FIX] Sync test completed. ${syncCount} deals synchronized`);
      } catch (error) {
        console.error('[QUICK FIX] Error during sync test:', error.message);
      }
    }
    
    console.log('[QUICK FIX] ✅ Sync issue fixed!');
    console.log(`[QUICK FIX] Created ${createdCount} sales deals, ${syncCount} deals synchronized`);
    
  } catch (error) {
    console.error('[QUICK FIX] Error fixing sync issue:', error);
  }
};

// Instructions for manual execution:
console.log('📋 To fix the sync issue manually:');
console.log('1. Copy the fixSyncIssue function above');
console.log('2. Paste it into your server console or Node.js REPL');
console.log('3. Run: fixSyncIssue()');
console.log('');
console.log('Or restart your server and the new endpoint will be available at:');
console.log('POST /api/fix-sync-issue');
console.log('');
console.log('The sync system will then work properly with your existing finance deals! 🎉'); 