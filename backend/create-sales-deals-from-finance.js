const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const SalesDeal = require('./models/SalesDeal');
const User = require('./models/User');
const StatusSyncService = require('./services/statusSyncService');

// Use the same connection string as the main app
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rp_exotics:rp_exotics_2025@cluster0.mongodb.net/test?retryWrites=true&w=majority';

async function createSalesDealsFromFinance() {
  console.log('🔄 Creating sales deals from existing finance deals...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    
    // Get all finance deals
    const financeDeals = await Deal.find({});
    console.log(`📊 Found ${financeDeals.length} finance deals`);
    
    if (financeDeals.length === 0) {
      console.log('No finance deals found to create sales deals from');
      return;
    }
    
    // Get or create a default sales user
    let salesUser = await User.findOne({ role: 'sales' });
    if (!salesUser) {
      console.log('No sales user found. Creating a default sales user...');
      salesUser = new User({
        firstName: 'Sales',
        lastName: 'Team',
        email: 'sales@rpexotics.com',
        username: 'salesteam',
        passwordHash: '$2b$12$default', // This won't work for login but is fine for system use
        role: 'sales',
        isActive: true,
        profile: {
          firstName: 'Sales',
          lastName: 'Team',
          displayName: 'Sales Team',
          department: 'Sales',
          phone: '555-0000'
        }
      });
      await salesUser.save();
      console.log('✅ Created default sales user');
    }
    
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    console.log('\n🔄 Processing finance deals...');
    
    for (const financeDeal of financeDeals) {
      try {
        // Check if sales deal already exists for this VIN
        const existingSalesDeal = await SalesDeal.findOne({ vin: financeDeal.vin });
        if (existingSalesDeal) {
          console.log(`⏭️  Sales deal already exists for VIN: ${financeDeal.vin}`);
          skippedCount++;
          continue;
        }
        
        // Map finance stage to sales stage
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
        
        const mappedStage = stageMapping[financeDeal.currentStage] || 'purchased';
        
        // Create sales deal based on finance deal
        const salesDeal = new SalesDeal({
          vehicle: financeDeal.vehicle || `${financeDeal.year} ${financeDeal.make} ${financeDeal.model}`,
          vin: financeDeal.vin,
          stockNumber: financeDeal.rpStockNumber || `SALES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          year: financeDeal.year,
          make: financeDeal.make,
          model: financeDeal.model,
          
          // Sales person info
          salesPerson: {
            id: salesUser._id,
            name: salesUser.profile.displayName,
            email: salesUser.email,
            phone: salesUser.profile.phone
          },
          
          // Customer info
          customer: {
            name: financeDeal.seller?.name || 'Auto-created from Finance',
            type: 'dealer',
            contact: {
              email: 'auto@rpexotics.com',
              phone: '555-0000'
            }
          },
          
          // Financial info
          financial: {
            purchasePrice: financeDeal.purchasePrice,
            listPrice: financeDeal.listPrice || financeDeal.purchasePrice * 1.1
          },
          
          // Timeline
          timeline: {
            purchaseDate: financeDeal.purchaseDate || financeDeal.createdAt || new Date(),
            estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
          },
          
          // Stage mapping
          currentStage: mappedStage,
          previousStage: null,
          stageHistory: [{
            stage: mappedStage,
            enteredAt: new Date(),
            notes: `Auto-created from finance deal stage: ${financeDeal.currentStage}`
          }],
          
          // Priority and status
          priority: financeDeal.priority || 'normal',
          status: 'active',
          
          // System fields
          createdAt: financeDeal.createdAt || new Date(),
          updatedAt: new Date(),
          createdBy: salesUser._id,
          updatedBy: salesUser._id
        });
        
        await salesDeal.save();
        createdCount++;
        console.log(`✅ Created sales deal for VIN: ${financeDeal.vin}`);
        console.log(`   Finance stage: ${financeDeal.currentStage} → Sales stage: ${mappedStage}`);
        
      } catch (error) {
        console.error(`❌ Error creating sales deal for VIN ${financeDeal.vin}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${createdCount} sales deals`);
    console.log(`   Skipped: ${skippedCount} (already existed)`);
    console.log(`   Errors: ${errorCount}`);
    
    if (createdCount > 0) {
      console.log('\n🔄 Testing sync functionality...');
      try {
        const syncCount = await StatusSyncService.syncAllDeals();
        console.log(`✅ Sync test completed. ${syncCount} deals synchronized`);
      } catch (error) {
        console.error('❌ Error during sync test:', error.message);
      }
    }
    
    console.log('\n🎉 Sales deals creation completed!');
    console.log('The sync system should now work properly with your existing finance deals.');
    
  } catch (error) {
    console.error('❌ Error creating sales deals:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
createSalesDealsFromFinance(); 