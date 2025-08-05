const cloudStorage = require('./services/cloudStorage');

async function configureS3CORS() {
  try {
    console.log('🔧 Configuring S3 CORS settings...');
    
    const result = await cloudStorage.configureCORS();
    
    if (result.success) {
      console.log('✅ S3 CORS configuration completed successfully');
      console.log('📋 CORS settings applied for the following origins:');
      console.log('   - https://slipstreamdocs.com');
      console.log('   - https://www.slipstreamdocs.com');
      console.log('   - https://rp-exotics-frontend.netlify.app');
      console.log('   - https://rp-exotics-unified.vercel.app');
      console.log('   - http://localhost:3000');
      console.log('   - http://localhost:3001');
      console.log('   - http://127.0.0.1:3000');
      console.log('   - http://127.0.0.1:3001');
    } else {
      console.error('❌ Failed to configure S3 CORS:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error configuring S3 CORS:', error);
    process.exit(1);
  }
}

// Run the configuration
configureS3CORS(); 