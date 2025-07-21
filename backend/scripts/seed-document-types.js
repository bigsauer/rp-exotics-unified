const mongoose = require('mongoose');
const DocumentType = require('../models/DocumentType');
require('dotenv').config();

const documentTypes = [
  {
    type: 'title',
    name: 'Vehicle Title',
    description: 'Original vehicle title or certificate of title',
    required: true,
    category: 'legal',
    allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    maxFileSize: 10 * 1024 * 1024,
    expirationDays: 365,
    order: 1
  },
  {
    type: 'contract',
    name: 'Purchase Contract',
    description: 'Signed purchase agreement or bill of sale',
    required: true,
    category: 'legal',
    allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    maxFileSize: 10 * 1024 * 1024,
    expirationDays: 365,
    order: 2
  },
  {
    type: 'driversLicense',
    name: 'Driver\'s License',
    description: 'Valid driver\'s license of the seller',
    required: true,
    category: 'identification',
    allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    maxFileSize: 5 * 1024 * 1024,
    expirationDays: 365,
    order: 3
  },
  {
    type: 'dealerLicense',
    name: 'Dealer License',
    description: 'Dealer license if selling as a business',
    required: false,
    category: 'identification',
    allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    maxFileSize: 5 * 1024 * 1024,
    expirationDays: 365,
    order: 4
  },
  {
    type: 'odometer',
    name: 'Odometer Statement',
    description: 'Odometer disclosure statement',
    required: true,
    category: 'vehicle',
    allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    maxFileSize: 5 * 1024 * 1024,
    expirationDays: 365,
    order: 5
  },
  {
    type: 'insurance',
    name: 'Insurance Card',
    description: 'Current insurance card or policy',
    required: false,
    category: 'vehicle',
    allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    maxFileSize: 5 * 1024 * 1024,
    expirationDays: 365,
    order: 6
  },
  {
    type: 'inspection',
    name: 'Inspection Report',
    description: 'Vehicle inspection report or photos',
    required: false,
    category: 'vehicle',
    allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    maxFileSize: 10 * 1024 * 1024,
    expirationDays: 365,
    order: 7
  },
  {
    type: 'payoff',
    name: 'Payoff Letter',
    description: 'Lien payoff letter or statement',
    required: false,
    category: 'financial',
    allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    maxFileSize: 5 * 1024 * 1024,
    expirationDays: 30,
    order: 8
  },
  {
    type: 'registration',
    name: 'Vehicle Registration',
    description: 'Current vehicle registration',
    required: false,
    category: 'vehicle',
    allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    maxFileSize: 5 * 1024 * 1024,
    expirationDays: 365,
    order: 9
  },
  {
    type: 'vin',
    name: 'VIN Photos',
    description: 'Photos of VIN plate and door jamb',
    required: true,
    category: 'vehicle',
    allowedFileTypes: ['jpg', 'jpeg', 'png'],
    maxFileSize: 10 * 1024 * 1024,
    expirationDays: 365,
    order: 10
  },
  {
    type: 'keys',
    name: 'Keys Photo',
    description: 'Photo of vehicle keys',
    required: false,
    category: 'vehicle',
    allowedFileTypes: ['jpg', 'jpeg', 'png'],
    maxFileSize: 5 * 1024 * 1024,
    expirationDays: 365,
    order: 11
  },
  {
    type: 'damage',
    name: 'Damage Photos',
    description: 'Photos of any damage or issues',
    required: false,
    category: 'vehicle',
    allowedFileTypes: ['jpg', 'jpeg', 'png'],
    maxFileSize: 10 * 1024 * 1024,
    expirationDays: 365,
    order: 12
  },
  {
    type: 'extra_doc',
    name: 'Extra Document',
    required: false,
    isActive: true,
    order: 99
  }
];

async function seedDocumentTypes() {
  try {
    console.log('🌱 Seeding document types...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/rp-exotics';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');

    // Clear existing document types
    await DocumentType.deleteMany({});
    console.log('🗑️  Cleared existing document types');

    // Insert new document types
    const insertedTypes = await DocumentType.insertMany(documentTypes);
    console.log(`✅ Inserted ${insertedTypes.length} document types`);

    // Display the inserted types
    console.log('\n📋 Document Types Created:');
    console.log('==========================');
    insertedTypes.forEach((docType, index) => {
      console.log(`${index + 1}. ${docType.name} (${docType.type})`);
      console.log(`   Category: ${docType.category}`);
      console.log(`   Required: ${docType.required ? 'Yes' : 'No'}`);
      console.log(`   File Types: ${docType.allowedFileTypes.join(', ')}`);
      console.log('');
    });

    console.log('🎉 Document types seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding document types:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedDocumentTypes(); 