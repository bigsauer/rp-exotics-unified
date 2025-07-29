const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testFlipDealDebug() {
  try {
    console.log('🔍 Comprehensive Debug of Wholesale Flip Deal Document Generation...');
    
    // First, let's create a test wholesale flip deal with actual buyer data
    console.log('\n📝 Creating a test wholesale flip deal with actual buyer data...');
    
    const testDealData = {
      dealType: 'wholesale-flip',
      dealType2SubType: 'buy-sell',
      stockNumber: 'TEST-FLIP-001',
      vin: '1HGBH41JXMN109186',
      year: '2021',
      make: 'Honda',
      model: 'Civic',
      purchasePrice: 15000,
      listPrice: 18000,
      wholesalePrice: 16000,
      seller: {
        name: 'Test Private Seller',
        type: 'private',
        contact: {
          address: {
            street: '123 Test St',
            city: 'Test City',
            state: 'MO',
            zip: '63101'
          },
          phone: '(555) 123-4567',
          email: 'seller@test.com'
        }
      },
      buyer: {
        name: 'ABC Auto Dealership',
        type: 'dealer',
        dealerId: null, // No dealerId to test the logic
        licenseNumber: 'DL12345',
        tier: 'Tier 1',
        contact: {
          address: {
            street: '456 Dealer Ave',
            city: 'Dealer City',
            state: 'MO',
            zip: '63102'
          },
          phone: '(555) 987-6543',
          email: 'dealer@abcauto.com'
        }
      }
    };
    
    console.log('📋 Test deal data:', JSON.stringify(testDealData, null, 2));
    
    // Create the deal
    const createResponse = await fetch('https://astonishing-chicken-production.up.railway.app/api/deals', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcyYmM3YmFmM2I1OTM1NjY4NGMyNzEiLCJyb2xlIjoic2FsZXMiLCJpYXQiOjE3NTM3OTk4NjcsImV4cCI6MTc1MzgwMzQ2N30.rDnQyWX4bwP-CR9x7Bb6mfVpB0lytv2VYHgWoqEl2Tk',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testDealData)
    });
    
    if (!createResponse.ok) {
      console.log('❌ Failed to create test deal:', createResponse.status);
      const errorText = await createResponse.text();
      console.log('Error:', errorText);
      return;
    }
    
    const createdDeal = await createResponse.json();
    console.log('✅ Test deal created:', createdDeal._id);
    
    // Now let's generate documents for this deal
    console.log('\n🔄 Generating documents for the test deal...');
    
    const generateResponse = await fetch(`https://astonishing-chicken-production.up.railway.app/api/documents/generate/${createdDeal._id}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcyYmM3YmFmM2I1OTM1NjY4NGMyNzEiLCJyb2xlIjoic2FsZXMiLCJpYXQiOjE3NTM3OTk4NjcsImV4cCI6MTc1MzgwMzQ2N30.rDnQyWX4bwP-CR9x7Bb6mfVpB0lytv2VYHgWoqEl2Tk',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sellerType: 'private',
        buyerType: 'dealer',
        buyerName: 'ABC Auto Dealership',
        buyerPhone: '(555) 987-6543',
        buyerEmail: 'dealer@abcauto.com',
        buyerAddress: '456 Dealer Ave, Dealer City, MO 63102'
      })
    });
    
    if (generateResponse.ok) {
      const result = await generateResponse.json();
      console.log('✅ Documents generated successfully');
      console.log('📄 Generated documents:', result.documents?.map(d => d.documentType) || []);
      
      // Check each document
      result.documents?.forEach((doc, index) => {
        console.log(`\n📄 Document ${index + 1}: ${doc.documentType}`);
        console.log(`   File: ${doc.fileName}`);
        console.log(`   Party: ${doc.party || 'N/A'}`);
        
        // Check if this is a wholesale BOS or vehicle record
        if (doc.documentType === 'wholesale_bos') {
          console.log('   🎯 This is a wholesale BOS - should show ABC Auto Dealership as purchasing dealer');
        }
        if (doc.documentType === 'vehicle_record_pdf') {
          console.log('   🎯 This is a vehicle record - should show ABC Auto Dealership as buyer');
        }
      });
      
      console.log('\n🔍 ANALYSIS:');
      console.log('1. The test deal was created with buyer name: "ABC Auto Dealership"');
      console.log('2. Document generation was called with buyerName: "ABC Auto Dealership"');
      console.log('3. Check the generated documents to see if they show:');
      console.log('   - Wholesale BOS: "PURCHASING DEALER" section should show "ABC Auto Dealership"');
      console.log('   - Vehicle Record: "BUYER" section should show "ABC Auto Dealership"');
      console.log('4. If they still show "RP Exotics", there is still an issue in the document generation logic');
      
    } else {
      console.log('❌ Failed to generate documents:', generateResponse.status);
      const errorText = await generateResponse.text();
      console.log('Error:', errorText);
    }
    
    // Clean up - delete the test deal
    console.log('\n🧹 Cleaning up test deal...');
    const deleteResponse = await fetch(`https://astonishing-chicken-production.up.railway.app/api/deals/${createdDeal._id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcyYmM3YmFmM2I1OTM1NjY4NGMyNzEiLCJyb2xlIjoic2FsZXMiLCJpYXQiOjE3NTM3OTk4NjcsImV4cCI6MTc1MzgwMzQ2N30.rDnQyWX4bwP-CR9x7Bb6mfVpB0lytv2VYHgWoqEl2Tk'
      }
    });
    
    if (deleteResponse.ok) {
      console.log('✅ Test deal cleaned up');
    } else {
      console.log('⚠️ Failed to clean up test deal');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFlipDealDebug(); 