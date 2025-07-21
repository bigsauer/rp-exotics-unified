const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: String,
  permissions: Object,
  profile: Object,
  isActive: Boolean,
  emailVerified: Boolean,
  // Add any other fields as needed
});

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema); 