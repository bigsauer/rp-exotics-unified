const mongoose = require('mongoose');
const SalesDeal = require('./models/SalesDeal');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testSalesDeals() {
  try {
    console.log('🔍 Testing Sales Deals...');
    
    // Count total sales deals
    const totalCount = await SalesDeal.countDocuments({});
    console.log(`📊 Total sales deals in database: ${totalCount}`);
    
    if (totalCount > 0) {
      // Get all sales deals
      const allDeals = await SalesDeal.find({});
      console.log('\n📋 All sales deals:');
      allDeals.forEach((deal, index) => {
        console.log(`${index + 1}. ID: ${deal._id}`);
        console.log(`   VIN: ${deal.vin || 'N/A'}`);
        console.log(`   Stock Number: ${deal.stockNumber || 'N/A'}`);
        console.log(`   Current Stage: ${deal.currentStage || 'N/A'}`);
        console.log(`   Sales Person: ${deal.salesPerson?.id || 'N/A'}`);
        console.log(`   Created: ${deal.createdAt}`);
        console.log('');
      });
    } else {
      console.log('❌ No sales deals found in database');
    }
    
    // Check if there are any deals without sales person assignment
    const unassignedCount = await SalesDeal.countDocuments({ 'salesPerson.id': { $exists: false } });
    console.log(`📊 Sales deals without sales person assignment: ${unassignedCount}`);
    
    // Check if there are any deals with sales person assignment
    const assignedCount = await SalesDeal.countDocuments({ 'salesPerson.id': { $exists: true } });
    console.log(`📊 Sales deals with sales person assignment: ${assignedCount}`);
    
  } catch (error) {
    console.error('❌ Error testing sales deals:', error);
  } finally {
    mongoose.connection.close();
  }
}

testSalesDeals(); 