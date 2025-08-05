const axios = require('axios');
require('dotenv').config();

async function testSignedUrl() {
  try {
    console.log('🧪 Testing signed URL functionality...');
    
    // First, let's test the S3 signed URL generation directly
    const cloudStorage = require('./services/cloudStorage');
    
    // Test with a sample file name
    const testFileName = 'retail_pp_buy_WP0AB2A9XMS222658_1754410637508.pdf';
    console.log(`\n📄 Testing with file: ${testFileName}`);
    
    const signedUrl = await cloudStorage.getSignedUrl(testFileName, 3600);
    
    if (signedUrl) {
      console.log('✅ Signed URL generated successfully');
      console.log(`URL: ${signedUrl.substring(0, 100)}...`);
      
      // Test if the signed URL works
      console.log('\n🔗 Testing signed URL access...');
      try {
        const response = await axios.get(signedUrl, {
          timeout: 10000,
          validateStatus: () => true // Don't throw on any status code
        });
        
        console.log(`Status: ${response.status}`);
        console.log(`Content-Type: ${response.headers['content-type']}`);
        console.log(`Content-Length: ${response.headers['content-length']}`);
        
        if (response.status === 200) {
          console.log('✅ Signed URL is working correctly!');
        } else {
          console.log('⚠️ Signed URL returned non-200 status');
        }
      } catch (error) {
        console.error('❌ Error testing signed URL:', error.message);
      }
    } else {
      console.error('❌ Failed to generate signed URL');
    }
    
    // Test the API endpoint (this would require authentication)
    console.log('\n🌐 Testing API endpoint...');
    console.log('Note: API endpoint requires authentication');
    console.log('Endpoint: GET /api/documents/signed-url/:fileName');
    console.log('This endpoint is now available for the frontend to use');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSignedUrl(); 