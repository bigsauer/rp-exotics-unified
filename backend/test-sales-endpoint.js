const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/rp-exotics';

async function testSalesEndpoint() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const SalesDeal = require('./models/SalesDeal');
    const User = require('./models/User');
    
    // Get a user to simulate the request
    const user = await User.findOne();
    if (!user) {
      console.log('❌ No users found');
      return;
    }

    console.log(`👤 Testing with user: ${user.email} (role: ${user.role})`);

    // Test the query logic from the sales endpoint
    let query = {};
    
    // Filter by sales person (if not admin/manager, only show their deals)
    if (user.role === 'sales' && !user.permissions?.viewAllDeals) {
      query['salesPerson.id'] = user._id;
      console.log(`🔍 Filtering by sales person: ${user._id}`);
    }

    console.log(`🔍 Final query:`, JSON.stringify(query));

    const deals = await SalesDeal.find(query)
      .populate('salesPerson.id', 'name email')
      .sort({ updatedAt: -1 });

    console.log(`📊 Found ${deals.length} deals`);

    if (deals.length > 0) {
      console.log('\n📋 Deals found:');
      deals.forEach((deal, index) => {
        console.log(`\n--- Deal ${index + 1} ---`);
        console.log('ID:', deal._id);
        console.log('Vehicle:', deal.vehicle);
        console.log('VIN:', deal.vin);
        console.log('Stock Number:', deal.stockNumber);
        console.log('Current Stage:', deal.currentStage);
        console.log('Sales Person ID:', deal.salesPerson?.id);
        console.log('Sales Person Name:', deal.salesPerson?.name);
        console.log('Customer:', deal.customer?.name);
        console.log('Status:', deal.status);
      });
    } else {
      console.log('❌ No deals found with current query');
      
      // Check if there are any deals at all
      const allDeals = await SalesDeal.find();
      console.log(`📊 Total deals in database: ${allDeals.length}`);
      
      if (allDeals.length > 0) {
        console.log('\n📋 All deals in database:');
        allDeals.forEach((deal, index) => {
          console.log(`\n--- Deal ${index + 1} ---`);
          console.log('ID:', deal._id);
          console.log('Vehicle:', deal.vehicle);
          console.log('VIN:', deal.vin);
          console.log('Sales Person ID:', deal.salesPerson?.id);
          console.log('User ID:', user._id);
          console.log('Match:', deal.salesPerson?.id?.toString() === user._id.toString());
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testSalesEndpoint(); 