const mongoose = require('mongoose');
const DocumentType = require('../models/DocumentType');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp-exotics');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Add seller document types
const addSellerDocumentTypes = async () => {
  try {
    console.log('Adding seller document types...');

    const sellerDocumentTypes = [
      {
        type: 'seller_photo_id',
        name: 'Seller Photo ID',
        description: 'Valid state-issued photo ID for all title holders',
        required: true,
        category: 'identification',
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        order: 100
      },
      {
        type: 'seller_title_front',
        name: 'Seller Title Front',
        description: 'Front photo of the title in front of the vehicle',
        required: true,
        category: 'vehicle',
        allowedFileTypes: ['jpg', 'jpeg', 'png'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        order: 101
      },
      {
        type: 'seller_title_back',
        name: 'Seller Title Back',
        description: 'Back photo of the title in front of the vehicle',
        required: true,
        category: 'vehicle',
        allowedFileTypes: ['jpg', 'jpeg', 'png'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        order: 102
      },
      {
        type: 'seller_registration',
        name: 'Seller Registration',
        description: 'Picture of registration (if no title available)',
        required: false,
        category: 'vehicle',
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        order: 103
      },
      {
        type: 'seller_odometer',
        name: 'Seller Odometer',
        description: 'Photo of the current odometer reading',
        required: true,
        category: 'vehicle',
        allowedFileTypes: ['jpg', 'jpeg', 'png'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        order: 104
      },
      {
        type: 'seller_document',
        name: 'Seller Document',
        description: 'Additional document uploaded by seller',
        required: false,
        category: 'other',
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        order: 105
      }
    ];

    for (const docType of sellerDocumentTypes) {
      // Check if document type already exists
      const existingDocType = await DocumentType.findOne({ type: docType.type });
      
      if (existingDocType) {
        console.log(`Document type ${docType.type} already exists, updating...`);
        await DocumentType.findOneAndUpdate(
          { type: docType.type },
          docType,
          { new: true }
        );
      } else {
        console.log(`Creating new document type: ${docType.type}`);
        await DocumentType.create(docType);
      }
    }

    console.log('✅ Seller document types added successfully!');
    
    // List all document types
    const allDocTypes = await DocumentType.find({}).sort({ order: 1 });
    console.log('\nAll document types:');
    allDocTypes.forEach(dt => {
      console.log(`- ${dt.type}: ${dt.name} (${dt.category})`);
    });

  } catch (error) {
    console.error('Error adding seller document types:', error);
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await addSellerDocumentTypes();
  await mongoose.disconnect();
  console.log('Script completed');
  process.exit(0);
};

run(); 