const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { 
    type: String, 
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: String,
  role: String,
  permissions: Object,
  profile: Object,
  isActive: Boolean,
  emailVerified: Boolean,
  // Add any other fields as needed
});

// Create case-insensitive index on email
userSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// Pre-save middleware to ensure email is lowercase
userSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema); 