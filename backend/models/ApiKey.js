const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  // API Key Information
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Key Type and Permissions
  type: {
    type: String,
    enum: ['internal', 'customer', 'dealer', 'system'],
    default: 'internal'
  },
  permissions: {
    signAgreements: {
      type: Boolean,
      default: true
    },
    viewDocuments: {
      type: Boolean,
      default: true
    },
    createSignatures: {
      type: Boolean,
      default: true
    }
  },
  
  // Associated Entity
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entityType'
  },
  entityType: {
    type: String,
    enum: ['User', 'Dealer', 'Deal'],
    required: true
  },
  
  // Security
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  lastUsed: {
    type: Date,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0
  },
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
apiKeySchema.index({ key: 1, isActive: 1 });
apiKeySchema.index({ entityId: 1, entityType: 1 });
apiKeySchema.index({ expiresAt: 1 });

// Pre-save middleware to update timestamp
apiKeySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if key is valid
apiKeySchema.methods.isValid = function() {
  if (!this.isActive) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

// Method to increment usage
apiKeySchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Static method to generate new API key
apiKeySchema.statics.generateKey = function() {
  const crypto = require('crypto');
  return 'rpex_' + crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.model('ApiKey', apiKeySchema); 