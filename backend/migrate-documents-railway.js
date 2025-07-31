// Script to migrate documents to S3 (run on Railway)
const cloudStorage = require('./services/cloudStorage');
const fs = require('fs-extra');
const path = require('path');

async function migrateDocumentsOnRailway() {
  console.log('🚀 MIGRATING DOCUMENTS TO S3 (Railway)');
  console.log('=======================================\n');

  // Check environment variables
  console.log('🔍 ENVIRONMENT VARIABLES:');
  console.log('=========================');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
  console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET'}`);
  console.log(`AWS_S3_BUCKET_NAME: ${process.env.AWS_S3_BUCKET_NAME || 'NOT SET'}`);
  console.log(`AWS_REGION: ${process.env.AWS_REGION || 'NOT SET'}`);

  const isLocal = process.env.NODE_ENV !== 'production' || !process.env.AWS_ACCESS_KEY_ID;
  console.log(`Storage mode: ${isLocal ? 'LOCAL' : 'CLOUD'}`);

  if (isLocal) {
    console.log('\n❌ ERROR: Not configured for cloud storage');
    console.log('This script must be run on Railway with S3 environment variables set');
    return;
  }

  console.log('\n✅ CLOUD STORAGE CONFIGURED - Starting migration...');

  // Check if we have any local files to migrate
  const uploadsDir = path.resolve(__dirname, './uploads/documents');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('📁 No local uploads directory found');
    console.log('This is normal on Railway - documents should already be in S3');
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  const pdfFiles = files.filter(f => f.endsWith('.pdf'));
  
  if (pdfFiles.length === 0) {
    console.log('📄 No PDF files found locally');
    console.log('This is normal on Railway - documents should already be in S3');
    return;
  }

  console.log(`📊 Found ${pdfFiles.length} PDF files to migrate`);
  console.log('Starting migration...\n');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < pdfFiles.length; i++) {
    const fileName = pdfFiles[i];
    const filePath = path.join(uploadsDir, fileName);
    
    try {
      console.log(`[${i + 1}/${pdfFiles.length}] Migrating: ${fileName}`);
      
      // Check if file already exists in S3
      const exists = await cloudStorage.fileExists(fileName);
      if (exists) {
        console.log(`   ⏭️  Already in S3, skipping`);
        successCount++;
        continue;
      }
      
      // Upload to S3
      const uploadResult = await cloudStorage.uploadFile(filePath, fileName, 'application/pdf');
      
      if (uploadResult.success) {
        console.log(`   ✅ Uploaded to S3`);
        successCount++;
      } else {
        console.log(`   ❌ Upload failed`);
        errorCount++;
        errors.push({ fileName, error: 'Upload failed' });
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      errorCount++;
      errors.push({ fileName, error: error.message });
    }
    
    // Small delay
    if (i < pdfFiles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n📊 MIGRATION SUMMARY:');
  console.log('=====================');
  console.log(`Total files: ${pdfFiles.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);

  if (successCount > 0) {
    console.log('\n✅ MIGRATION COMPLETE');
    console.log('====================');
    console.log(`• ${successCount} documents migrated to S3`);
    console.log('• Documents will persist across deployments');
    console.log('• All future documents will go to S3 automatically');
  }

  console.log('\n🚀 Migration script complete!');
}

// Run the migration
migrateDocumentsOnRailway().catch(console.error); 