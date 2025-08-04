const mongoose = require('mongoose');

const brokerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'USA'
    }
  },
  specialties: [{
    type: String,
    enum: ['Exotic', 'Luxury', 'Classic', 'Muscle', 'Import', 'Domestic', 'SUV', 'Sports Car', 'Sedan', 'Other']
  }],
  commissionRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Pending'],
    default: 'Active'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastContact: {
    type: Date,
    default: Date.now
  },
  totalDeals: {
    type: Number,
    default: 0
  },
  totalVolume: {
    type: Number,
    default: 0
  },
  monthlyCommissions: [{
    month: {
      type: String, // Format: "YYYY-MM" (e.g., "2024-01")
      required: true
    },
    amount: {
      type: Number,
      default: 0
    },
    dealCount: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
brokerSchema.index({ email: 1 });
brokerSchema.index({ status: 1 });
brokerSchema.index({ createdBy: 1 });
brokerSchema.index({ specialties: 1 });

module.exports = mongoose.model('Broker', brokerSchema); 