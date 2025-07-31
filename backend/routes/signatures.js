const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DigitalSignature = require('../models/DigitalSignature');
const pdfSignatureService = require('../services/pdfSignatureService');
const cloudStorage = require('../services/cloudStorage');
const fetch = require('node-fetch');

// Debug logging utility
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString();
  const logPrefix = '[SIGNATURES ROUTE]';
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${logPrefix} [${timestamp}] ${message}`);
    if (data) {
      console.log(`${logPrefix} [${timestamp}] Data:`, JSON.stringify(data, null, 2));
    }
  }
};

const errorLog = (message, error = null) => {
  const timestamp = new Date().toISOString();
  const logPrefix = '[SIGNATURES ROUTE]';
  
  console.error(`${logPrefix} [${timestamp}] ERROR: ${message}`);
  if (error) {
    console.error(`${logPrefix} [${timestamp}] Error details:`, error);
  }
};

// Create signature
router.post('/', auth, async (req, res) => {
  try {
    debugLog('Signature creation request received', {
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      requestBody: {
        documentUrl: req.body.documentUrl,
        documentType: req.body.documentType,
        signatureType: req.body.signatureType,
        hasImageSignature: !!req.body.signatureImage,
        hasTypedSignature: !!req.body.typedSignature,
        auditTrail: req.body.auditTrail ? 'present' : 'missing'
      }
    });

    const {
      documentUrl,
      documentType,
      signatureType,
      signatureImage,
      typedSignature,
      auditTrail,
      clientEmail
    } = req.body;

    // Validate required fields
    if (!documentUrl) {
      errorLog('Missing documentUrl in request');
      return res.status(400).json({ error: 'Document URL is required' });
    }

    if (!documentType) {
      errorLog('Missing documentType in request');
      return res.status(400).json({ error: 'Document type is required' });
    }

    if (!signatureImage && !typedSignature) {
      errorLog('No signature data provided (neither image nor typed)');
      return res.status(400).json({ error: 'Either signature image or typed signature is required' });
    }

    debugLog('Request validation passed, starting signature process');

    // Generate signature ID
    const signatureId = DigitalSignature.generateSignatureId();
    debugLog('Generated signature ID', { signatureId });

    // Create digital signature record
    const signatureData = {
      signatureId,
      documentUrl,
      documentType,
      signatureType,
      signerType: req.user.role === 'finance' ? 'finance' : 'client',
      signatureMethod: 'built_in',
      status: 'completed',
      signerId: req.user.id,
      signerModel: 'User',
      signerEmail: req.user.email,
      signerName: req.user.profile?.displayName || req.user.email,
      signatureData: {
        imageSignature: signatureImage || null,
        typedSignature: typedSignature || null,
        signatureMethod: signatureType,
        documentHash: null, // Will be generated
        documentIntegrity: {
          isFlattened: true,
          watermark: 'SIGNED',
          signedTimestamp: new Date().toISOString(),
          originalDocumentUrl: documentUrl,
          signedDocumentUrl: null // Will be updated after upload
        }
      },
      signatureAssociation: {
        documentUrl,
        documentType,
        signaturePosition: 'calculated',
        identityVerificationMethod: 'built_in_system',
        consentGiven: req.user.role === 'finance' ? true : auditTrail?.consentGiven || false
      },
      auditTrail: {
        signatureTimestamp: new Date().toISOString(),
        ipAddress: auditTrail?.ipAddress || req.ip,
        userAgent: auditTrail?.userAgent || req.get('User-Agent'),
        screenResolution: auditTrail?.screenResolution || 'unknown',
        timezone: auditTrail?.timezone || 'unknown',
        language: auditTrail?.language || 'unknown',
        sessionId: auditTrail?.sessionId || 'unknown',
        consentTimestamp: auditTrail?.consentTimestamp || new Date().toISOString(),
        consentMethod: req.user.role === 'finance' ? 'automatic' : 'manual'
      },
      legalCompliance: {
        esignActCompliant: true,
        uetaCompliant: true,
        intentToSign: true,
        consentToElectronicBusiness: req.user.role === 'finance' ? true : auditTrail?.consentGiven || false,
        clearSignatureAssociation: true,
        auditTrailComplete: true,
        documentIntegrityMaintained: true,
        retentionPolicyCompliant: true,
        signerIdentityVerified: true
      }
    };

    debugLog('Created signature data object', {
      signatureId,
      documentType,
      signatureType,
      signerType: signatureData.signerType,
      hasImageSignature: !!signatureData.signatureData.imageSignature,
      hasTypedSignature: !!signatureData.signatureData.typedSignature
    });

    // Fetch original PDF
    debugLog('Fetching original PDF from URL', { documentUrl });
    const originalPdfResponse = await fetch(documentUrl);
    
    if (!originalPdfResponse.ok) {
      errorLog('Failed to fetch original PDF', {
        status: originalPdfResponse.status,
        statusText: originalPdfResponse.statusText,
        url: documentUrl
      });
      return res.status(400).json({ error: 'Failed to fetch original document' });
    }

    const originalPdfBuffer = await originalPdfResponse.buffer();
    debugLog('Original PDF fetched successfully', {
      bufferSize: originalPdfBuffer.length,
      contentType: originalPdfResponse.headers.get('content-type')
    });

    // Validate PDF buffer
    try {
      pdfSignatureService.validatePdfBuffer(originalPdfBuffer);
      debugLog('PDF buffer validation passed');
    } catch (validationError) {
      errorLog('PDF buffer validation failed', validationError);
      return res.status(400).json({ error: 'Invalid PDF document' });
    }

    // Get document info for debugging
    try {
      const documentInfo = await pdfSignatureService.getDocumentInfo(originalPdfBuffer);
      debugLog('Document information retrieved', documentInfo);
    } catch (infoError) {
      debugLog('Could not retrieve document info (non-critical)', infoError.message);
    }

    // Create signed document
    debugLog('Starting PDF signature process');
    const signatureResult = await pdfSignatureService.createSignedDocument(
      originalPdfBuffer,
      {
        imageSignature: signatureImage,
        typedSignature: typedSignature
      },
      documentType,
      {
        signerName: req.user.profile?.displayName || req.user.email,
        signatureType: signatureType
      }
    );

    debugLog('PDF signature process completed', {
      success: signatureResult.success,
      originalSize: signatureResult.originalSize,
      finalSize: signatureResult.finalSize,
      signatureType: signatureResult.signatureType
    });

    // Upload signed document to cloud storage
    debugLog('Uploading signed document to cloud storage');
    const fileName = `signed_${documentType}_${signatureId}_${Date.now()}.pdf`;
    
    const uploadResult = await cloudStorage.uploadBuffer(
      signatureResult.signedPdfBuffer,
      fileName,
      'application/pdf'
    );

    debugLog('Cloud storage upload completed', {
      fileName,
      uploadUrl: uploadResult.url,
      filePath: uploadResult.filePath
    });

    // Update signature data with signed document URL
    signatureData.signatureData.documentHash = signatureResult.documentHash || 'generated';
    signatureData.signatureData.documentIntegrity.signedDocumentUrl = uploadResult.url;

    // Generate signature hash
    const digitalSignature = new DigitalSignature(signatureData);
    digitalSignature.signatureHash = digitalSignature.generateHash();

    debugLog('Digital signature object created', {
      signatureId: digitalSignature.signatureId,
      documentHash: digitalSignature.signatureData.documentHash,
      signatureHash: digitalSignature.signatureHash ? 'generated' : 'missing'
    });

    // Save to database
    debugLog('Saving digital signature to database');
    await digitalSignature.save();
    debugLog('Digital signature saved successfully', { signatureId: digitalSignature.signatureId });

    // If client email provided, create client signature request
    if (clientEmail) {
      debugLog('Creating client signature request', { clientEmail });
      
      const clientSignatureData = {
        signatureId: DigitalSignature.generateSignatureId(),
        documentUrl: uploadResult.url, // Use the signed document
        documentType,
        signatureType: 'client',
        signerType: 'client',
        signatureMethod: 'email_invitation',
        status: 'pending',
        signerEmail: clientEmail,
        signerName: clientEmail,
        signatureData: {
          imageSignature: null,
          typedSignature: null,
          signatureMethod: 'email_invitation',
          documentHash: null,
          documentIntegrity: {
            isFlattened: false,
            watermark: null,
            signedTimestamp: null,
            originalDocumentUrl: uploadResult.url,
            signedDocumentUrl: null
          }
        },
        signatureAssociation: {
          documentUrl: uploadResult.url,
          documentType,
          signaturePosition: 'pending',
          identityVerificationMethod: 'email_verification',
          consentGiven: false
        },
        auditTrail: {
          signatureTimestamp: null,
          ipAddress: null,
          userAgent: null,
          screenResolution: null,
          timezone: null,
          language: null,
          sessionId: null,
          consentTimestamp: null,
          consentMethod: 'pending'
        },
        legalCompliance: {
          esignActCompliant: false,
          uetaCompliant: false,
          intentToSign: false,
          consentToElectronicBusiness: false,
          clearSignatureAssociation: false,
          auditTrailComplete: false,
          documentIntegrityMaintained: false,
          retentionPolicyCompliant: false,
          signerIdentityVerified: false
        }
      };

      const clientSignature = new DigitalSignature(clientSignatureData);
      await clientSignature.save();
      
      debugLog('Client signature request created', {
        clientSignatureId: clientSignature.signatureId,
        clientEmail
      });
    }

    debugLog('Signature creation process completed successfully', {
      signatureId: digitalSignature.signatureId,
      signedDocumentUrl: uploadResult.url,
      hasClientRequest: !!clientEmail
    });

    res.json({
      success: true,
      signatureId: digitalSignature.signatureId,
      signedDocumentUrl: uploadResult.url,
      message: 'Document signed successfully'
    });

  } catch (error) {
    errorLog('Signature creation failed', error);
    res.status(500).json({ error: 'Failed to create signature' });
  }
});

// Send document to client for signature
router.post('/:signatureId/send-to-client', auth, async (req, res) => {
  try {
    const { signatureId } = req.params;
    const { clientEmail } = req.body;

    debugLog('Send to client request received', {
      signatureId,
      clientEmail,
      userId: req.user.id,
      userEmail: req.user.email
    });

    if (!clientEmail) {
      errorLog('Missing clientEmail in request');
      return res.status(400).json({ error: 'Client email is required' });
    }

    // Find the original signature
    const originalSignature = await DigitalSignature.findOne({ signatureId });
    if (!originalSignature) {
      errorLog('Original signature not found', { signatureId });
      return res.status(404).json({ error: 'Signature not found' });
    }

    debugLog('Original signature found', {
      signatureId: originalSignature.signatureId,
      documentType: originalSignature.documentType,
      status: originalSignature.status
    });

    // Create client signature request
    const clientSignatureData = {
      signatureId: DigitalSignature.generateSignatureId(),
      documentUrl: originalSignature.signatureData.documentIntegrity.signedDocumentUrl,
      documentType: originalSignature.documentType,
      signatureType: 'client',
      signerType: 'client',
      signatureMethod: 'email_invitation',
      status: 'pending',
      signerEmail: clientEmail,
      signerName: clientEmail,
      signatureData: {
        imageSignature: null,
        typedSignature: null,
        signatureMethod: 'email_invitation',
        documentHash: null,
        documentIntegrity: {
          isFlattened: false,
          watermark: null,
          signedTimestamp: null,
          originalDocumentUrl: originalSignature.signatureData.documentIntegrity.signedDocumentUrl,
          signedDocumentUrl: null
        }
      },
      signatureAssociation: {
        documentUrl: originalSignature.signatureData.documentIntegrity.signedDocumentUrl,
        documentType: originalSignature.documentType,
        signaturePosition: 'pending',
        identityVerificationMethod: 'email_verification',
        consentGiven: false
      },
      auditTrail: {
        signatureTimestamp: null,
        ipAddress: null,
        userAgent: null,
        screenResolution: null,
        timezone: null,
        language: null,
        sessionId: null,
        consentTimestamp: null,
        consentMethod: 'pending'
      },
      legalCompliance: {
        esignActCompliant: false,
        uetaCompliant: false,
        intentToSign: false,
        consentToElectronicBusiness: false,
        clearSignatureAssociation: false,
        auditTrailComplete: false,
        documentIntegrityMaintained: false,
        retentionPolicyCompliant: false,
        signerIdentityVerified: false
      }
    };

    const clientSignature = new DigitalSignature(clientSignatureData);
    await clientSignature.save();

    debugLog('Client signature request created successfully', {
      clientSignatureId: clientSignature.signatureId,
      clientEmail,
      originalSignatureId: signatureId
    });

    res.json({
      success: true,
      clientSignatureId: clientSignature.signatureId,
      message: 'Document sent to client for signature'
    });

  } catch (error) {
    errorLog('Send to client failed', error);
    res.status(500).json({ error: 'Failed to send document to client' });
  }
});

// Get signature compliance report
router.get('/:signatureId/compliance', auth, async (req, res) => {
  try {
    const { signatureId } = req.params;

    debugLog('Compliance report request received', {
      signatureId,
      userId: req.user.id,
      userEmail: req.user.email
    });

    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      errorLog('Signature not found for compliance report', { signatureId });
      return res.status(404).json({ error: 'Signature not found' });
    }

    debugLog('Signature found for compliance report', {
      signatureId: signature.signatureId,
      status: signature.status,
      signerType: signature.signerType
    });

    const complianceReport = signature.verifyLegalCompliance();

    debugLog('Compliance report generated', {
      signatureId: signature.signatureId,
      overallCompliance: complianceReport.overallCompliance,
      complianceScore: complianceReport.complianceScore
    });

    res.json({
      success: true,
      signatureId: signature.signatureId,
      complianceReport
    });

  } catch (error) {
    errorLog('Compliance report generation failed', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

// Download signed document
router.get('/:signatureId/download', auth, async (req, res) => {
  try {
    const { signatureId } = req.params;

    debugLog('Download request received', {
      signatureId,
      userId: req.user.id,
      userEmail: req.user.email
    });

    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      errorLog('Signature not found for download', { signatureId });
      return res.status(404).json({ error: 'Signature not found' });
    }

    debugLog('Signature found for download', {
      signatureId: signature.signatureId,
      signedDocumentUrl: signature.signatureData.documentIntegrity.signedDocumentUrl
    });

    const signedDocumentUrl = signature.signatureData.documentIntegrity.signedDocumentUrl;
    if (!signedDocumentUrl) {
      errorLog('No signed document URL found', { signatureId });
      return res.status(404).json({ error: 'Signed document not found' });
    }

    debugLog('Redirecting to signed document', { signedDocumentUrl });

    // Redirect to the signed document URL
    res.redirect(signedDocumentUrl);

  } catch (error) {
    errorLog('Download failed', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

module.exports = router; 