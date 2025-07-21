const mongoose = require('mongoose');
require('dotenv').config();

async function fixDatabaseIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rp-exotics');
    console.log('✅ Connected to MongoDB');

    // Get the deals collection
    const db = mongoose.connection.db;
    const dealsCollection = db.collection('deals');

    // Drop the problematic unique index on rpStockNumber
    try {
      await dealsCollection.dropIndex('rpStockNumber_1');
      console.log('✅ Dropped unique index on rpStockNumber');
    } catch (error) {
      console.log('ℹ️  rpStockNumber index already dropped or doesn\'t exist');
    }

    // Drop the unique index on shortId if it exists
    try {
      await dealsCollection.dropIndex('shortId_1');
      console.log('✅ Dropped unique index on shortId');
    } catch (error) {
      console.log('ℹ️  shortId index already dropped or doesn\'t exist');
    }

    // Drop the unique index on dealId if it exists
    try {
      await dealsCollection.dropIndex('dealId_1');
      console.log('✅ Dropped unique index on dealId');
    } catch (error) {
      console.log('ℹ️  dealId index already dropped or doesn\'t exist');
    }

    // Create a new non-unique index on rpStockNumber
    await dealsCollection.createIndex({ rpStockNumber: 1 });
    console.log('✅ Created non-unique index on rpStockNumber');

    // Create a new unique index on dealId
    await dealsCollection.createIndex({ dealId: 1 }, { unique: true, sparse: true });
    console.log('✅ Created unique sparse index on dealId');

    // Also fix the users collection username index
    const usersCollection = db.collection('users');
    try {
      await usersCollection.dropIndex('username_1');
      console.log('✅ Dropped unique index on username');
    } catch (error) {
      console.log('ℹ️  username index already dropped or doesn\'t exist');
    }

    // Create a new sparse unique index on username
    await usersCollection.createIndex({ username: 1 }, { unique: true, sparse: true });
    console.log('✅ Created unique sparse index on username');

    console.log('✅ Database indexes fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing database indexes:', error);
    process.exit(1);
  }
}

fixDatabaseIndexes(); 