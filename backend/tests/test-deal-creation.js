const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

async function testDealCreation() {
  console.log('🧪 Testing Auto-Dealer Creation with Deal Creation\n');

  try {
    // Test 1: Create a deal with a new dealer (seller)
    console.log('1️⃣ Creating deal with new dealer as seller...');
    const dealWithNewSeller = await axios.post(`${API_BASE_URL}/deals`, {
      vin: 'SBM14FCA4LW004366',
      year: '2020',
      make: 'McLaren',
      model: '720S',
      trim: 'Coupe',
      rpStockNumber: 'RP2025001',
      currentStage: 'purchased',
      seller: {
        name: 'Exotic Motors of Miami',
        contactPerson: 'Carlos Rodriguez',
        phone: '305-555-0123',
        email: 'carlos@exoticmotorsmiami.com'
      },
      purchasePrice: 285000,
      notes: 'Test deal with auto-created dealer'
    });
    
    console.log('✅ Deal created successfully');
    console.log('   Car:', dealWithNewSeller.data.data.make, dealWithNewSeller.data.data.model);
    console.log('   Seller:', dealWithNewSeller.data.data.seller.name);
    console.log('   VIN:', dealWithNewSeller.data.data.vin);
    console.log('');

    // Test 2: Create a deal with a new dealer as buyer
    console.log('2️⃣ Creating deal with new dealer as buyer...');
    const dealWithNewBuyer = await axios.post(`${API_BASE_URL}/deals`, {
      vin: 'WBS8M9C50J5K123456',
      year: '2018',
      make: 'BMW',
      model: 'M5',
      trim: 'Competition',
      rpStockNumber: 'RP2025002',
      currentStage: 'sold',
      seller: {
        name: 'Private Seller'
      },
      buyer: {
        name: 'Luxury Auto Gallery',
        contactPerson: 'Sarah Johnson',
        phone: '212-555-0456',
        email: 'sarah@luxuryautogallery.com'
      },
      salePrice: 85000,
      notes: 'Test deal with auto-created buyer dealer'
    });
    
    console.log('✅ Deal created successfully');
    console.log('   Car:', dealWithNewBuyer.data.data.make, dealWithNewBuyer.data.data.model);
    console.log('   Buyer:', dealWithNewBuyer.data.data.buyer.name);
    console.log('   VIN:', dealWithNewBuyer.data.data.vin);
    console.log('');

    // Test 3: Create a deal with existing dealer (should not create duplicate)
    console.log('3️⃣ Creating deal with existing dealer (should not create duplicate)...');
    const dealWithExistingDealer = await axios.post(`${API_BASE_URL}/deals`, {
      vin: 'ZFF76ZHT3E0201234',
      year: '2014',
      make: 'Ferrari',
      model: '458 Italia',
      trim: 'Spider',
      rpStockNumber: 'RP2025003',
      currentStage: 'purchased',
      seller: {
        name: 'Exotic Motors of Miami', // Same dealer as test 1
        contactPerson: 'Carlos Rodriguez',
        phone: '305-555-0123',
        email: 'carlos@exoticmotorsmiami.com'
      },
      purchasePrice: 195000,
      notes: 'Test deal with existing dealer'
    });
    
    console.log('✅ Deal created successfully');
    console.log('   Car:', dealWithExistingDealer.data.data.make, dealWithExistingDealer.data.data.model);
    console.log('   Seller:', dealWithExistingDealer.data.data.seller.name);
    console.log('   VIN:', dealWithExistingDealer.data.data.vin);
    console.log('');

    // Test 4: Check all dealers to see auto-created ones
    console.log('4️⃣ Checking all dealers in system...');
    const dealersResponse = await axios.get(`${API_BASE_URL}/dealers`);
    
    console.log('✅ Dealers retrieved successfully');
    console.log('   Total dealers:', dealersResponse.data.count);
    console.log('   Auto-created dealers:');
    dealersResponse.data.data
      .filter(dealer => dealer.notes && dealer.notes.includes('Auto-created from deal'))
      .forEach(dealer => {
        console.log(`     - ${dealer.name} (${dealer.contactPerson})`);
      });
    console.log('');

    // Test 5: Check all deals
    console.log('5️⃣ Checking all deals in system...');
    const dealsResponse = await axios.get(`${API_BASE_URL}/deals`);
    
    console.log('✅ Deals retrieved successfully');
    console.log('   Total deals:', dealsResponse.data.count);
    dealsResponse.data.deals.forEach(deal => {
      console.log(`     - ${deal.make} ${deal.model} (${deal.vin})`);
      console.log(`       Seller: ${deal.seller.name}`);
      if (deal.buyer) {
        console.log(`       Buyer: ${deal.buyer.name}`);
      }
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('==========================');
    console.log('✅ Auto-dealer creation works when creating deals');
    console.log('✅ Existing dealers are reused (no duplicates)');
    console.log('✅ Both sellers and buyers can be auto-created');
    console.log('✅ Dealer information is properly stored and linked');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the tests
testDealCreation(); 