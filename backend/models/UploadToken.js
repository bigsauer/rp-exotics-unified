const mongoose = require('mongoose');

const uploadTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'dealModel'
  },
  dealModel: {
    type: String,
    required: true,
    enum: ['Deal', 'SalesDeal']
  },
  sellerEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  vehicleInfo: {
    type: String,
    required: true
  },
  vin: {
    type: String,
    required: true,
    uppercase: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7 * 24 * 60 * 60 // Automatically delete after 7 days
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  uploadAttempts: {
    type: Number,
    default: 0
  },
  maxUploadAttempts: {
    type: Number,
    default: 3
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
uploadTokenSchema.index({ token: 1, isActive: 1 });
uploadTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if token is valid
uploadTokenSchema.methods.isValid = function() {
  return this.isActive && 
         this.uploadAttempts < this.maxUploadAttempts && 
         new Date() < this.expiresAt;
};

// Method to increment upload attempts
uploadTokenSchema.methods.incrementAttempts = function() {
  this.uploadAttempts += 1;
  this.lastUsed = new Date();
  if (this.uploadAttempts >= this.maxUploadAttempts) {
    this.isActive = false;
  }
  return this.save();
};

// Static method to find valid token
uploadTokenSchema.statics.findValidToken = function(token) {
  return this.findOne({
    token,
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

module.exports = mongoose.model('UploadToken', uploadTokenSchema); 