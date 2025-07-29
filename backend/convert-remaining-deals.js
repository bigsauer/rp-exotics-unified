const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/rp-exotics';

async function convertRemainingDeals() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const Deal = require('./models/Deal');
    const SalesDeal = require('./models/SalesDeal');
    const User = require('./models/User');
    
    // Get all regular deals
    const regularDeals = await Deal.find();
    console.log(`📊 Found ${regularDeals.length} regular deals to check`);

    if (regularDeals.length === 0) {
      console.log('❌ No regular deals found');
      return;
    }

    // Get a default user for sales person
    let defaultUser = await User.findOne({ role: 'sales' });
    if (!defaultUser) {
      defaultUser = await User.findOne();
    }

    if (!defaultUser) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`👤 Using user as sales person: ${defaultUser.email}`);

    let convertedCount = 0;
    let skippedCount = 0;

    for (const deal of regularDeals) {
      try {
        console.log(`\n🔍 Processing: ${deal.vehicle} (VIN: ${deal.vin})`);
        
        // Check if sales deal already exists for this VIN
        const existingSalesDeals = await SalesDeal.find({ vin: deal.vin });
        console.log(`📋 Found ${existingSalesDeals.length} existing sales deals for this VIN`);
        
        if (existingSalesDeals.length > 0) {
          console.log(`⏭️  Skipping - sales deal already exists for VIN: ${deal.vin}`);
          skippedCount++;
          continue;
        }

        // Create unique stock number
        const uniqueStockNumber = `RP${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Convert regular deal to sales deal format
        const salesDealData = {
          vehicle: deal.vehicle,
          vin: deal.vin,
          stockNumber: uniqueStockNumber,
          year: deal.year,
          make: deal.make,
          model: deal.model,
          
          // Sales person information
          salesPerson: {
            id: defaultUser._id,
            name: defaultUser.profile?.displayName || defaultUser.email,
            email: defaultUser.email,
            phone: defaultUser.profile?.phone || ''
          },
          
          // Customer information (from seller)
          customer: {
            name: deal.seller?.name || 'Unknown Customer',
            type: deal.seller?.type === 'dealer' ? 'dealer' : 'individual',
            contact: {
              email: deal.seller?.contact?.email || deal.seller?.email || '',
              phone: deal.seller?.contact?.phone || deal.seller?.phone || '',
              address: deal.seller?.contact?.address ? 
                `${deal.seller.contact.address.street}, ${deal.seller.contact.address.city}, ${deal.seller.contact.address.state} ${deal.seller.contact.address.zip}` : '',
              preferredContact: 'email'
            },
            notes: deal.notes || deal.generalNotes || '',
            source: 'other'
          },
          
          // Financial information
          financial: {
            purchasePrice: deal.purchasePrice || 0,
            listPrice: deal.listPrice || 0,
            expectedMargin: deal.listPrice && deal.purchasePrice ? deal.listPrice - deal.purchasePrice : 0,
            commission: {
              rate: 0,
              estimatedAmount: 0
            }
          },
          
          // Timeline
          timeline: {
            purchaseDate: deal.purchaseDate || new Date(),
            estimatedCompletionDate: null,
            actualCompletionDate: null,
            milestones: []
          },
          
          // Current stage
          currentStage: deal.currentStage || 'contract-received',
          previousStage: null,
          stageHistory: [{
            stage: deal.currentStage || 'contract-received',
            enteredAt: deal.createdAt || new Date(),
            notes: 'Converted from regular deal'
          }],
          
          // Priority and status
          priority: deal.priority || 'medium',
          status: 'active',
          
          // Additional fields
          communications: [],
          salesActions: [],
          customerInteractions: [],
          notifications: [],
          tags: []
        };

        // Create the sales deal
        const salesDeal = new SalesDeal(salesDealData);
        await salesDeal.save();
        
        console.log(`✅ Converted: ${deal.vehicle} (VIN: ${deal.vin}) with stock number: ${uniqueStockNumber}`);
        convertedCount++;

      } catch (error) {
        console.error(`❌ Error converting deal ${deal.vehicle} (VIN: ${deal.vin}):`, error.message);
      }
    }

    console.log(`\n📊 Conversion Summary:`);
    console.log(`✅ Successfully converted: ${convertedCount} deals`);
    console.log(`⏭️  Skipped (already exists): ${skippedCount} deals`);
    console.log(`📋 Total processed: ${regularDeals.length} deals`);

    // Verify the conversion
    const totalSalesDeals = await SalesDeal.countDocuments();
    console.log(`\n📊 Total SalesDeal documents now: ${totalSalesDeals}`);

    // Show all sales deals
    const allSalesDeals = await SalesDeal.find();
    console.log(`\n📋 All Sales Deals:`);
    allSalesDeals.forEach((deal, index) => {
      console.log(`\n--- Sales Deal ${index + 1} ---`);
      console.log('ID:', deal._id);
      console.log('Vehicle:', deal.vehicle);
      console.log('VIN:', deal.vin);
      console.log('Stock Number:', deal.stockNumber);
      console.log('Current Stage:', deal.currentStage);
      console.log('Customer:', deal.customer?.name);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

convertRemainingDeals(); 