const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabases() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const client = mongoose.connection.client;
    
    // List all databases
    const adminDb = client.db('admin');
    const databases = await adminDb.admin().listDatabases();
    
    console.log('\n📊 Available Databases:');
    databases.databases.forEach(db => {
      console.log(`   - ${db.name} (${db.sizeOnDisk} bytes)`);
    });

    // Check rp_exotics database
    console.log('\n🔍 Checking rp_exotics database:');
    try {
      const rpExoticsDb = client.db('rp_exotics');
      const collections = await rpExoticsDb.listCollections().toArray();
      console.log('   Collections in rp_exotics:');
      collections.forEach(col => {
        console.log(`     - ${col.name}`);
      });

      // Check users collection
      const usersCollection = rpExoticsDb.collection('users');
      const userCount = await usersCollection.countDocuments();
      console.log(`   Users in rp_exotics.users: ${userCount}`);

      if (userCount > 0) {
        const sampleUser = await usersCollection.findOne({});
        console.log('   Sample user permissions structure:');
        console.log(JSON.stringify(sampleUser.permissions, null, 2));
      }
    } catch (error) {
      console.log('   ❌ Error accessing rp_exotics database:', error.message);
    }

    // Check test database
    console.log('\n🔍 Checking test database:');
    try {
      const testDb = client.db('test');
      const collections = await testDb.listCollections().toArray();
      console.log('   Collections in test:');
      collections.forEach(col => {
        console.log(`     - ${col.name}`);
      });

      // Check users collection
      const usersCollection = testDb.collection('users');
      const userCount = await usersCollection.countDocuments();
      console.log(`   Users in test.users: ${userCount}`);

      if (userCount > 0) {
        const sampleUser = await usersCollection.findOne({});
        console.log('   Sample user permissions structure:');
        console.log(JSON.stringify(sampleUser.permissions, null, 2));
      }
    } catch (error) {
      console.log('   ❌ Error accessing test database:', error.message);
    }

  } catch (error) {
    console.error('❌ Error checking databases:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkDatabases(); 