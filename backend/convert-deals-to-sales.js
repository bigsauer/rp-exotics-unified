const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/rp-exotics';

async function convertDealsToSales() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const Deal = require('./models/Deal');
    const SalesDeal = require('./models/SalesDeal');
    const User = require('./models/User');
    
    // Get all regular deals
    const regularDeals = await Deal.find();
    console.log(`📊 Found ${regularDeals.length} regular deals to convert`);

    if (regularDeals.length === 0) {
      console.log('❌ No regular deals found to convert');
      return;
    }

    // Get a default user for sales person (or create one if needed)
    let defaultUser = await User.findOne({ role: 'sales' });
    if (!defaultUser) {
      defaultUser = await User.findOne(); // Get any user as fallback
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
        // Check if sales deal already exists for this VIN
        const existingSalesDeal = await SalesDeal.findOne({ vin: deal.vin });
        if (existingSalesDeal) {
          console.log(`⏭️  Skipping ${deal.vehicle} (VIN: ${deal.vin}) - sales deal already exists`);
          skippedCount++;
          continue;
        }

        // Convert regular deal to sales deal format
        const salesDealData = {
          vehicle: deal.vehicle,
          vin: deal.vin,
          stockNumber: deal.rpStockNumber || `RP${Date.now()}`,
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
        
        console.log(`✅ Converted: ${deal.vehicle} (VIN: ${deal.vin})`);
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

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

convertDealsToSales(); 