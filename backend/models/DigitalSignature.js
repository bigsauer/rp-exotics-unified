const mongoose = require('mongoose');

const digitalSignatureSchema = new mongoose.Schema({
  // Document Information
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: false // Made optional to support documentUrl approach
  },
  documentUrl: {
    type: String,
    required: false // Added to support direct URL approach
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
  
  // Deal Information (for email templates)
  dealInfo: {
    vin: { type: String, default: 'N/A' },
    stockNumber: { type: String, default: 'N/A' },
    vehicle: { type: String, default: 'N/A' },
    dealType: { type: String, default: 'N/A' }
  },
  
  // LEGAL CONSENT REQUIREMENTS
  // Intent to Sign - User must clearly agree to sign electronically
  intentToSign: {
    type: Boolean,
    required: false,
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
    required: false,
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
    documentUrl: {
      type: String,
      required: false
    },
    documentType: {
      type: String,
      required: false
    },
    signaturePosition: {
      type: String,
      required: false
    },
    identityVerificationMethod: {
      type: String,
      enum: ['api_key', 'email_verification', 'manual', 'ip_address', 'user_agent', 'built_in_system'],
      default: 'api_key'
    },
    consentGiven: {
      type: Boolean,
      default: false
    },
    signerIdentityVerified: {
      type: Boolean,
      default: false
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
  
  // Audit Trail
  auditTrail: {
    signatureTimestamp: {
      type: Date,
      required: false
    },
    ipAddress: {
      type: String,
      required: false
    },
    userAgent: {
      type: String,
      required: false
    },
    screenResolution: {
      type: String,
      required: false
    },
    timezone: {
      type: String,
      required: false
    },
    language: {
      type: String,
      required: false
    },
    sessionId: {
      type: String,
      required: false
    },
    consentTimestamp: {
      type: Date,
      required: false
    },
    consentMethod: {
      type: String,
      required: false
    }
  },
  
  // Legal Compliance
  legalCompliance: {
    esignActCompliant: {
      type: Boolean,
      default: false
    },
    uetaCompliant: {
      type: Boolean,
      default: false
    },
    intentToSign: {
      type: Boolean,
      default: false
    },
    consentToElectronicBusiness: {
      type: Boolean,
      default: false
    },
    clearSignatureAssociation: {
      type: Boolean,
      default: false
    },
    auditTrailComplete: {
      type: Boolean,
      default: false
    },
    documentIntegrityMaintained: {
      type: Boolean,
      default: false
    },
    retentionPolicyCompliant: {
      type: Boolean,
      default: false
    },
    signerIdentityVerified: {
      type: Boolean,
      default: false
    }
  },
  
  // Signature Data
  signatureData: {
    timestamp: {
      type: Date,
      required: false
    },
    coordinates: {
      x: Number,
      y: Number,
      page: Number
    },
    imageSignature: {
      type: String, // Base64 encoded signature image
      required: false
    },
    typedSignature: {
      type: String, // For typed signatures
      required: false
    },
    signatureFont: {
      type: String, // Font family for typed signatures
      required: false
    },
    signatureMethod: {
      type: String,
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
digitalSignatureSchema.index({ documentUrl: 1, documentType: 1 });
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
  const documentId = this.documentId || this.documentUrl || 'unknown';
  const signerId = this.signerId || this.signerEmail || 'unknown';
  const timestamp = this.signatureData?.timestamp || this.auditTrail?.signatureTimestamp || new Date();
  const signatureData = this.signatureData?.imageSignature || this.signatureData?.typedSignature || 'unknown';
  const intentToSign = this.intentToSign || this.legalCompliance?.intentToSign || false;
  const consentToElectronicBusiness = this.consentToElectronicBusiness || this.legalCompliance?.consentToElectronicBusiness || false;
  
  const data = `${documentId}-${signerId}-${timestamp}-${signatureData}-${intentToSign}-${consentToElectronicBusiness}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Method to verify signature
digitalSignatureSchema.methods.verifySignature = function() {
  const expectedHash = this.generateHash();
  return this.signatureHash === expectedHash;
};

// Method to verify legal compliance
digitalSignatureSchema.methods.verifyLegalCompliance = function() {
  const intentToSign = this.intentToSign || this.legalCompliance?.intentToSign || false;
  const consentToElectronicBusiness = this.consentToElectronicBusiness || this.legalCompliance?.consentToElectronicBusiness || false;
  const signatureAssociation = this.signatureAssociation?.signerIdentityVerified || this.legalCompliance?.signerIdentityVerified || false;
  const documentIntegrity = this.verifySignature();
  const auditTrailComplete = this.auditTrail?.signatureTimestamp && this.auditTrail?.ipAddress;
  
  // ESIGN Act compliance requirements
  const esignActCompliant = intentToSign && 
                           consentToElectronicBusiness && 
                           auditTrailComplete && 
                           this.auditTrail?.signatureTimestamp;
  
  // UETA compliance requirements (similar to ESIGN Act)
  const uetaCompliant = intentToSign && 
                       consentToElectronicBusiness && 
                       auditTrailComplete;
  
  return {
    intentToSign,
    consentToElectronicBusiness,
    signatureAssociation,
    documentIntegrity,
    auditTrailComplete,
    esignActCompliant,
    uetaCompliant,
    overallCompliance: intentToSign && consentToElectronicBusiness && signatureAssociation && documentIntegrity && auditTrailComplete,
    complianceScore: [intentToSign, consentToElectronicBusiness, signatureAssociation, documentIntegrity, auditTrailComplete].filter(Boolean).length / 5 * 100
  };
};

// Static method to generate signature ID
digitalSignatureSchema.statics.generateSignatureId = function() {
  const crypto = require('crypto');
  return 'sig_' + crypto.randomBytes(16).toString('hex');
};

module.exports = mongoose.model('DigitalSignature', digitalSignatureSchema); 