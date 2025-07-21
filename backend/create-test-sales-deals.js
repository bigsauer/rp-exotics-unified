const mongoose = require('mongoose');
const SalesDeal = require('./models/SalesDeal');
const Deal = require('./models/Deal');
const User = require('./models/User');
const StatusSyncService = require('./services/statusSyncService');

// Use the same connection string as the main app
const MONGODB_URI = 'mongodb+srv://rp_exotics:rp_exotics_2025@cluster0.mongodb.net/test?retryWrites=true&w=majority';

async function createTestSalesDeals() {
  console.log('🧪 Creating test sales deals for sync testing...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    
    // Get existing finance deals
    const financeDeals = await Deal.find({}).limit(5); // Get first 5 deals
    console.log(`Found ${financeDeals.length} finance deals to create sales deals for`);
    
    if (financeDeals.length === 0) {
      console.log('No finance deals found. Please create some finance deals first.');
      return;
    }
    
    // Get a test user (or create one if needed)
    let testUser = await User.findOne({ role: 'sales' });
    if (!testUser) {
      console.log('No sales user found. Creating a test sales user...');
      testUser = new User({
        firstName: 'Test',
        lastName: 'Sales',
        email: 'test.sales@rpexotics.com',
        username: 'testsales',
        passwordHash: '$2b$12$test', // This won't work for login but is fine for testing
        role: 'sales',
        isActive: true,
        profile: {
          firstName: 'Test',
          lastName: 'Sales',
          displayName: 'Test Sales User',
          department: 'Sales',
          phone: '555-1234'
        }
      });
      await testUser.save();
      console.log('Created test sales user');
    }
    
    let createdCount = 0;
    
    for (const financeDeal of financeDeals) {
      try {
        // Check if sales deal already exists for this VIN
        const existingSalesDeal = await SalesDeal.findOne({ vin: financeDeal.vin });
        if (existingSalesDeal) {
          console.log(`Sales deal already exists for VIN: ${financeDeal.vin}`);
          continue;
        }
        
        // Create sales deal based on finance deal
        const salesDeal = new SalesDeal({
          vehicle: financeDeal.vehicle,
          vin: financeDeal.vin,
          stockNumber: financeDeal.rpStockNumber || `SALES-${Date.now()}`,
          year: financeDeal.year,
          make: financeDeal.make,
          model: financeDeal.model,
          
          // Sales person info
          salesPerson: {
            id: testUser._id,
            name: testUser.profile.displayName,
            email: testUser.email,
            phone: testUser.profile.phone
          },
          
          // Customer info
          customer: {
            name: financeDeal.seller?.name || 'Test Customer',
            type: 'individual',
            contact: {
              email: 'test@example.com',
              phone: '555-0000'
            }
          },
          
          // Financial info (limited for sales)
          financial: {
            purchasePrice: financeDeal.purchasePrice,
            listPrice: financeDeal.listPrice
          },
          
          // Timeline
          timeline: {
            purchaseDate: financeDeal.purchaseDate || new Date(),
            estimatedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          },
          
          // Start with a different stage than finance to test sync
          currentStage: 'purchased', // Different from finance deal
          previousStage: null,
          stageHistory: [{
            stage: 'purchased',
            enteredAt: new Date(),
            notes: 'Test sales deal created'
          }],
          
          // Priority and status
          priority: 'normal',
          status: 'active',
          
          // System fields
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: testUser._id,
          updatedBy: testUser._id
        });
        
        await salesDeal.save();
        createdCount++;
        console.log(`✅ Created sales deal for VIN: ${financeDeal.vin}`);
        console.log(`   Finance stage: ${financeDeal.currentStage}`);
        console.log(`   Sales stage: ${salesDeal.currentStage}`);
        
      } catch (error) {
        console.error(`❌ Error creating sales deal for VIN ${financeDeal.vin}:`, error.message);
      }
    }
    
    console.log(`\n📊 Created ${createdCount} test sales deals`);
    
    // Test the sync
    console.log('\n🔄 Testing sync functionality...');
    const syncCount = await StatusSyncService.syncAllDeals();
    console.log(`✅ Sync completed. ${syncCount} deals synchronized`);
    
    // Show sync status for each created deal
    console.log('\n📋 Sync status for created deals:');
    for (const financeDeal of financeDeals.slice(0, createdCount)) {
      const status = await StatusSyncService.getSyncStatus(financeDeal.vin);
      console.log(`VIN ${financeDeal.vin}:`);
      console.log(`  Finance stage: ${status.financeDeal?.stage || 'N/A'}`);
      console.log(`  Sales stage: ${status.salesDeal?.stage || 'N/A'}`);
      console.log(`  In sync: ${status.inSync ? '✅' : '❌'}`);
      if (status.syncIssues.length > 0) {
        console.log(`  Issues: ${status.syncIssues.join(', ')}`);
      }
    }
    
    console.log('\n🎉 Test sales deals created and sync tested!');
    
  } catch (error) {
    console.error('❌ Error creating test sales deals:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
createTestSalesDeals(); 