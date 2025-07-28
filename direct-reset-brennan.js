const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://brennan:OfSbbMXTdY2WxTFi@rp-exotics-cluster.wtjzoiq.mongodb.net/rp_exotics?retryWrites=true&w=majority&appName=rp-exotics-cluster';

async function resetBrennanPassword() {
  console.log('🔧 Directly resetting Brennan password...\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database');

    // Hash the new password
    const newPassword = 'brennan123';
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update Brennan's password
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      passwordHash: String,
      firstName: String,
      lastName: String,
      role: String,
      isActive: Boolean
    }));

    const result = await User.updateOne(
      { email: 'brennan@rpexotics.com' },
      { passwordHash: passwordHash }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Brennan password updated successfully');
      console.log('📧 Email: brennan@rpexotics.com');
      console.log('🔑 Password: brennan123');
    } else {
      console.log('❌ No user found with email brennan@rpexotics.com');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from database');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetBrennanPassword(); 