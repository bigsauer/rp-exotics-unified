// Fix sync issue by creating sales deals using the existing server
const axios = require('axios');

const API_BASE = 'http://localhost:5001';

async function fixSyncIssue() {
  console.log('🔧 Fixing sync issue by creating sales deals...\n');
  
  try {
    // First, let's check what deals exist
    console.log('1️⃣ Checking existing deals...');
    
    const dealsResponse = await axios.get(`${API_BASE}/api/deals`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    const deals = dealsResponse.data.data || [];
    console.log(`Found ${deals.length} finance deals`);
    
    if (deals.length === 0) {
      console.log('No deals found to create sales deals for');
      return;
    }
    
    // Get the first few deals to test with
    const testDeals = deals.slice(0, 5);
    console.log(`Testing with ${testDeals.length} deals`);
    
    // Create sales deals for each finance deal
    console.log('\n2️⃣ Creating sales deals...');
    
    for (const deal of testDeals) {
      try {
        console.log(`Processing VIN: ${deal.vin}`);
        
        // Create a sales deal using the sales API
        const salesDealData = {
          vehicle: deal.vehicle || `${deal.year} ${deal.make} ${deal.model}`,
          vin: deal.vin,
          stockNumber: deal.rpStockNumber || `SALES-${Date.now()}`,
          year: deal.year,
          make: deal.make,
          model: deal.model,
          
          // Sales person info
          salesPerson: {
            name: 'Auto-created from Finance',
            email: 'auto@rpexotics.com',
            phone: '555-0000'
          },
          
          // Customer info
          customer: {
            name: deal.seller?.name || 'Auto-created from Finance',
            type: 'dealer',
            contact: {
              email: 'auto@rpexotics.com',
              phone: '555-0000'
            }
          },
          
          // Financial info
          financial: {
            purchasePrice: deal.purchasePrice,
            listPrice: deal.listPrice || deal.purchasePrice * 1.1
          },
          
          // Stage mapping
          currentStage: 'purchased', // Start with purchased stage
          priority: deal.priority || 'normal',
          status: 'active'
        };
        
        const createResponse = await axios.post(`${API_BASE}/api/sales/deals`, salesDealData, {
          headers: {
            'Authorization': 'Bearer test-token'
          }
        });
        
        console.log(`✅ Created sales deal for VIN: ${deal.vin}`);
        
      } catch (error) {
        console.log(`❌ Error creating sales deal for VIN ${deal.vin}: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Test the sync
    console.log('\n3️⃣ Testing sync functionality...');
    try {
      const syncResponse = await axios.post(`${API_BASE}/api/sync/all`, {}, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      console.log('Sync test result:', syncResponse.data);
    } catch (error) {
      console.log(`Error during sync test: ${error.response?.data?.error || error.message}`);
    }
    
    console.log('\n🎉 Sync issue fix completed!');
    console.log('Check the server logs to see if the sync is now working properly.');
    
  } catch (error) {
    console.error('❌ Error fixing sync issue:', error.response?.data || error.message);
  }
}

// Run the fix
fixSyncIssue(); 