// Simple fix script - run this to create sales deals and fix sync
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rp_exotics:rp_exotics_2025@cluster0.mongodb.net/test?retryWrites=true&w=majority';

async function fixSyncIssue() {
  console.log('🔧 FIXING SYNC ISSUE - Creating sales deals from finance deals...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    
    // Get database reference
    const db = mongoose.connection.db;
    
    // Get all finance deals
    const financeDeals = await db.collection('deals').find({}).toArray();
    console.log(`📊 Found ${financeDeals.length} finance deals`);
    
    if (financeDeals.length === 0) {
      console.log('No finance deals found');
      return;
    }
    
    // Get or create sales user
    let salesUser = await db.collection('users').findOne({ role: 'sales' });
    if (!salesUser) {
      console.log('Creating sales user...');
      const result = await db.collection('users').insertOne({
        firstName: 'Sales', lastName: 'Team', email: 'sales@rpexotics.com',
        username: 'salesteam', passwordHash: '$2b$12$default', role: 'sales',
        isActive: true, profile: { firstName: 'Sales', lastName: 'Team', 
        displayName: 'Sales Team', department: 'Sales', phone: '555-0000' }
      });
      salesUser = { _id: result.insertedId, profile: { displayName: 'Sales Team' }, email: 'sales@rpexotics.com', profile: { phone: '555-0000' } };
    }
    
    let createdCount = 0;
    const stageMapping = {
      'contract_received': 'purchased', 'title_processing': 'documentation',
      'payment_approved': 'verification', 'funds_disbursed': 'title-processing',
      'title_received': 'ready-to-list', 'deal_complete': 'ready-to-list'
    };
    
    console.log('\n🔄 Creating sales deals...');
    
    for (const financeDeal of financeDeals) {
      // Check if sales deal already exists
      const existingSalesDeal = await db.collection('salesdeals').findOne({ vin: financeDeal.vin });
      if (existingSalesDeal) {
        console.log(`⏭️  Sales deal exists for VIN: ${financeDeal.vin}`);
        continue;
      }
      
      const mappedStage = stageMapping[financeDeal.currentStage] || 'purchased';
      
      // Create sales deal
      const salesDeal = {
        vehicle: financeDeal.vehicle || `${financeDeal.year} ${financeDeal.make} ${financeDeal.model}`,
        vin: financeDeal.vin,
        stockNumber: financeDeal.rpStockNumber || `SALES-${Date.now()}`,
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
          name: financeDeal.seller?.name || 'Auto-created', 
          type: 'dealer',
          contact: { email: 'auto@rpexotics.com', phone: '555-0000' } 
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
      };
      
      await db.collection('salesdeals').insertOne(salesDeal);
      createdCount++;
      console.log(`✅ Created sales deal for VIN: ${financeDeal.vin} (${financeDeal.currentStage} → ${mappedStage})`);
    }
    
    console.log(`\n🎉 SUCCESS! Created ${createdCount} sales deals!`);
    console.log('Your sync system should now work properly!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixSyncIssue(); 