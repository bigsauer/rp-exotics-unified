const mongoose = require('mongoose');
const Deal = require('./models/Deal');

const MONGODB_URI = 'mongodb+srv://brennan:OfSbbMXTdY2WxTFi@rp-exotics-cluster.wtjzoiq.mongodb.net/rp_exotics?retryWrites=true&w=majority&appName=rp-exotics-cluster';

async function printLatestDeal() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    const latestDeal = await Deal.findOne().sort({ createdAt: -1 });
    if (!latestDeal) {
      console.log('No deals found in the database.');
      return;
    }
    console.log('\n📋 Latest Deal Document:');
    console.dir(latestDeal.toObject ? latestDeal.toObject() : latestDeal, { depth: null, colors: true });
    // Print key fields for quick reference
    const d = latestDeal.toObject ? latestDeal.toObject() : latestDeal;
    console.log('\n🔎 Key Fields:');
    console.log('  VIN:', d.vin);
    console.log('  Year:', d.year);
    console.log('  Make:', d.make);
    console.log('  Model:', d.model);
    console.log('  Mileage:', d.mileage);
    console.log('  Exterior Color:', d.color || d.exteriorColor);
    console.log('  Interior Color:', d.interiorColor);
    console.log('  Seller:', d.seller);
    if (d.seller) {
      console.log('    Name:', d.seller.name);
      console.log('    Email:', d.seller.email);
      console.log('    Phone:', d.seller.phone);
      console.log('    Company:', d.seller.company);
      console.log('    Contact:', d.seller.contact);
    }
    console.log('  Documents:', d.documents);
    console.log('  VehicleRecordId:', d.vehicleRecordId);
  } catch (error) {
    console.error('❌ Error fetching latest deal:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

printLatestDeal(); 