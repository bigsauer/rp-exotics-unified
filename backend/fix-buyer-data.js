const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function fixBuyerData() {
  try {
    console.log('🔧 Fixing buyer data for wholesale flip deal...');
    
    const dealId = '6887ebb770ef015f4adaf5f8';
    
    // Update the deal with complete buyer data
    const updateResponse = await fetch(`https://astonishing-chicken-production.up.railway.app/api/backOffice/deals/${dealId}/update-and-regenerate`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcyYmM3YmFmM2I1OTM1NjY4NGMyNzEiLCJyb2xlIjoic2FsZXMiLCJpYXQiOjE3NTM3MzgxMTgsImV4cCI6MTc1Mzc0MTcxOH0.ULIMEJpH4c0H3W7AqqzZqxgObyhz77SyAHpoR7ebZO0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        buyer: {
          name: 'Test Dealer Buyer',
          type: 'dealer',
          tier: 'Tier 1',
          contact: {
            address: {
              street: '123 Test Street',
              city: 'Test City',
              state: 'TX',
              zip: '12345'
            },
            phone: '(555) 123-4567',
            email: 'test@testdealer.com'
          },
          licenseNumber: 'TEST123'
        }
      })
    });
    
    if (updateResponse.ok) {
      console.log('✅ Buyer data updated successfully');
      
      // Now regenerate documents
      console.log('🔄 Regenerating documents with fixed buyer data...');
      const generateResponse = await fetch(`https://astonishing-chicken-production.up.railway.app/api/documents/generate/${dealId}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcyYmM3YmFmM2I1OTM1NjY4NGMyNzEiLCJyb2xlIjoic2FsZXMiLCJpYXQiOjE3NTM3MzgxMTgsImV4cCI6MTc1Mzc0MTcxOH0.ULIMEJpH4c0H3W7AqqzZqxgObyhz77SyAHpoR7ebZO0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sellerType: 'dealer',
          buyerType: 'dealer'
        })
      });
      
      if (generateResponse.ok) {
        const result = await generateResponse.json();
        console.log('✅ Documents regenerated successfully');
        console.log('📄 Generated documents:', result.documents?.map(d => d.documentType) || []);
        
        // Look for wholesale BOS document
        const wholesaleBOS = result.documents?.find(d => d.documentType === 'wholesale_bos');
        if (wholesaleBOS) {
          console.log('🎯 Found wholesale BOS document:', wholesaleBOS.fileName);
          console.log('📝 Note: Check the Railway backend logs for debug output starting with [PDF GEN][DEBUG]');
        } else {
          console.log('⚠️ No wholesale BOS document found in generated documents');
        }
      } else {
        console.log('❌ Failed to regenerate documents:', generateResponse.status, generateResponse.statusText);
      }
    } else {
      console.log('❌ Failed to update buyer data:', updateResponse.status, updateResponse.statusText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixBuyerData(); 