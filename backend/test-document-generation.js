const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'https://astonishing-chicken-production.up.railway.app';

async function testDocumentGeneration() {
  try {
    console.log('🧪 Testing document generation...');
    
    // Login to get a token first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'lynn@rpexotics.com',
      password: 'titles123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // First, get all deals to see what we have
    console.log('📋 Fetching all deals...');
    const dealsResponse = await axios.get(`${API_BASE_URL}/api/deals`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const deals = dealsResponse.data.deals || dealsResponse.data;
    
    console.log(`📊 Found ${deals.length} deals`);
    
    if (deals.length === 0) {
      console.log('❌ No deals found. Please create a deal first.');
      return;
    }
    
    // Show the first few deals
    console.log('\n📋 Available deals:');
    deals.slice(0, 5).forEach((deal, index) => {
      console.log(`${index + 1}. ${deal.vehicle || `${deal.year} ${deal.make} ${deal.model}`} (${deal.vin}) - ${deal.dealType || 'unknown'}`);
    });
    
    // Use the first deal for testing
    const testDeal = deals[0];
    console.log(`\n🎯 Testing document generation for deal: ${testDeal.vehicle || `${testDeal.year} ${testDeal.make} ${testDeal.model}`}`);
    console.log(`   VIN: ${testDeal.vin}`);
    console.log(`   Deal Type: ${testDeal.dealType}`);
    console.log(`   Deal ID: ${testDeal._id || testDeal.id}`);
    
    // Generate documents for the test deal
    console.log('\n📄 Generating documents...');
    const generateResponse = await axios.post(
      `${API_BASE_URL}/api/documents/generate/${testDeal._id || testDeal.id}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Document generation response:', generateResponse.data);
    
    // Check if documents were generated
    console.log('\n📋 Checking generated documents...');
    const dealResponse = await axios.get(`${API_BASE_URL}/api/backOffice/deals/${testDeal._id || testDeal.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const dealWithDocs = dealResponse.data.deal;
    console.log(`📄 Deal has ${dealWithDocs.documents ? dealWithDocs.documents.length : 0} documents`);
    
    if (dealWithDocs.documents && dealWithDocs.documents.length > 0) {
      console.log('📋 Document details:');
      dealWithDocs.documents.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.type} - ${doc.fileName || 'No filename'} - Uploaded: ${doc.uploaded}`);
      });
    }
    
    console.log('\n🎉 Document generation test completed!');
    
  } catch (error) {
    console.error('❌ Error during document generation test:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error(`   Status: ${error.response.status}`);
    }
  }
}

// Run the test
testDocumentGeneration(); 