const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const VehicleRecord = require('./models/VehicleRecord');
const SalesDeal = require('./models/SalesDeal');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

async function clearAllData() {
  try {
    console.log('🗑️ Starting database cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics');
    console.log('✅ Connected to MongoDB');
    
    // Clear all deals
    console.log('📋 Clearing all deals...');
    const dealsResult = await Deal.deleteMany({});
    console.log(`✅ Deleted ${dealsResult.deletedCount} deals`);
    
    // Clear all vehicle records
    console.log('🚗 Clearing all vehicle records...');
    const vehicleRecordsResult = await VehicleRecord.deleteMany({});
    console.log(`✅ Deleted ${vehicleRecordsResult.deletedCount} vehicle records`);
    
    // Clear all sales deals
    console.log('💰 Clearing all sales deals...');
    const salesDealsResult = await SalesDeal.deleteMany({});
    console.log(`✅ Deleted ${salesDealsResult.deletedCount} sales deals`);
    
    // Clear all documents from the uploads directory
    console.log('📄 Clearing all documents from uploads directory...');
    const uploadsDir = path.resolve(__dirname, './uploads/documents');
    
    if (await fs.pathExists(uploadsDir)) {
      const files = await fs.readdir(uploadsDir);
      console.log(`📁 Found ${files.length} files in uploads directory`);
      
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        await fs.remove(filePath);
        console.log(`🗑️ Deleted: ${file}`);
      }
      console.log(`✅ Deleted ${files.length} document files`);
    } else {
      console.log('⚠️ Uploads directory does not exist');
    }
    
    // Reset auto-increment counters if they exist
    console.log('🔄 Resetting counters...');
    try {
      const countersCollection = mongoose.connection.db.collection('counters');
      await countersCollection.deleteMany({});
      console.log('✅ Reset auto-increment counters');
    } catch (error) {
      console.log('ℹ️ No counters collection found or already empty');
    }
    
    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Deals deleted: ${dealsResult.deletedCount}`);
    console.log(`   - Vehicle records deleted: ${vehicleRecordsResult.deletedCount}`);
    console.log(`   - Sales deals deleted: ${salesDealsResult.deletedCount}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the cleanup
clearAllData(); 