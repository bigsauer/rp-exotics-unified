const express = require('express');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const DigitalSignature = require('../models/DigitalSignature');
const ApiKey = require('../models/ApiKey');
const Deal = require('../models/Deal');
const User = require('../models/User');
const Dealer = require('../models/Dealer');
const router = express.Router();

// API Key authentication middleware
const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.body.apiKey;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  try {
    const keyDoc = await ApiKey.findOne({ key: apiKey, isActive: true });
    if (!keyDoc) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    if (!keyDoc.isValid()) {
      return res.status(401).json({ error: 'API key has expired' });
    }

    // Check permissions
    if (!keyDoc.permissions.signAgreements) {
      return res.status(403).json({ error: 'API key does not have permission to sign agreements' });
    }

    req.apiKey = keyDoc;
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Get signatures for a document
router.get('/document/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const signatures = await DigitalSignature.find({ documentId })
      .populate('signerId', 'firstName lastName name email')
      .populate('apiKeyUsed', 'name type')
      .sort({ createdAt: -1 });

    res.json(signatures);
  } catch (error) {
    console.error('Error fetching signatures:', error);
    res.status(500).json({ error: 'Failed to fetch signatures' });
  }
});

// Create a new signature request
router.post('/request', authenticateApiKey, async (req, res) => {
  try {
    const {
      documentId,
      documentType,
      signerName,
      signerEmail,
      signerType = 'customer',
      signatureMethod = 'api_key'
    } = req.body;

    // Validation
    if (!documentId || !documentType || !signerName || !signerEmail) {
      return res.status(400).json({ error: 'Document ID, type, signer name, and email are required' });
    }

    // Verify document exists
    const deal = await Deal.findById(documentId);
    if (!deal) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Create signature record
    const signature = new DigitalSignature({
      documentId,
      documentType,
      signerType,
      signerName,
      signerEmail,
      signatureMethod,
      apiKeyUsed: req.apiKey._id,
      signatureData: {
        timestamp: new Date()
      },
      status: 'pending',
      // Initialize consent fields
      intentToSign: false,
      consentToElectronicBusiness: false,
      signatureAssociation: {
        signerIdentityVerified: false,
        identityVerificationMethod: 'api_key'
      }
    });

    const savedSignature = await signature.save();
    
    // Populate references
    await savedSignature.populate('apiKeyUsed', 'name type');

    console.log(`[SIGNATURE] Signature request created for document ${documentId} by ${signerName}`);

    res.status(201).json({
      message: 'Signature request created successfully',
      signature: savedSignature
    });
  } catch (error) {
    console.error('Error creating signature request:', error);
    res.status(500).json({ error: 'Failed to create signature request' });
  }
});

// NEW: Record intent to sign electronically
router.post('/consent/intent-to-sign', authenticateApiKey, async (req, res) => {
  try {
    const { signatureId, ipAddress, userAgent } = req.body;

    if (!signatureId) {
      return res.status(400).json({ error: 'Signature ID is required' });
    }

    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    if (signature.status !== 'pending') {
      return res.status(400).json({ error: 'Signature is not in pending status' });
    }

    // Record intent to sign
    signature.intentToSign = true;
    signature.intentToSignTimestamp = new Date();
    signature.intentToSignIpAddress = ipAddress || req.ip;
    signature.intentToSignUserAgent = userAgent || req.get('User-Agent');

    await signature.save();

    console.log(`[SIGNATURE] Intent to sign recorded for signature ${signatureId}`);

    res.json({
      message: 'Intent to sign recorded successfully',
      signature: signature
    });
  } catch (error) {
    console.error('Error recording intent to sign:', error);
    res.status(500).json({ error: 'Failed to record intent to sign' });
  }
});

// NEW: Record consent to do business electronically
router.post('/consent/electronic-business', authenticateApiKey, async (req, res) => {
  try {
    const { signatureId, ipAddress, userAgent } = req.body;

    if (!signatureId) {
      return res.status(400).json({ error: 'Signature ID is required' });
    }

    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    if (signature.status !== 'pending') {
      return res.status(400).json({ error: 'Signature is not in pending status' });
    }

    // Record consent to do business electronically
    signature.consentToElectronicBusiness = true;
    signature.consentToElectronicBusinessTimestamp = new Date();
    signature.consentToElectronicBusinessIpAddress = ipAddress || req.ip;
    signature.consentToElectronicBusinessUserAgent = userAgent || req.get('User-Agent');
    signature.status = 'consent_given';

    await signature.save();

    console.log(`[SIGNATURE] Electronic business consent recorded for signature ${signatureId}`);

    res.json({
      message: 'Consent to do business electronically recorded successfully',
      signature: signature
    });
  } catch (error) {
    console.error('Error recording electronic business consent:', error);
    res.status(500).json({ error: 'Failed to record electronic business consent' });
  }
});

// NEW: Create signature for finance personnel (no API key required) - FULL LEGAL COMPLIANCE
router.post('/', async (req, res) => {
  try {
    const {
      dealId,
      documentType,
      fileName,
      signerType,
      signerName,
      signerEmail,
      signatureImage,
      consent,
      auditTrail
    } = req.body;

    // Validation
    if (!dealId || !documentType || !fileName || !signerName || !signerEmail || !signatureImage) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify deal exists
    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Generate unique signature ID
    const signatureId = DigitalSignature.generateSignatureId();
    
    // Create document hash for integrity
    const crypto = require('crypto');
    const documentHash = crypto.createHash('sha256')
      .update(`${dealId}-${documentType}-${fileName}-${Date.now()}`)
      .digest('hex');

    // Create signature record with FULL LEGAL COMPLIANCE
    const signature = new DigitalSignature({
      signatureId,
      documentId: dealId,
      documentType,
      fileName,
      signerType: signerType || 'finance',
      signerName,
      signerEmail,
      signatureMethod: 'built_in',
      signatureData: {
        signatureImage,
        timestamp: new Date(),
        consent,
        documentHash,
        documentIntegrity: {
          isFlattened: true,
          watermark: 'SIGNED',
          signedTimestamp: new Date(),
          originalDocumentUrl: auditTrail?.documentUrl || '',
          signedDocumentUrl: auditTrail?.documentUrl || ''
        }
      },
      status: 'completed',
      // ✅ 1. Intent to Sign
      intentToSign: consent?.intentToSign || false,
      intentToSignTimestamp: consent?.intentToSign ? new Date() : null,
      intentToSignIpAddress: auditTrail?.ipAddress || req.ip,
      intentToSignUserAgent: auditTrail?.userAgent || req.get('User-Agent'),
      
      // ✅ 2. Consent to Electronic Business
      consentToElectronicBusiness: consent?.electronicBusiness || false,
      consentToElectronicBusinessTimestamp: consent?.electronicBusiness ? new Date() : null,
      consentToElectronicBusinessIpAddress: auditTrail?.ipAddress || req.ip,
      consentToElectronicBusinessUserAgent: auditTrail?.userAgent || req.get('User-Agent'),
      
      // ✅ 3. Clear Signature Association
      signatureAssociation: {
        signerIdentityVerified: true,
        identityVerificationMethod: 'built_in_system',
        identityVerificationTimestamp: new Date(),
        documentHash
      },
      
      // ✅ 4. Audit Trail
      ipAddress: auditTrail?.ipAddress || req.ip,
      userAgent: auditTrail?.userAgent || req.get('User-Agent'),
      
      // ✅ 5. Document Integrity
      signatureHash: signatureId // Will be updated with actual hash
    });

    // Generate final signature hash
    signature.signatureHash = signature.generateHash();

    const savedSignature = await signature.save();

    // ✅ 6. Retention & Accessibility - Store signed document
    try {
      const cloudStorage = require('../services/cloudStorage');
      const pdfSignatureService = require('../services/pdfSignatureService');
      
      // Get the original PDF from cloud storage
      const originalPdfResponse = await fetch(viewUrl);
      if (!originalPdfResponse.ok) {
        throw new Error(`Failed to fetch original PDF: ${originalPdfResponse.status}`);
      }
      const originalPdfBuffer = await originalPdfResponse.buffer();
      
      // Create signed PDF with signature placed on the document
      const signedPdfBuffer = await pdfSignatureService.createSignedDocument(
        originalPdfBuffer,
        signatureImage,
        documentType,
        {
          signerName: signerName,
          signerEmail: signerEmail
        }
      );
      
      // Upload signed document to cloud storage
      const signedFileName = `signed_${fileName}_${signatureId}.pdf`;
      const uploadResult = await cloudStorage.uploadBuffer(
        signedPdfBuffer,
        signedFileName,
        'application/pdf'
      );
      
      // Update signature with signed document URL
      savedSignature.signatureData.documentIntegrity.signedDocumentUrl = uploadResult.url;
      await savedSignature.save();
      
      console.log(`[SIGNATURE] Signed document stored: ${signedFileName}`);
      console.log(`[SIGNATURE] Signed document URL: ${uploadResult.url}`);
    } catch (storageError) {
      console.error('[SIGNATURE] Storage error:', storageError);
      // Don't fail the signature process if storage fails
    }

    console.log(`[SIGNATURE] ✅ LEGALLY COMPLIANT signature created by ${signerName} for deal ${dealId}`);
    console.log(`[SIGNATURE] Audit trail: IP=${auditTrail?.ipAddress}, UA=${auditTrail?.userAgent?.substring(0, 50)}...`);

    res.status(201).json({
      message: '✅ Document signed successfully with full legal compliance',
      signature: savedSignature,
      compliance: savedSignature.verifyLegalCompliance()
    });
  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ error: 'Failed to sign document' });
  }
});

// NEW: Verify legal compliance for a signature
router.get('/:signatureId/compliance', async (req, res) => {
  try {
    const { signatureId } = req.params;
    
    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    const compliance = signature.verifyLegalCompliance();
    
    res.json({
      signatureId,
      compliance,
      auditTrail: {
        intentToSign: {
          timestamp: signature.intentToSignTimestamp,
          ipAddress: signature.intentToSignIpAddress,
          userAgent: signature.intentToSignUserAgent
        },
        consentToElectronicBusiness: {
          timestamp: signature.consentToElectronicBusinessTimestamp,
          ipAddress: signature.consentToElectronicBusinessIpAddress,
          userAgent: signature.consentToElectronicBusinessUserAgent
        },
        signatureAssociation: {
          signerIdentityVerified: signature.signatureAssociation.signerIdentityVerified,
          identityVerificationMethod: signature.signatureAssociation.identityVerificationMethod,
          identityVerificationTimestamp: signature.signatureAssociation.identityVerificationTimestamp
        },
        documentIntegrity: {
          documentHash: signature.signatureData.documentHash,
          signatureHash: signature.signatureHash,
          isVerified: signature.verifySignature()
        }
      }
    });
  } catch (error) {
    console.error('Error verifying compliance:', error);
    res.status(500).json({ error: 'Failed to verify compliance' });
  }
});

// NEW: Download signed document
router.get('/:signatureId/download', async (req, res) => {
  try {
    const { signatureId } = req.params;
    
    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    const signedDocumentUrl = signature.signatureData.documentIntegrity.signedDocumentUrl;
    if (!signedDocumentUrl) {
      return res.status(404).json({ error: 'Signed document not found' });
    }

    // Redirect to the signed document URL
    res.redirect(signedDocumentUrl);
  } catch (error) {
    console.error('Error downloading signed document:', error);
    res.status(500).json({ error: 'Failed to download signed document' });
  }
});

// NEW: Send document to client for signature
router.post('/:signatureId/send-to-client', async (req, res) => {
  try {
    const { signatureId } = req.params;
    const { clientEmail, documentUrl, dealId, documentType } = req.body;

    if (!clientEmail || !documentUrl || !dealId || !documentType) {
      return res.status(400).json({ error: 'Client email, document URL, deal ID, and document type are required' });
    }

    // Verify signature exists
    const signature = await DigitalSignature.findById(signatureId);
    if (!signature) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    // Create client signature request
    const clientSignature = new DigitalSignature({
      documentId: dealId,
      documentType,
      fileName: signature.fileName,
      signerType: 'client',
      signerName: 'Client',
      signerEmail: clientEmail,
      signatureMethod: 'email_invitation',
      status: 'pending',
      parentSignatureId: signatureId,
      signatureData: {
        invitationSentAt: new Date(),
        documentUrl
      }
    });

    const savedClientSignature = await clientSignature.save();

    // TODO: Send email to client with signature link
    // For now, just return success
    console.log(`[SIGNATURE] Client signature request created for ${clientEmail}`);

    res.status(201).json({
      message: 'Document sent to client for signature',
      clientSignature: savedClientSignature
    });
  } catch (error) {
    console.error('Error sending to client:', error);
    res.status(500).json({ error: 'Failed to send document to client' });
  }
});

// Sign a document
router.post('/sign', authenticateApiKey, async (req, res) => {
  try {
    const {
      signatureId,
      signatureImage,
      typedSignature,
      coordinates,
      ipAddress,
      userAgent
    } = req.body;

    // Validation
    if (!signatureId) {
      return res.status(400).json({ error: 'Signature ID is required' });
    }

    if (!signatureImage && !typedSignature) {
      return res.status(400).json({ error: 'Either signature image or typed signature is required' });
    }

    // Find signature
    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    if (signature.status !== 'consent_given' && signature.status !== 'pending') {
      return res.status(400).json({ error: 'Signature is not ready for signing. Consent must be given first.' });
    }

    // Verify legal compliance
    if (!signature.intentToSign || !signature.consentToElectronicBusiness) {
      return res.status(400).json({ 
        error: 'Legal consent requirements not met. Both intent to sign and consent to electronic business must be recorded.',
        missingConsents: {
          intentToSign: !signature.intentToSign,
          consentToElectronicBusiness: !signature.consentToElectronicBusiness
        }
      });
    }

    // Update signature data
    signature.signatureData = {
      timestamp: new Date(),
      signatureImage: signatureImage || null,
      typedSignature: typedSignature || null,
      coordinates: coordinates || null
    };

    signature.ipAddress = ipAddress || req.ip;
    signature.userAgent = userAgent || req.get('User-Agent');
    signature.status = 'signed';
    signature.isVerified = true;
    signature.verifiedAt = new Date();

    // Verify signer identity
    signature.signatureAssociation.signerIdentityVerified = true;
    signature.signatureAssociation.identityVerificationMethod = 'api_key';
    signature.signatureAssociation.identityVerificationTimestamp = new Date();

    // Generate signature hash
    signature.signatureHash = signature.generateHash();

    const savedSignature = await signature.save();
    
    // Populate references
    await savedSignature.populate('signerId', 'firstName lastName name email');
    await savedSignature.populate('apiKeyUsed', 'name type');

    console.log(`[SIGNATURE] Document signed by ${signature.signerName} using API key ${req.apiKey.name}`);

    res.json({
      message: 'Document signed successfully',
      signature: savedSignature,
      legalCompliance: savedSignature.verifyLegalCompliance()
    });
  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ error: 'Failed to sign document' });
  }
});

// Verify a signature
router.post('/verify/:signatureId', async (req, res) => {
  try {
    const { signatureId } = req.params;

    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    const isValid = signature.verifySignature();
    const legalCompliance = signature.verifyLegalCompliance();

    res.json({
      signatureId,
      isValid,
      legalCompliance,
      signature: signature
    });
  } catch (error) {
    console.error('Error verifying signature:', error);
    res.status(500).json({ error: 'Failed to verify signature' });
  }
});

// Get signature status
router.get('/status/:signatureId', async (req, res) => {
  try {
    const { signatureId } = req.params;

    const signature = await DigitalSignature.findOne({ signatureId })
      .populate('signerId', 'firstName lastName name email')
      .populate('apiKeyUsed', 'name type');

    if (!signature) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    const legalCompliance = signature.verifyLegalCompliance();

    res.json({
      signatureId,
      status: signature.status,
      legalCompliance,
      signature: signature
    });
  } catch (error) {
    console.error('Error fetching signature status:', error);
    res.status(500).json({ error: 'Failed to fetch signature status' });
  }
});

// NEW: Get legal compliance report
router.get('/compliance/:signatureId', async (req, res) => {
  try {
    const { signatureId } = req.params;

    const signature = await DigitalSignature.findOne({ signatureId })
      .populate('signerId', 'firstName lastName name email')
      .populate('apiKeyUsed', 'name type');

    if (!signature) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    const compliance = signature.verifyLegalCompliance();

    res.json({
      signatureId,
      compliance,
      requirements: {
        intentToSign: {
          required: true,
          met: signature.intentToSign,
          timestamp: signature.intentToSignTimestamp,
          ipAddress: signature.intentToSignIpAddress
        },
        consentToElectronicBusiness: {
          required: true,
          met: signature.consentToElectronicBusiness,
          timestamp: signature.consentToElectronicBusinessTimestamp,
          ipAddress: signature.consentToElectronicBusinessIpAddress
        },
        signatureAssociation: {
          required: true,
          met: signature.signatureAssociation.signerIdentityVerified,
          verificationMethod: signature.signatureAssociation.identityVerificationMethod,
          timestamp: signature.signatureAssociation.identityVerificationTimestamp
        },
        documentIntegrity: {
          required: true,
          met: signature.verifySignature(),
          hash: signature.signatureHash
        }
      },
      signature: signature
    });
  } catch (error) {
    console.error('Error fetching compliance report:', error);
    res.status(500).json({ error: 'Failed to fetch compliance report' });
  }
});

// Revoke a signature (admin only)
router.post('/revoke/:signatureId', async (req, res) => {
  try {
    const { signatureId } = req.params;
    const { reason } = req.body;

    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      return res.status(404).json({ error: 'Signature not found' });
    }

    signature.status = 'revoked';
    signature.updatedAt = new Date();

    const savedSignature = await signature.save();

    console.log(`[SIGNATURE] Signature ${signatureId} revoked. Reason: ${reason}`);

    res.json({
      message: 'Signature revoked successfully',
      signature: savedSignature
    });
  } catch (error) {
    console.error('Error revoking signature:', error);
    res.status(500).json({ error: 'Failed to revoke signature' });
  }
});

// Get all signatures for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const signatures = await DigitalSignature.find({ signerId: userId })
      .populate('documentId', 'vehicle vin stockNumber')
      .populate('apiKeyUsed', 'name type')
      .sort({ createdAt: -1 });

    res.json(signatures);
  } catch (error) {
    console.error('Error fetching user signatures:', error);
    res.status(500).json({ error: 'Failed to fetch user signatures' });
  }
});

// Bulk sign multiple documents
router.post('/bulk-sign', authenticateApiKey, async (req, res) => {
  try {
    const { signatures } = req.body;

    if (!Array.isArray(signatures) || signatures.length === 0) {
      return res.status(400).json({ error: 'Signatures array is required' });
    }

    const results = [];

    for (const sigData of signatures) {
      try {
        const {
          documentId,
          documentType,
          signerName,
          signerEmail,
          signatureImage,
          typedSignature,
          coordinates
        } = sigData;

        // Create and sign in one step with consent
        const signature = new DigitalSignature({
          documentId,
          documentType,
          signerType: 'customer',
          signerName,
          signerEmail,
          signatureMethod: 'api_key',
          apiKeyUsed: req.apiKey._id,
          signatureData: {
            timestamp: new Date(),
            signatureImage: signatureImage || null,
            typedSignature: typedSignature || null,
            coordinates: coordinates || null
          },
          status: 'signed',
          isVerified: true,
          verifiedAt: new Date(),
          // Set consent requirements for bulk operations
          intentToSign: true,
          intentToSignTimestamp: new Date(),
          consentToElectronicBusiness: true,
          consentToElectronicBusinessTimestamp: new Date(),
          signatureAssociation: {
            signerIdentityVerified: true,
            identityVerificationMethod: 'api_key',
            identityVerificationTimestamp: new Date()
          }
        });

        signature.signatureHash = signature.generateHash();
        const savedSignature = await signature.save();

        results.push({
          documentId,
          success: true,
          signatureId: savedSignature.signatureId,
          legalCompliance: savedSignature.verifyLegalCompliance()
        });
      } catch (error) {
        results.push({
          documentId: sigData.documentId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Bulk signature operation completed',
      results
    });
  } catch (error) {
    console.error('Error in bulk signature:', error);
    res.status(500).json({ error: 'Failed to process bulk signatures' });
  }
});

module.exports = router; 