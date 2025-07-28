const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testWholesaleBOSDebug() {
  try {
    console.log('🔍 Testing Wholesale BOS Debug Logs...');
    
    // First, let's get a wholesale flip deal
    const dealsResponse = await fetch('https://astonishing-chicken-production.up.railway.app/api/deals', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcyYmM3YmFmM2I1OTM1NjY4NGMyNzEiLCJyb2xlIjoic2FsZXMiLCJpYXQiOjE3NTM3MzgxMTgsImV4cCI6MTc1Mzc0MTcxOH0.ULIMEJpH4c0H3W7AqqzZqxgObyhz77SyAHpoR7ebZO0'
      }
    });
    
    const dealsData = await dealsResponse.json();
    const deals = Array.isArray(dealsData) ? dealsData : dealsData.deals || [];
    const wholesaleFlipDeal = deals.find(deal => deal.dealType === 'wholesale-flip');
    
    if (!wholesaleFlipDeal) {
      console.log('❌ No wholesale-flip deal found');
      return;
    }
    
    console.log(`✅ Found wholesale-flip deal: ${wholesaleFlipDeal._id}`);
    console.log(`📋 Deal data:`, {
      dealType: wholesaleFlipDeal.dealType,
      dealType2SubType: wholesaleFlipDeal.dealType2SubType,
      seller: wholesaleFlipDeal.seller?.name,
      buyer: wholesaleFlipDeal.buyer?.name,
      sellerType: wholesaleFlipDeal.seller?.type,
      buyerType: wholesaleFlipDeal.buyer?.type
    });
    
    console.log('🔍 Full seller object:', JSON.stringify(wholesaleFlipDeal.seller, null, 2));
    console.log('🔍 Full buyer object:', JSON.stringify(wholesaleFlipDeal.buyer, null, 2));
    
    // Now generate documents for this deal to trigger the debug logs
    console.log('\n🔄 Generating documents to trigger debug logs...');
    const generateResponse = await fetch(`https://astonishing-chicken-production.up.railway.app/api/documents/generate/${wholesaleFlipDeal._id}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcyYmM3YmFmM2I1OTM1NjY4NGMyNzEiLCJyb2xlIjoic2FsZXMiLCJpYXQiOjE3NTM3MzgxMTgsImV4cCI6MTc1Mzc0MTcxOH0.ULIMEJpH4c0H3W7AqqzZqxgObyhz77SyAHpoR7ebZO0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sellerType: wholesaleFlipDeal.seller?.type || 'dealer',
        buyerType: wholesaleFlipDeal.buyer?.type || 'dealer'
      })
    });
    
    if (generateResponse.ok) {
      const result = await generateResponse.json();
      console.log('✅ Documents generated successfully');
      console.log('📄 Generated documents:', result.documents?.map(d => d.type) || []);
      console.log('📄 Full result:', JSON.stringify(result, null, 2));
      
      // Look for wholesale BOS document
      const wholesaleBOS = result.documents?.find(d => d.type === 'wholesale_bos');
      if (wholesaleBOS) {
        console.log('🎯 Found wholesale BOS document:', wholesaleBOS.fileName);
        console.log('📝 Note: Check the Railway backend logs for debug output starting with [PDF GEN][DEBUG]');
      } else {
        console.log('⚠️ No wholesale BOS document found in generated documents');
      }
    } else {
      console.log('❌ Failed to generate documents:', generateResponse.status, generateResponse.statusText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWholesaleBOSDebug(); 