const mongoose = require('mongoose');

const dealerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['Dealer', 'Private Seller', 'Auction', 'Wholesaler'],
    default: 'Dealer'
  },
  contact: {
    person: String,
    address: {
      street: String,
      city: String,
      state: String,
      zip: String
    },
    phone: String,
    email: {
      type: String,
      lowercase: true
    },
    location: String // City, State
  },
  licenseNumber: {
    type: String,
    trim: true
  },
  tier: {
    type: String,
    enum: ['Tier 1', 'Tier 2'],
    default: 'Tier 1'
  },
  performance: {
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalDeals: {
      type: Number,
      default: 0
    },
    totalVolume: {
      type: Number,
      default: 0
    },
    avgDealSize: {
      type: Number,
      default: 0
    },
    responseTime: {
      type: String,
      default: 'N/A'
    },
    successRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Pending'],
    default: 'Active'
  },
  specialties: [{
    type: String,
    trim: true
  }],
  notes: String,
  recentDeals: [{
    vehicle: String,
    amount: Number,
    date: Date,
    status: {
      type: String,
      enum: ['Completed', 'Pending', 'Cancelled'],
      default: 'Completed'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Text index for search
dealerSchema.index({ 
  name: 'text', 
  company: 'text',
  'contact.email': 'text',
  'contact.location': 'text',
  specialties: 'text'
});

// Virtual for last deal date
dealerSchema.virtual('lastDeal').get(function() {
  if (this.recentDeals && this.recentDeals.length > 0) {
    const lastDeal = this.recentDeals.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    return lastDeal.date ? new Date(lastDeal.date).toLocaleDateString() : 'N/A';
  }
  return 'N/A';
});

// Ensure virtuals are serialized
dealerSchema.set('toJSON', { virtuals: true });
dealerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Dealer', dealerSchema); 