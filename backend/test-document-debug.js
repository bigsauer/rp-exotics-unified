const mongoose = require('mongoose');
const Deal = require('./models/Deal');
const VehicleRecord = require('./models/VehicleRecord');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function debugDocuments() {
  try {
    console.log('🔍 Debugging document retrieval...');
    
    // Get the most recent deal with documents
    const latestDealWithDocs = await Deal.findOne({ 
      $or: [
        { 'documents.0': { $exists: true } },
        { vehicleRecordId: { $exists: true, $ne: null } }
      ]
    }).sort({ createdAt: -1 });
    
    // Get the most recent deal (any)
    const latestDeal = await Deal.findOne().sort({ createdAt: -1 });
    
    console.log('📊 Deal statistics:');
    const totalDeals = await Deal.countDocuments();
    const dealsWithDocs = await Deal.countDocuments({ 'documents.0': { $exists: true } });
    const dealsWithVehicleRecords = await Deal.countDocuments({ vehicleRecordId: { $exists: true, $ne: null } });
    
    console.log(`  - Total deals: ${totalDeals}`);
    console.log(`  - Deals with documents: ${dealsWithDocs}`);
    console.log(`  - Deals with vehicle records: ${dealsWithVehicleRecords}`);
    
    const dealToAnalyze = latestDealWithDocs || latestDeal;
    
    if (!dealToAnalyze) {
      console.log('❌ No deals found in database');
      return;
    }
    
    console.log('📋 Deal to analyze:');
    console.log('  - ID:', dealToAnalyze._id);
    console.log('  - VIN:', dealToAnalyze.vin);
    console.log('  - Deal Type:', dealToAnalyze.dealType);
    console.log('  - Documents count:', dealToAnalyze.documents ? dealToAnalyze.documents.length : 0);
    console.log('  - Vehicle Record ID:', dealToAnalyze.vehicleRecordId);
    
    if (dealToAnalyze.documents && dealToAnalyze.documents.length > 0) {
      console.log('📄 Deal documents:');
      dealToAnalyze.documents.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.fileName} (${doc.type})`);
        console.log(`     - Size: ${doc.fileSize} bytes`);
        console.log(`     - Uploaded: ${doc.uploaded}`);
        console.log(`     - Path: ${doc.filePath}`);
      });
    }
    
    if (dealToAnalyze.vehicleRecordId) {
      const vehicleRecord = await VehicleRecord.findById(dealToAnalyze.vehicleRecordId);
      if (vehicleRecord) {
        console.log('🚗 Vehicle record found:');
        console.log('  - ID:', vehicleRecord._id);
        console.log('  - Generated documents count:', vehicleRecord.generatedDocuments ? vehicleRecord.generatedDocuments.length : 0);
        
        if (vehicleRecord.generatedDocuments && vehicleRecord.generatedDocuments.length > 0) {
          console.log('📄 Vehicle record documents:');
          vehicleRecord.generatedDocuments.forEach((doc, index) => {
            console.log(`  ${index + 1}. ${doc.fileName} (${doc.documentType})`);
            console.log(`     - Size: ${doc.fileSize} bytes`);
            console.log(`     - Generated: ${doc.generated}`);
            console.log(`     - Path: ${doc.filePath}`);
          });
        }
      } else {
        console.log('❌ Vehicle record not found');
      }
    }
    
    // Test the exact query that the frontend uses
    console.log('\n🔍 Testing frontend query...');
    const dealWithPopulate = await Deal.findById(dealToAnalyze._id)
      .populate('assignedTo', 'profile.displayName email')
      .populate('seller.dealerId', 'name company contact')
      .populate('documents.uploadedBy', 'profile.displayName')
      .populate('documents.approvedBy', 'profile.displayName')
      .populate('workflowHistory.changedBy', 'profile.displayName')
      .populate('activityLog.userId', 'profile.displayName')
      .lean();
    
    console.log('📋 Deal with populate:');
    console.log('  - Documents count:', dealWithPopulate.documents ? dealWithPopulate.documents.length : 0);
    
    if (dealWithPopulate.documents && dealWithPopulate.documents.length > 0) {
      console.log('📄 Populated deal documents:');
      dealWithPopulate.documents.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.fileName} (${doc.type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error debugging documents:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugDocuments(); 