const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/rp-exotics';

async function checkSalesDeals() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const SalesDeal = require('./models/SalesDeal');
    
    // Check total count
    const totalCount = await SalesDeal.countDocuments();
    console.log(`📊 Total SalesDeal documents: ${totalCount}`);

    if (totalCount > 0) {
      // Get a few sample deals
      const sampleDeals = await SalesDeal.find().limit(3);
      console.log('\n📋 Sample deals:');
      sampleDeals.forEach((deal, index) => {
        console.log(`\n--- Deal ${index + 1} ---`);
        console.log('ID:', deal._id);
        console.log('Vehicle:', deal.vehicle);
        console.log('VIN:', deal.vin);
        console.log('Stock Number:', deal.stockNumber);
        console.log('Current Stage:', deal.currentStage);
        console.log('Sales Person:', deal.salesPerson);
        console.log('Customer:', deal.customer);
        console.log('Created:', deal.createdAt);
        console.log('Updated:', deal.updatedAt);
      });
    } else {
      console.log('❌ No SalesDeal documents found in database');
      
      // Check if there are any regular deals that could be converted
      const Deal = require('./models/Deal');
      const regularDealCount = await Deal.countDocuments();
      console.log(`📊 Regular Deal documents: ${regularDealCount}`);
      
      if (regularDealCount > 0) {
        console.log('\n💡 There are regular deals that could be converted to sales deals');
        const sampleRegularDeals = await Deal.find().limit(3);
        console.log('\n📋 Sample regular deals:');
        sampleRegularDeals.forEach((deal, index) => {
          console.log(`\n--- Regular Deal ${index + 1} ---`);
          console.log('ID:', deal._id);
          console.log('Vehicle:', deal.vehicle);
          console.log('VIN:', deal.vin);
          console.log('Deal Type:', deal.dealType);
          console.log('Current Stage:', deal.currentStage);
          console.log('Salesperson:', deal.salesperson);
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

checkSalesDeals(); 