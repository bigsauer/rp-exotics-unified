const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
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

async function backupDeals() {
  console.log('💾 Starting Deal Backup');
  console.log('========================');
  
  try {
    // Get the Deal model
    const Deal = mongoose.model('Deal');
    
    // Get all deals
    const deals = await Deal.find({}).lean();
    console.log(`📊 Found ${deals.length} deals to backup`);
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '..', 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `deals-backup-${timestamp}.json`);
    
    // Prepare backup data
    const backupData = {
      timestamp: new Date().toISOString(),
      totalDeals: deals.length,
      deals: deals.map(deal => ({
        _id: deal._id,
        dealType: deal.dealType,
        dealType2: deal.dealType2,
        dealType2SubType: deal.dealType2SubType,
        vin: deal.vin,
        stockNumber: deal.stockNumber,
        purchasePrice: deal.purchasePrice,
        listPrice: deal.listPrice,
        wholesalePrice: deal.wholesalePrice,
        seller: deal.seller,
        buyer: deal.buyer,
        currentStage: deal.currentStage,
        salesperson: deal.salesperson,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
        documents: deal.documents?.length || 0
      }))
    };
    
    // Write backup to file
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup saved to: ${backupFile}`);
    
    // Log summary
    console.log('\n📋 Backup Summary:');
    console.log('==================');
    console.log(`Total Deals: ${deals.length}`);
    
    // Count by deal type
    const dealTypeCounts = {};
    deals.forEach(deal => {
      const key = `${deal.dealType}${deal.dealType2 ? `-${deal.dealType2}` : ''}`;
      dealTypeCounts[key] = (dealTypeCounts[key] || 0) + 1;
    });
    
    console.log('\nDeals by Type:');
    Object.entries(dealTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // Check for deals with missing dealType2
    const missingDealType2 = deals.filter(deal => !deal.dealType2);
    if (missingDealType2.length > 0) {
      console.log(`\n⚠️  ${missingDealType2.length} deals missing dealType2 field`);
    }
    
    // Check for deals with incorrect dealType2SubType
    const incorrectSubType = deals.filter(deal => 
      deal.dealType === 'wholesale-d2d' && 
      deal.dealType2 === 'Sale' && 
      deal.dealType2SubType !== 'sale'
    );
    if (incorrectSubType.length > 0) {
      console.log(`\n⚠️  ${incorrectSubType.length} wholesale d2d sale deals with incorrect dealType2SubType`);
    }
    
    console.log('\n✅ Backup completed successfully!');
    console.log('💡 This backup can be used to restore deals if needed during redeployment.');
    
  } catch (error) {
    console.error('❌ Error during backup:', error);
  }
}

async function main() {
  await connectDB();
  await backupDeals();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
}

main(); 