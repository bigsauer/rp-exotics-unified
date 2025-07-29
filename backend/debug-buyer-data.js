const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function debugBuyerData() {
  try {
    console.log('🔍 Debugging Buyer Data in Wholesale Flip Deals...');
    
    // Get all deals to find wholesale flip deals
    const dealsResponse = await fetch('https://astonishing-chicken-production.up.railway.app/api/deals', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcyYmM3YmFmM2I1OTM1NjY4NGMyNzEiLCJyb2xlIjoic2FsZXMiLCJpYXQiOjE3NTM3OTk4NjcsImV4cCI6MTc1MzgwMzQ2N30.rDnQyWX4bwP-CR9x7Bb6mfVpB0lytv2VYHgWoqEl2Tk'
      }
    });
    
    const dealsData = await dealsResponse.json();
    const deals = Array.isArray(dealsData) ? dealsData : dealsData.deals || [];
    
    console.log(`📊 Total deals found: ${deals.length}`);
    
    // Find all wholesale flip deals
    const wholesaleFlipDeals = deals.filter(deal => deal.dealType === 'wholesale-flip');
    console.log(`🎯 Wholesale flip deals found: ${wholesaleFlipDeals.length}`);
    
    if (wholesaleFlipDeals.length === 0) {
      console.log('❌ No wholesale-flip deals found in database');
      return;
    }
    
    // Analyze each wholesale flip deal
    wholesaleFlipDeals.forEach((deal, index) => {
      console.log(`\n📋 Deal ${index + 1}: ${deal._id}`);
      console.log(`   Deal Type: ${deal.dealType}`);
      console.log(`   Sub Type: ${deal.dealType2SubType}`);
      console.log(`   Stock Number: ${deal.stockNumber || 'N/A'}`);
      console.log(`   VIN: ${deal.vin || 'N/A'}`);
      
      console.log(`\n   🔍 SELLER DATA:`);
      console.log(`   - Name: "${deal.seller?.name || 'undefined'}"`);
      console.log(`   - Type: "${deal.seller?.type || 'undefined'}"`);
      console.log(`   - Dealer ID: "${deal.seller?.dealerId || 'undefined'}"`);
      console.log(`   - License: "${deal.seller?.licenseNumber || 'undefined'}"`);
      console.log(`   - Tier: "${deal.seller?.tier || 'undefined'}"`);
      console.log(`   - Contact:`, deal.seller?.contact || 'undefined');
      
      console.log(`\n   🔍 BUYER DATA:`);
      console.log(`   - Name: "${deal.buyer?.name || 'undefined'}"`);
      console.log(`   - Type: "${deal.buyer?.type || 'undefined'}"`);
      console.log(`   - Dealer ID: "${deal.buyer?.dealerId || 'undefined'}"`);
      console.log(`   - License: "${deal.buyer?.licenseNumber || 'undefined'}"`);
      console.log(`   - Tier: "${deal.buyer?.tier || 'undefined'}"`);
      console.log(`   - Contact:`, deal.buyer?.contact || 'undefined');
      
      // Check if buyer data would trigger the fallback
      const buyerName = deal.buyer?.name;
      const buyerType = deal.buyer?.type;
      const wouldTriggerFallback = buyerType === 'dealer' && (!buyerName || buyerName === 'N/A');
      
      console.log(`\n   ⚠️  FALLBACK ANALYSIS:`);
      console.log(`   - Buyer type is dealer: ${buyerType === 'dealer'}`);
      console.log(`   - Buyer name is missing/empty: ${!buyerName}`);
      console.log(`   - Buyer name is 'N/A': ${buyerName === 'N/A'}`);
      console.log(`   - Would trigger RP Exotics fallback: ${wouldTriggerFallback}`);
      
      if (wouldTriggerFallback) {
        console.log(`   ❌ PROBLEM: This deal would incorrectly use RP Exotics as buyer!`);
      } else {
        console.log(`   ✅ OK: This deal should use actual buyer data`);
      }
    });
    
    // Also check if there are any deals with actual buyer names that might be getting overridden
    console.log(`\n🔍 CHECKING FOR DEALS WITH ACTUAL BUYER NAMES:`);
    const dealsWithBuyerNames = wholesaleFlipDeals.filter(deal => 
      deal.buyer?.name && 
      deal.buyer.name !== 'N/A' && 
      deal.buyer.name !== 'RP Exotics' &&
      deal.buyer.name.trim() !== ''
    );
    
    console.log(`Found ${dealsWithBuyerNames.length} deals with actual buyer names:`);
    dealsWithBuyerNames.forEach((deal, index) => {
      console.log(`   ${index + 1}. "${deal.buyer.name}" (${deal.buyer.type}) - ${deal.stockNumber || deal.vin}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugBuyerData(); 