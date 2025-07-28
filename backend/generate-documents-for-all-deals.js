const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'https://astonishing-chicken-production.up.railway.app';

async function generateDocumentsForAllDeals() {
  try {
    console.log('🚀 Starting document generation for all deals...');
    
    // Login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'lynn@rpexotics.com',
      password: 'titles123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Get all deals
    console.log('📋 Fetching all deals...');
    const dealsResponse = await axios.get(`${API_BASE_URL}/api/deals`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const deals = dealsResponse.data.deals || dealsResponse.data;
    
    console.log(`📊 Found ${deals.length} deals`);
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // Process each deal
    for (const deal of deals) {
      try {
        processedCount++;
        console.log(`\n📄 Processing deal ${processedCount}/${deals.length}: ${deal.vehicle || `${deal.year} ${deal.make} ${deal.model}`}`);
        
        // Check if deal already has generated documents
        const dealResponse = await axios.get(`${API_BASE_URL}/api/backOffice/deals/${deal._id || deal.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const dealWithDocs = dealResponse.data.deal;
        const hasGeneratedDocs = dealWithDocs.documents && dealWithDocs.documents.some(doc => doc.uploaded);
        
        if (hasGeneratedDocs) {
          console.log(`   ⏭️  Deal already has generated documents, skipping...`);
          continue;
        }
        
        // Generate documents for this deal
        console.log(`   🔄 Generating documents...`);
        const generateResponse = await axios.post(
          `${API_BASE_URL}/api/documents/generate/${deal._id || deal.id}`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`   ✅ Documents generated successfully`);
        successCount++;
        
        // Add a small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Error processing deal:`, error.response?.data || error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Document generation completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total deals processed: ${processedCount}`);
    console.log(`   - Successful generations: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Skipped (already had docs): ${processedCount - successCount - errorCount}`);
    
  } catch (error) {
    console.error('❌ Error during document generation:', error.response?.data || error.message);
  }
}

// Run the script
generateDocumentsForAllDeals(); 