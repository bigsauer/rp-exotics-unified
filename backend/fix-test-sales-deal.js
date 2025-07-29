const mongoose = require('mongoose');
const SalesDeal = require('./models/SalesDeal');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixTestSalesDeal() {
  try {
    console.log('🔍 Fixing Test Sales Deal Assignment...');
    
    // Find the existing test sales deal
    const existingDeal = await SalesDeal.findOne({ stockNumber: 'TEST001' });
    
    if (!existingDeal) {
      console.log('❌ Test sales deal not found');
      return;
    }
    
    console.log(`📋 Found deal: ${existingDeal._id}`);
    console.log(`📋 Current sales person: ${existingDeal.salesPerson.name} (${existingDeal.salesPerson.email})`);
    
    // Update the sales person to Brennan
    const updatedDeal = await SalesDeal.findByIdAndUpdate(
      existingDeal._id,
      {
        'salesPerson.id': '6872bc7baf3b59356684c271', // brennan@rpexotics.com
        'salesPerson.name': 'Brennan',
        'salesPerson.email': 'brennan@rpexotics.com',
        'salesPerson.phone': '(555) 987-6543'
      },
      { new: true }
    );
    
    console.log('✅ Test sales deal updated successfully!');
    console.log(`📋 New sales person: ${updatedDeal.salesPerson.name} (${updatedDeal.salesPerson.email})`);
    
    // Verify the update
    const count = await SalesDeal.countDocuments({ 'salesPerson.id': '6872bc7baf3b59356684c271' });
    console.log(`📊 Sales deals assigned to Brennan: ${count}`);
    
  } catch (error) {
    console.error('❌ Error fixing test sales deal:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixTestSalesDeal(); 