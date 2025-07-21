const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...');
  console.log('Connection string:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
  
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    const db = client.db('rp_exotics');
    const collections = await db.listCollections().toArray();
    console.log('📊 Available collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error name:', error.name);
  } finally {
    await client.close();
  }
}

testConnection(); 