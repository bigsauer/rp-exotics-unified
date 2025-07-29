const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  // Basic Deal Information
  vehicle: {
    type: String,
    required: true,
    trim: true
  },
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
  rpStockNumber: {
    type: String,
    required: false,
    trim: true
  },
  salesperson: {
    type: String,
    required: true
  },

  // Purchase Information
  purchasePrice: {
    type: Number,
    required: true
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  listPrice: {
    type: Number,
    required: true
  },
  killPrice: {
    type: Number
  },
  wholesalePrice: {
    type: Number
  },
  // Vehicle Color and Mileage
  color: { type: String },
  exteriorColor: { type: String },
  interiorColor: { type: String },
  mileage: { type: Number },

  // Seller Information
  seller: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['dealer', 'private', 'auction'],
      default: 'dealer'
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
    },
    company: String,
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dealer'
    }
  },

  // Buyer Information (for wholesale deals)
  buyer: {
    name: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['dealer', 'private', 'auction'],
      default: 'dealer'
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
    },
    company: String,
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dealer'
    }
  },

  // Deal Classification
  dealType: {
    type: String,
    enum: ['wholesale', 'wholesale-d2d', 'wholesale-pp', 'wholesale-flip', 'retail', 'retail-pp', 'consignment', 'auction'],
    default: 'retail'
  },
  dealType2SubType: {
    type: String,
    enum: ['buy', 'sale', 'buy-sell'],
    default: 'buy'
  },
  fundingSource: String,
  paymentMethod: {
    type: String,
    enum: ['check', 'wire', 'cash', 'financing'],
    default: 'check'
  },
  paymentTerms: String,

  // Back Office Workflow
  currentStage: {
    type: String,
    enum: [
      'contract-received',
      'docs-signed',
      'title-processing',
      'funds-disbursed',
      'title-received',
      'deal-complete'
    ],
    default: 'contract-received'
  },
  priority: {
    type: String,
    enum: ['urgent', 'high', 'medium', 'normal', 'low'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Document Tracking
  documents: [{
    type: {
      type: String,
      required: true
    },
    documentId: {
      type: String,
      required: false
    },
    fileName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploaded: {
      type: Boolean,
      default: false
    },
    uploadedAt: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approved: {
      type: Boolean,
      default: false
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    required: {
      type: Boolean,
      default: true
    },
    notes: String,
    expirationDate: Date,
    version: {
      type: Number,
      default: 1
    }
  }],

  // Title Information
  titleInfo: {
    status: {
      type: String,
      enum: ['clean', 'lien', 'salvage', 'flood', 'pending'],
      default: 'pending'
    },
    state: String,
    titleNumber: String,
    lienHolder: String,
    lienAmount: Number,
    titleReceived: {
      type: Boolean,
      default: false
    },
    titleReceivedDate: Date,
    titleNotes: String,
    lienStatus: {
      type: String,
      enum: ['none', 'lien_on_title', 'payoff_requested', 'payoff_received', 'lien_release_pending', 'lien_released', 'other'],
      default: 'none'
    },
    lienEta: Date
  },

  // Financial Status
  financial: {
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial'],
      default: 'pending'
    },
    payoffBalance: Number,
    amountDueToCustomer: Number,
    amountDueToRP: Number,
    brokerFee: Number,
    brokerFeePaidTo: String,
    commissionRate: Number,
    commission: {
      rate: Number,
      amount: Number,
      paidTo: String
    }
  },
  
  // Additional Information
  vehicleDescription: String,
  generalNotes: String,

  // Compliance & Legal
  compliance: {
    contractSigned: {
      type: Boolean,
      default: false
    },
    contractDate: Date,
    driversLicenseVerified: {
      type: Boolean,
      default: false
    },
    odometerVerified: {
      type: Boolean,
      default: false
    },
    dealerLicenseVerified: {
      type: Boolean,
      default: false
    },
    insuranceVerified: {
      type: Boolean,
      default: false
    },
    inspectionCompleted: {
      type: Boolean,
      default: false
    },
    inspectionDate: Date
  },

  // Workflow History
  workflowHistory: [{
    stage: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: String,
    previousStage: String
  }],

  // Activity Log
  activityLog: [{
    action: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    description: String,
    metadata: mongoose.Schema.Types.Mixed
  }],

  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  vehicleRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VehicleRecord'
  },
  dealId: {
    type: String,
    unique: true,
    required: false,
    sparse: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
dealSchema.index({ vin: 1 });
dealSchema.index({ currentStage: 1 });
dealSchema.index({ assignedTo: 1 });
dealSchema.index({ purchaseDate: -1 });
dealSchema.index({ 'seller.name': 'text', vehicle: 'text' });

// Virtual for completion percentage
dealSchema.virtual('completionPercentage').get(function() {
  const docs = Array.isArray(this.documents) ? this.documents : [];
  const requiredDocuments = docs.filter(doc => doc.required);
  const approvedDocuments = requiredDocuments.filter(doc => doc.approved);
  
  if (requiredDocuments.length === 0) return 0;
  return Math.round((approvedDocuments.length / requiredDocuments.length) * 100);
});

// Virtual for pending documents count
dealSchema.virtual('pendingDocumentsCount').get(function() {
  const docs = Array.isArray(this.documents) ? this.documents : [];
  return docs.filter(doc => doc.required && !doc.approved).length;
});

// Virtual for overdue documents
dealSchema.virtual('overdueDocuments').get(function() {
  const docs = Array.isArray(this.documents) ? this.documents : [];
  const now = new Date();
  return docs.filter(doc => 
    doc.required && 
    !doc.approved && 
    doc.expirationDate && 
    doc.expirationDate < now
  );
});

// Ensure virtuals are serialized
dealSchema.set('toJSON', { virtuals: true });
dealSchema.set('toObject', { virtuals: true });

// Pre-save middleware to add workflow history and generate dealId
dealSchema.pre('save', async function(next) {
  try {
    // Generate dealId if not present
    if (!this.dealId) {
      // Find the highest existing dealId and increment it
      const lastDeal = await mongoose.models.Deal.findOne({ dealId: { $regex: /^D\d{4}$/ } })
        .sort({ dealId: -1 })
        .select('dealId')
        .lean();
      let newIdNum = 1;
      if (lastDeal && lastDeal.dealId) {
        const match = lastDeal.dealId.match(/^D(\d{4})$/);
        if (match) {
          newIdNum = parseInt(match[1], 10) + 1;
        }
      }
      const newId = `D${String(newIdNum).padStart(4, '0')}`; // D0001, D0002, etc.
      this.dealId = newId;
      console.log(`Generated dealId: ${newId}`);
    }
    // Add workflow history if stage changed
    if (this.isModified('currentStage')) {
      this.workflowHistory.push({
        stage: this.currentStage,
        timestamp: new Date(),
        changedBy: this.updatedBy || this.createdBy,
        notes: 'Stage updated',
        previousStage: this._original?.currentStage || 'initial'
      });
    }
    next();
  } catch (error) {
    console.error('Pre-save middleware error:', error);
    next(error);
  }
});

dealSchema.pre('validate', function(next) {
  const validStages = [
    'contract-received',
    'title-processing',
    'payment-approved',
    'funds-disbursed',
    'title-received',
    'deal-complete'
  ];
  if (!validStages.includes(this.currentStage)) {
    console.log('[MODEL DEBUG] Invalid currentStage detected, forcing to contract-received:', this.currentStage);
    this.currentStage = 'contract-received';
  } else {
    console.log('[MODEL DEBUG] currentStage before validate:', this.currentStage);
  }
  next();
});

module.exports = mongoose.model('Deal', dealSchema); 