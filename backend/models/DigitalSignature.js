const mongoose = require('mongoose');

const digitalSignatureSchema = new mongoose.Schema({
  // Document Information
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: true
  },
  documentType: {
    type: String,
    required: true,
    enum: ['purchase_agreement', 'bill_of_sale', 'wholesale_purchase_order', 'wholesale_pp_buy', 'wholesale_bos', 'retail_pp_buy', 'vehicle_record_pdf', 'vehicle_record', 'wholesale_purchase_agreement']
  },
  documentVersion: {
    type: Number,
    default: 1
  },
  
  // Signature Information
  signatureId: {
    type: String,
    required: true,
    unique: true
  },
  signatureHash: {
    type: String,
    required: false
  },
  
  // Signer Information
  signerType: {
    type: String,
    enum: ['internal', 'customer', 'dealer', 'finance', 'client'],
    required: true
  },
  signerId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'signerModel',
    required: false // Optional for built-in system
  },
  signerModel: {
    type: String,
    enum: ['User', 'Dealer'],
    required: false // Optional for built-in system
  },
  signerName: {
    type: String,
    required: true
  },
  signerEmail: {
    type: String,
    required: true
  },
  
  // LEGAL CONSENT REQUIREMENTS
  // Intent to Sign - User must clearly agree to sign electronically
  intentToSign: {
    type: Boolean,
    required: true,
    default: false
  },
  intentToSignTimestamp: {
    type: Date,
    required: false
  },
  intentToSignIpAddress: {
    type: String,
    required: false
  },
  intentToSignUserAgent: {
    type: String,
    required: false
  },
  
  // Consent to Do Business Electronically - Must be recorded with timestamp
  consentToElectronicBusiness: {
    type: Boolean,
    required: true,
    default: false
  },
  consentToElectronicBusinessTimestamp: {
    type: Date,
    required: false
  },
  consentToElectronicBusinessIpAddress: {
    type: String,
    required: false
  },
  consentToElectronicBusinessUserAgent: {
    type: String,
    required: false
  },
  
  // Clear Signature Association - Enhanced tracking
  signatureAssociation: {
    documentHash: {
      type: String,
      required: false
    },
    signerIdentityVerified: {
      type: Boolean,
      default: false
    },
    identityVerificationMethod: {
      type: String,
      enum: ['api_key', 'email_verification', 'manual', 'ip_address', 'user_agent', 'built_in_system'],
      default: 'api_key'
    },
    identityVerificationTimestamp: {
      type: Date,
      required: false
    }
  },
  
  // Signature Details
  signatureMethod: {
    type: String,
    enum: ['api_key', 'email_verification', 'manual', 'built_in', 'email_invitation'],
    default: 'api_key'
  },
  apiKeyUsed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiKey'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  
  // Signature Data
  signatureData: {
    timestamp: {
      type: Date,
      required: true
    },
    coordinates: {
      x: Number,
      y: Number,
      page: Number
    },
    signatureImage: {
      type: String, // Base64 encoded signature image
      required: false
    },
    typedSignature: {
      type: String, // For typed signatures
      required: false
    },
    // Document Integrity - Hash of the signed document
    documentHash: {
      type: String,
      required: false
    },
    // Document tamper-evident features
    documentIntegrity: {
      isFlattened: {
        type: Boolean,
        default: false
      },
      watermark: {
        type: String,
        default: 'SIGNED'
      },
      signedTimestamp: {
        type: Date,
        required: false
      },
      originalDocumentUrl: {
        type: String,
        required: false
      },
      signedDocumentUrl: {
        type: String,
        required: false
      }
    }
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: true
  },
  verificationMethod: {
    type: String,
    enum: ['api_key', 'email', 'manual'],
    default: 'api_key'
  },
  verifiedAt: {
    type: Date,
    default: Date.now
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'consent_given', 'signed', 'verified', 'expired', 'revoked', 'completed'],
    default: 'pending'
  },
  
  // Audit
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
digitalSignatureSchema.index({ documentId: 1, documentType: 1 });
digitalSignatureSchema.index({ signerId: 1, signerType: 1 });
digitalSignatureSchema.index({ signatureId: 1 });
digitalSignatureSchema.index({ status: 1 });
digitalSignatureSchema.index({ createdAt: 1 });
digitalSignatureSchema.index({ intentToSign: 1 });
digitalSignatureSchema.index({ consentToElectronicBusiness: 1 });

// Pre-save middleware to update timestamp
digitalSignatureSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to generate signature hash
digitalSignatureSchema.methods.generateHash = function() {
  const crypto = require('crypto');
  const data = `${this.documentId}-${this.signerId}-${this.signatureData.timestamp}-${this.signatureData.signatureImage || this.signatureData.typedSignature}-${this.intentToSign}-${this.consentToElectronicBusiness}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Method to verify signature
digitalSignatureSchema.methods.verifySignature = function() {
  const expectedHash = this.generateHash();
  return this.signatureHash === expectedHash;
};

// Method to verify legal compliance
digitalSignatureSchema.methods.verifyLegalCompliance = function() {
  return {
    intentToSign: this.intentToSign,
    consentToElectronicBusiness: this.consentToElectronicBusiness,
    signatureAssociation: this.signatureAssociation.signerIdentityVerified,
    documentIntegrity: this.verifySignature(),
    isCompliant: this.intentToSign && this.consentToElectronicBusiness && this.signatureAssociation.signerIdentityVerified && this.verifySignature()
  };
};

// Static method to generate signature ID
digitalSignatureSchema.statics.generateSignatureId = function() {
  const crypto = require('crypto');
  return 'sig_' + crypto.randomBytes(16).toString('hex');
};

module.exports = mongoose.model('DigitalSignature', digitalSignatureSchema); 