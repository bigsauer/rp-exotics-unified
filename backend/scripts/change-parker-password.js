const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

async function updatePassword() {
  const email = 'parker@rpexotics.com';
  const newPassword = '17Hellcat!';

  try {
    console.log('🔗 Connecting to MongoDB...');
    console.log('📧 Updating password for:', email);
    console.log('🔑 New password:', newPassword);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    const user = await User.findOne({ email });
    if (!user) {
      console.error('❌ User not found:', email);
      process.exit(1);
    }
    
    console.log('👤 Found user:', user.email);
    
    const passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordHash = passwordHash;
    await user.save();
    
    console.log(`✅ Password for ${email} updated to '${newPassword}'`);
    console.log('🔄 You can now log in with the new password');
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating password:', err);
    console.log('🔧 Make sure your .env file has MONGODB_URI set correctly');
    process.exit(1);
  }
}

updatePassword(); 