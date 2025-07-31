const mongoose = require('mongoose');
require('dotenv').config();
require('../models/Deal'); // Import the Deal model

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function fixExistingDeals() {
  console.log('🔧 Fixing Existing Deals');
  console.log('========================');
  
  try {
    // Get the Deal model
    const Deal = mongoose.model('Deal');
    
    // Get all deals
    const deals = await Deal.find({});
    console.log(`📊 Found ${deals.length} deals to check`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const deal of deals) {
      let needsUpdate = false;
      const updates = {};
      
      // Fix deals with missing dealType2
      if (!deal.dealType2 && deal.dealType2SubType) {
        const mapping = {
          'buy': 'Buy',
          'sale': 'Sale',
          'buy-sell': 'Buy/Sell',
          'consign-a': 'Consign-A',
          'consign-b': 'Consign-B',
          'consign-c': 'Consign-C',
          'consign-rdnc': 'Consign-RDNC'
        };
        
        const newDealType2 = mapping[deal.dealType2SubType];
        if (newDealType2) {
          updates.dealType2 = newDealType2;
          needsUpdate = true;
          console.log(`🔧 Deal ${deal._id}: Setting dealType2 to "${newDealType2}" from dealType2SubType "${deal.dealType2SubType}"`);
        }
      }
      
      // Fix wholesale d2d sale deals with incorrect dealType2SubType
      if (deal.dealType === 'wholesale-d2d' && 
          (deal.dealType2 === 'Sale' || deal.dealType2SubType === 'sale') && 
          deal.dealType2SubType !== 'sale') {
        updates.dealType2SubType = 'sale';
        needsUpdate = true;
        console.log(`🔧 Deal ${deal._id}: Fixing wholesale d2d sale dealType2SubType to "sale"`);
      }
      
      // Fix wholesale d2d buy deals with incorrect dealType2SubType
      if (deal.dealType === 'wholesale-d2d' && 
          (deal.dealType2 === 'Buy' || deal.dealType2SubType === 'buy') && 
          deal.dealType2SubType !== 'buy') {
        updates.dealType2SubType = 'buy';
        needsUpdate = true;
        console.log(`🔧 Deal ${deal._id}: Fixing wholesale d2d buy dealType2SubType to "buy"`);
      }
      
      // Fix wholesale flip deals with incorrect dealType2SubType
      if (deal.dealType === 'wholesale-flip' && 
          deal.dealType2SubType !== 'buy-sell') {
        updates.dealType2SubType = 'buy-sell';
        if (!deal.dealType2) {
          updates.dealType2 = 'Buy/Sell';
        }
        needsUpdate = true;
        console.log(`🔧 Deal ${deal._id}: Fixing wholesale flip dealType2SubType to "buy-sell"`);
      }
      
      // Apply updates if needed
      if (needsUpdate) {
        try {
          await Deal.findByIdAndUpdate(deal._id, updates);
          fixedCount++;
          console.log(`✅ Deal ${deal._id} updated successfully`);
        } catch (updateError) {
          console.error(`❌ Error updating deal ${deal._id}:`, updateError);
        }
      } else {
        skippedCount++;
      }
    }
    
    console.log('\n📋 Fix Summary:');
    console.log('===============');
    console.log(`Total Deals Checked: ${deals.length}`);
    console.log(`Deals Fixed: ${fixedCount}`);
    console.log(`Deals Skipped: ${skippedCount}`);
    
    if (fixedCount > 0) {
      console.log('\n✅ Existing deals have been fixed!');
      console.log('💡 The system should now work correctly with the updated backend logic.');
    } else {
      console.log('\n✅ No fixes needed - all deals are already correct!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing deals:', error);
  }
}

async function main() {
  await connectDB();
  await fixExistingDeals();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
}

main(); 