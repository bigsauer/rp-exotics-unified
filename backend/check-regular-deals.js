const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const SalesDeal = require('./models/SalesDeal');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkRegularDeals() {
  try {
    console.log('🔍 Checking Regular Deals...');
    
    // Count total regular deals
    const totalCount = await Deal.countDocuments({});
    console.log(`📊 Total regular deals in database: ${totalCount}`);
    
    if (totalCount > 0) {
      // Get all regular deals
      const allDeals = await Deal.find({});
      console.log('\n📋 All regular deals:');
      allDeals.forEach((deal, index) => {
        console.log(`${index + 1}. ID: ${deal._id}`);
        console.log(`   VIN: ${deal.vin || 'N/A'}`);
        console.log(`   Stock Number: ${deal.stockNumber || 'N/A'}`);
        console.log(`   Deal Type: ${deal.dealType || 'N/A'}`);
        console.log(`   Current Stage: ${deal.currentStage || 'N/A'}`);
        console.log(`   Created: ${deal.createdAt}`);
        console.log('');
      });
    } else {
      console.log('❌ No regular deals found in database');
    }
    
    // Check if there are any deals that should be sales deals
    const potentialSalesDeals = await Deal.find({
      $or: [
        { dealType: 'retail' },
        { dealType: 'wholesale' }
      ]
    });
    
    console.log(`📊 Potential sales deals (retail/wholesale): ${potentialSalesDeals.length}`);
    
    if (potentialSalesDeals.length > 0) {
      console.log('\n📋 Potential sales deals:');
      potentialSalesDeals.forEach((deal, index) => {
        console.log(`${index + 1}. ID: ${deal._id}`);
        console.log(`   VIN: ${deal.vin || 'N/A'}`);
        console.log(`   Stock Number: ${deal.stockNumber || 'N/A'}`);
        console.log(`   Deal Type: ${deal.dealType || 'N/A'}`);
        console.log(`   Current Stage: ${deal.currentStage || 'N/A'}`);
        console.log(`   Created: ${deal.createdAt}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking regular deals:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkRegularDeals(); 