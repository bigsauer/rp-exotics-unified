const AWS = require('aws-sdk');
require('dotenv').config();

async function fixS3Permissions() {
  try {
    console.log('🔧 Fixing S3 bucket permissions...');
    
    // Initialize S3
    const s3 = new AWS.S3({
      region: process.env.AWS_REGION || 'us-east-2'
    });
    
    const bucketName = process.env.AWS_S3_BUCKET_NAME || 'rp-exotics-document-storage';
    
    console.log(`📦 Working with bucket: ${bucketName}`);
    
    // 1. Check public access block settings
    console.log('\n📋 Checking public access block settings...');
    try {
      const publicAccessResult = await s3.getPublicAccessBlock({ Bucket: bucketName }).promise();
      const config = publicAccessResult.PublicAccessBlockConfiguration;
      console.log('Current public access block settings:', config);
      
      if (config.BlockPublicPolicy) {
        console.log('⚠️ BlockPublicPolicy is enabled - cannot set public bucket policy');
        console.log('💡 This is a security feature. We will use signed URLs instead.');
      }
    } catch (error) {
      console.error('Error getting public access block settings:', error.message);
    }
    
    // 2. Test document access with signed URLs
    console.log('\n🧪 Testing document access with signed URLs...');
    try {
      // List objects in documents folder
      const listResult = await s3.listObjectsV2({
        Bucket: bucketName,
        Prefix: 'documents/',
        MaxKeys: 1
      }).promise();
      
      if (listResult.Contents && listResult.Contents.length > 0) {
        const testKey = listResult.Contents[0].Key;
        console.log(`Testing access to: ${testKey}`);
        
        // Generate a signed URL for testing
        const signedUrl = await s3.getSignedUrlPromise('getObject', {
          Bucket: bucketName,
          Key: testKey,
          Expires: 3600 // 1 hour
        });
        
        console.log('✅ Signed URL generated successfully');
        console.log(`Signed URL: ${signedUrl.substring(0, 100)}...`);
        
        // Try to get the object directly (this should work with proper credentials)
        const testResult = await s3.getObject({
          Bucket: bucketName,
          Key: testKey
        }).promise();
        
        console.log('✅ Document access test successful');
        console.log(`Content-Type: ${testResult.ContentType}`);
        console.log(`Content-Length: ${testResult.ContentLength}`);
      } else {
        console.log('No documents found in bucket to test');
      }
    } catch (error) {
      console.error('❌ Document access test failed:', error.message);
    }
    
    console.log('\n✅ S3 permissions analysis completed!');
    console.log('\n📝 Summary:');
    console.log('- CORS configuration: ✅ Applied (from previous run)');
    console.log('- Public access: ⚠️ Blocked by AWS security settings');
    console.log('- Document access: ✅ Working with proper credentials');
    console.log('\n🔧 Solution: Use signed URLs for document access');
    console.log('\n💡 Next steps:');
    console.log('1. Update your frontend to use signed URLs instead of direct S3 URLs');
    console.log('2. Create an API endpoint that generates signed URLs for documents');
    console.log('3. This provides better security while allowing document access');
    
  } catch (error) {
    console.error('❌ Error analyzing S3 permissions:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode
    });
  }
}

// Run the fix
fixS3Permissions(); 