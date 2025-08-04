const mongoose = require('mongoose');

const vehicleRecordSchema = new mongoose.Schema({
  // Unique identifier for the vehicle record
  recordId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Vehicle Information
  vin: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  trim: String,
  color: String,
  exteriorColor: String,
  interiorColor: String,
  mileage: Number,
  stockNumber: {
    type: String,
    trim: true
  },
  salesperson: {
    type: String,
    required: true
  },
  
  // Deal Information
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: true
  },
  dealType: {
    type: String,
    enum: [
      'wholesale',
      'wholesale-d2d',
      'wholesale-pp',
      'wholesale-flip',
      'retail',
      'retail-pp',
      'retail-d2d',
      'consignment',
      'auction'
    ],
    required: true
  },
  dealType2: {
    type: String,
    enum: ['Buy', 'Sale', 'sale', 'Buy/Sell', 'buy-sell', 'Consign-A', 'Consign-B', 'Consign-C', 'Consign-RDNC'],
    required: true
  },
  
  // Document Information
  generatedDocuments: [{
    documentType: {
      type: String,
      enum: ['purchase_agreement', 'bill_of_sale', 'wholesale_purchase_order', 'wholesale_pp_buy', 'wholesale_bos', 'retail_pp_buy', 'vehicle_record_pdf', 'vehicle_record', 'wholesale_purchase_agreement'],
      required: true
    },
    fileName: String,
    filePath: String,
    fileSize: Number,
    generatedAt: {
      type: Date,
      default: Date.now
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    documentNumber: String,
    status: {
      type: String,
      enum: ['draft', 'sent_to_finance', 'approved', 'rejected'],
      default: 'draft'
    },
    sentToFinanceAt: Date,
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  
  // Financial Information
  purchasePrice: Number,
  listPrice: Number,
  salePrice: Number,
  wholesalePrice: Number,
  killPrice: Number,
  commission: {
    rate: Number,
    amount: Number
  },
  brokerFee: Number,
  brokerFeePaidTo: String,
  payoffBalance: Number,
  amountDueToCustomer: Number,
  amountDueToRP: Number,
  
  // Seller Information
  seller: {
    name: String,
    type: {
      type: String,
      enum: ['private', 'dealer'],
      default: 'private'
    },
    contact: {
      address: {
        street: String,
        city: String,
        state: String,
        zip: String
      },
      phone: String,
      email: String
    },
    licenseNumber: String,
    tier: {
      type: String,
      enum: ['Tier 1', 'Tier 2', 'Tier 3'], // Tier 1: Pay Upon Title, Tier 2: Pay Prior to Release
      default: 'Tier 1'
    }
  },
  
  // Buyer Information (for buy/sell deals)
  buyer: {
    name: String,
    type: {
      type: String,
      enum: ['private', 'dealer'],
      default: 'private'
    },
    contact: {
      address: {
        street: String,
        city: String,
        state: String,
        zip: String
      },
      phone: String,
      email: String
    },
    licenseNumber: String,
    tier: {
      type: String,
      enum: ['Tier 1', 'Tier 2', 'Tier 3'], // Tier 1: Pay Upon Title, Tier 2: Pay Prior to Release
      default: 'Tier 1'
    }
  },
  
  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['check', 'wire', 'cash', 'financing'],
    default: 'check'
  },
  paymentTerms: String,
  fundingSource: String,
  
  // Additional Information
  vehicleDescription: String,
  generalNotes: String,
  rpStockNumber: String,
  
  // Status
  status: {
    type: String,
    enum: ['active', 'pending', 'completed', 'cancelled'],
    default: 'active'
  },
  
  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
vehicleRecordSchema.index({ recordId: 1 });
vehicleRecordSchema.index({ vin: 1 });
vehicleRecordSchema.index({ stockNumber: 1 });
vehicleRecordSchema.index({ dealId: 1 });
vehicleRecordSchema.index({ status: 1 });
vehicleRecordSchema.index({ 'generatedDocuments.status': 1 });

// Virtual for latest document
vehicleRecordSchema.virtual('latestDocument').get(function() {
  if (this.generatedDocuments.length === 0) return null;
  return this.generatedDocuments[this.generatedDocuments.length - 1];
});

// Virtual for pending finance review
vehicleRecordSchema.virtual('pendingFinanceReview').get(function() {
  return this.generatedDocuments.filter(doc => doc.status === 'sent_to_finance');
});

// Ensure virtuals are serialized
vehicleRecordSchema.set('toJSON', { virtuals: true });
vehicleRecordSchema.set('toObject', { virtuals: true });

// Pre-save middleware to generate recordId if not present
vehicleRecordSchema.pre('save', function(next) {
  console.log(`[VehicleRecord Model] 🔄 Pre-save middleware triggered for vehicle record`);
  console.log(`[VehicleRecord Model] 📋 Current recordId: ${this.recordId}`);
  console.log(`[VehicleRecord Model] 📊 Vehicle details:`, {
    vin: this.vin,
    year: this.year,
    make: this.make,
    model: this.model,
    color: this.color,
    exteriorColor: this.exteriorColor,
    interiorColor: this.interiorColor,
    mileage: this.mileage,
    dealId: this.dealId,
    dealType: this.dealType,
    dealType2: this.dealType2,
    isNew: this.isNew
  });
  
  if (!this.recordId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.recordId = `VR-${timestamp}-${random}`.toUpperCase();
    console.log(`[VehicleRecord Model] 🆔 Generated new recordId: ${this.recordId}`);
  }
  next();
});

// Pre-validate middleware to ensure recordId is set
vehicleRecordSchema.pre('validate', function(next) {
  console.log(`[VehicleRecord Model] ✅ Pre-validate middleware triggered for vehicle record`);
  console.log(`[VehicleRecord Model] 📋 Current recordId: ${this.recordId}`);
  
  if (!this.recordId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.recordId = `VR-${timestamp}-${random}`.toUpperCase();
    console.log(`[VehicleRecord Model] 🆔 Generated recordId in validate: ${this.recordId}`);
  }
  next();
});

module.exports = mongoose.model('VehicleRecord', vehicleRecordSchema); 