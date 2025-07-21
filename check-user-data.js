const mongoose = require('mongoose');

async function checkUserData() {
  console.log('🔍 Checking User Data in Database\n');
  
  try {
    // Connect to MongoDB and wait for connection
    await mongoose.connect('mongodb+srv://brennan:TntHxw7NwHuHx817@rp-exotics-cluster.wtjzoiq.mongodb.net/?retryWrites=true&w=majority&appName=rp-exotics-cluster');
    console.log('✅ Connected to MongoDB');
    
    const User = require('./backend/models/User');
    const users = await User.find({});
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.firstName} ${user.lastName}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🎭 Role: ${user.role}`);
      console.log(`🔐 Permissions:`, user.permissions);
      console.log(`📝 Profile:`, user.profile);
      console.log('─'.repeat(50));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkUserData(); 