// This script checks users in the database using the same connection as the main app
const { MongoClient } = require('mongodb');

// Use the same connection string as the main app
const MONGODB_URI = 'mongodb+srv://rp_exotics:rp_exotics_2025@cluster0.mongodb.net/test?retryWrites=true&w=majority';

async function checkUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('test');
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`\n📊 Found ${users.length} users in database:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });
    
    // Check for the specific user ID from the logs
    const specificUser = await db.collection('users').findOne({ 
      _id: { $eq: '6872bc7baf3b59356684c273' } 
    });
    
    if (specificUser) {
      console.log('✅ Found the specific user from logs:');
      console.log(`   ID: ${specificUser._id}`);
      console.log(`   Email: ${specificUser.email}`);
      console.log(`   Role: ${specificUser.role}`);
      console.log(`   Active: ${specificUser.isActive}`);
    } else {
      console.log('❌ User with ID 6872bc7baf3b59356684c273 not found');
      
      // Try to find by ObjectId
      const { ObjectId } = require('mongodb');
      try {
        const userByObjectId = await db.collection('users').findOne({ 
          _id: new ObjectId('6872bc7baf3b59356684c273') 
        });
        
        if (userByObjectId) {
          console.log('✅ Found user when using ObjectId:');
          console.log(`   ID: ${userByObjectId._id}`);
          console.log(`   Email: ${userByObjectId.email}`);
          console.log(`   Role: ${userByObjectId.role}`);
          console.log(`   Active: ${userByObjectId.isActive}`);
        } else {
          console.log('❌ User not found even with ObjectId conversion');
        }
      } catch (error) {
        console.log('❌ Error converting to ObjectId:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkUsers(); 