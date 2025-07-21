const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rp_exotics';

async function setupDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔧 Setting up RP Exotics Database...\n');
    
    await client.connect();
    const db = client.db();
    
    // Create collections if they don't exist
    const collections = ['users', 'dealers', 'deals'];
    
    for (const collectionName of collections) {
      const collectionExists = await db.listCollections({ name: collectionName }).hasNext();
      if (!collectionExists) {
        await db.createCollection(collectionName);
        console.log(`✅ Created collection: ${collectionName}`);
      } else {
        console.log(`ℹ️  Collection already exists: ${collectionName}`);
      }
    }
    
    // Create indexes
    console.log('\n📊 Creating database indexes...');
    
    // Users collection indexes
    await db.collection('users').createIndex({ "email": 1 }, { unique: true });
    await db.collection('users').createIndex({ "username": 1 }, { unique: true });
    await db.collection('users').createIndex({ "role": 1 });
    console.log('✅ Users indexes created');
    
    // Dealers collection indexes
    await db.collection('dealers').createIndex({ "name": "text" });
    await db.collection('dealers').createIndex({ "contact.phone": 1 });
    console.log('✅ Dealers indexes created');
    
    // Deals collection indexes
    await db.collection('deals').createIndex({ "vin": 1 });
    await db.collection('deals').createIndex({ "stockNumber": 1 });
    await db.collection('deals').createIndex({ "vehicle.make": 1, "vehicle.model": 1 });
    console.log('✅ Deals indexes created');
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Run the test suite: node test-auth.js');
    console.log('3. Create your first admin user through the API');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    await client.close();
  }
}

// Run setup
setupDatabase(); 