const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const Dealer = require('./models/Dealer');
require('dotenv').config();

async function debugWholesaleFlipDeals() {
  console.log('🔍 Debugging Wholesale Flip Deals - Purchasing Dealer Information\n');
  
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp-exotics');
    console.log('✅ Connected to database\n');
    
    // Find all wholesale flip deals
    const wholesaleFlipDeals = await Deal.find({ dealType: 'wholesale-flip' }).lean();
    console.log(`📊 Found ${wholesaleFlipDeals.length} wholesale flip deals\n`);
    
    if (wholesaleFlipDeals.length === 0) {
      console.log('❌ No wholesale flip deals found in database');
      return;
    }
    
    // Analyze each deal
    for (let i = 0; i < wholesaleFlipDeals.length; i++) {
      const deal = wholesaleFlipDeals[i];
      console.log(`\n🔍 Deal ${i + 1}: ${deal._id}`);
      console.log(`   VIN: ${deal.vin}`);
      console.log(`   Deal Type: ${deal.dealType} - ${deal.dealType2SubType}`);
      console.log(`   Created: ${deal.createdAt}`);
      
      // Analyze buyer data
      console.log('\n   📋 BUYER DATA ANALYSIS:');
      console.log(`   - Name: "${deal.buyer?.name || 'undefined'}"`);
      console.log(`   - Type: "${deal.buyer?.type || 'undefined'}"`);
      console.log(`   - DealerId: "${deal.buyer?.dealerId || 'undefined'}"`);
      console.log(`   - License Number: "${deal.buyer?.licenseNumber || 'undefined'}"`);
      console.log(`   - Tier: "${deal.buyer?.tier || 'undefined'}"`);
      
      if (deal.buyer?.contact) {
        console.log('   - Contact Info:');
        console.log(`     * Email: "${deal.buyer.contact.email || 'undefined'}"`);
        console.log(`     * Phone: "${deal.buyer.contact.phone || 'undefined'}"`);
        if (deal.buyer.contact.address) {
          console.log(`     * Address: "${JSON.stringify(deal.buyer.contact.address)}"`);
        }
      } else {
        console.log('   - Contact Info: undefined');
      }
      
      // Check if buyer has dealerId and try to find dealer
      if (deal.buyer?.dealerId) {
        console.log('\n   🔍 DEALER LOOKUP:');
        try {
          const dealer = await Dealer.findById(deal.buyer.dealerId).lean();
          if (dealer) {
            console.log(`   ✅ Found dealer in database: "${dealer.name}"`);
            console.log(`   - Dealer email: "${dealer.contact?.email || 'undefined'}"`);
            console.log(`   - Dealer phone: "${dealer.contact?.phone || 'undefined'}"`);
            console.log(`   - Dealer license: "${dealer.licenseNumber || 'undefined'}"`);
          } else {
            console.log(`   ❌ Dealer not found for ID: ${deal.buyer.dealerId}`);
          }
        } catch (error) {
          console.log(`   ❌ Error looking up dealer: ${error.message}`);
        }
      } else {
        console.log('\n   ⚠️  No dealerId found - buyer not linked to dealer database');
      }
      
      // Check if buyer name exists in dealer database
      if (deal.buyer?.name && deal.buyer.name !== 'N/A' && deal.buyer.name.trim() !== '') {
        console.log('\n   🔍 DEALER NAME SEARCH:');
        try {
          const dealerByName = await Dealer.findOne({ 
            name: { $regex: new RegExp('^' + deal.buyer.name + '$', 'i') } 
          }).lean();
          
          if (dealerByName) {
            console.log(`   ✅ Found dealer by name: "${dealerByName.name}"`);
            console.log(`   - Dealer ID: ${dealerByName._id}`);
            console.log(`   - Dealer email: "${dealerByName.contact?.email || 'undefined'}"`);
            console.log(`   - Dealer phone: "${dealerByName.contact?.phone || 'undefined'}"`);
            console.log(`   - Dealer license: "${dealerByName.licenseNumber || 'undefined'}"`);
          } else {
            console.log(`   ❌ No dealer found with name: "${deal.buyer.name}"`);
          }
        } catch (error) {
          console.log(`   ❌ Error searching by name: ${error.message}`);
        }
      }
      
      // Determine if this would trigger RP Exotics fallback
      console.log('\n   🎯 FALLBACK ANALYSIS:');
      const hasValidBuyerName = deal.buyer?.name && 
                               deal.buyer.name !== 'N/A' && 
                               deal.buyer.name.trim() !== '' &&
                               deal.buyer.name !== 'RP Exotics';
      const hasValidContact = deal.buyer?.contact && typeof deal.buyer.contact === 'object';
      
      console.log(`   - Has valid buyer name: ${hasValidBuyerName} ("${deal.buyer?.name || 'undefined'}")`);
      console.log(`   - Has valid contact: ${hasValidContact}`);
      console.log(`   - Would trigger RP Exotics fallback: ${!(hasValidBuyerName && hasValidContact)}`);
      
      if (!(hasValidBuyerName && hasValidContact)) {
        console.log('   ⚠️  This deal would use RP Exotics as purchasing dealer!');
      } else {
        console.log('   ✅ This deal should use actual buyer data');
      }
      
      console.log('\n' + '='.repeat(80));
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`Total wholesale flip deals: ${wholesaleFlipDeals.length}`);
    
    const dealsWithValidBuyer = wholesaleFlipDeals.filter(deal => {
      const hasValidBuyerName = deal.buyer?.name && 
                               deal.buyer.name !== 'N/A' && 
                               deal.buyer.name.trim() !== '' &&
                               deal.buyer.name !== 'RP Exotics';
      const hasValidContact = deal.buyer?.contact && typeof deal.buyer.contact === 'object';
      return hasValidBuyerName && hasValidContact;
    });
    
    console.log(`Deals with valid buyer data: ${dealsWithValidBuyer.length}`);
    console.log(`Deals that would use RP Exotics fallback: ${wholesaleFlipDeals.length - dealsWithValidBuyer.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

debugWholesaleFlipDeals(); 