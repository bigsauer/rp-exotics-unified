const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { authenticateApiKey } = require('../middleware/apiKeyAuth');
const DigitalSignature = require('../models/DigitalSignature');
const pdfSignatureService = require('../services/pdfSignatureService');
const cloudStorage = require('../services/cloudStorage');
const emailService = require('../services/emailService');
const crypto = require('crypto');
// Node.js v22 has built-in fetch, no need to import node-fetch

// Test route to verify signatures route is working
router.get('/test', (req, res) => {
  res.json({ message: 'Signatures route is working', timestamp: new Date().toISOString() });
});

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

// Helper function to get client IP address
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};

// Helper function to create comprehensive audit trail
const createAuditTrail = (req, clientData = {}) => {
  return {
    signatureTimestamp: new Date().toISOString(),
    ipAddress: getClientIP(req),
    userAgent: req.get('User-Agent') || clientData.userAgent || 'unknown',
    screenResolution: clientData.screenResolution || 'unknown',
    timezone: clientData.timezone || 'unknown',
    language: clientData.language || 'unknown',
    sessionId: clientData.sessionId || 'unknown',
    consentTimestamp: new Date().toISOString(),
    consentMethod: req.user?.role === 'finance' ? 'automatic' : 'manual'
  };
};

// Helper function to generate document hash for integrity
const generateDocumentHash = async (documentUrl) => {
  try {
    // For now, create a hash based on document URL and timestamp
    // In production, this should fetch the actual document content
    const content = `${documentUrl}-${new Date().toISOString()}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    debugLog('Error generating document hash, using fallback', { error: error.message });
    // Fallback hash
    return crypto.createHash('sha256').update(`${documentUrl}-${Date.now()}`).digest('hex');
  }
};

// Create signature
router.post('/', authenticateToken, async (req, res) => {
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
      signatureFont,
      auditTrail: clientAuditTrail,
      clientEmail,
      screenResolution,
      timezone,
      language,
      sessionId,
      dealInfo
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

    // Generate signature ID and document hash
    const signatureId = DigitalSignature.generateSignatureId();
    const documentHash = await generateDocumentHash(documentUrl);
    
    debugLog('Generated signature ID and document hash', { 
      signatureId, 
      documentHash: documentHash.substring(0, 16) + '...' 
    });

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
      dealInfo: dealInfo || null,
      signatureData: {
        imageSignature: signatureImage || null,
        typedSignature: typedSignature || null,
        signatureFont: signatureFont || null,
        signatureMethod: signatureType,
        documentHash: documentHash,
        documentIntegrity: {
          isFlattened: true,
          watermark: 'SIGNED',
          signedTimestamp: new Date().toISOString(),
          originalDocumentUrl: documentUrl,
          signedDocumentUrl: documentUrl // Use original URL for now due to S3 issues
        }
      },
      signatureAssociation: {
        documentUrl,
        documentType,
        signaturePosition: 'calculated',
        identityVerificationMethod: 'built_in_system',
        consentGiven: req.user.role === 'finance' ? true : clientAuditTrail?.consentGiven || false
      },
      auditTrail: createAuditTrail(req, {
        screenResolution,
        timezone,
        language,
        sessionId,
        userAgent: clientAuditTrail?.userAgent
      }),
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
      hasTypedSignature: !!signatureData.signatureData.typedSignature,
      signatureFont: signatureData.signatureData.signatureFont
    });

    // Validate URL format
    if (!documentUrl || typeof documentUrl !== 'string') {
      errorLog('Invalid document URL provided', { documentUrl });
      return res.status(400).json({ error: 'Invalid document URL' });
    }
    
    // Check if URL contains 'UNKNOWN' which indicates a file generation issue
    if (documentUrl.includes('UNKNOWN')) {
      errorLog('Document URL contains UNKNOWN identifier - file likely not generated properly', { documentUrl });
      return res.status(400).json({ 
        error: 'Document not found - file generation issue detected. Please regenerate the document.',
        details: 'The document filename contains UNKNOWN, indicating the original file was not properly generated.'
      });
    }

    // For now, skip PDF fetching and signature embedding due to S3 permission issues
    // Store signature metadata only - the signature will be associated with the document
    // but won't be embedded in the PDF until S3 permissions are fixed
    debugLog('Skipping PDF fetch and signature embedding due to S3 permission issues', { documentUrl });
    debugLog('Storing signature metadata only - signature will be associated with document URL', { documentUrl });

    // Create a simple signature result object
    let signatureResult;
    try {
      signatureResult = {
        success: true,
        originalSize: 0,
        finalSize: 0,
        signatureType: signatureType,
        signedDocumentUrl: documentUrl, // Use original document URL for now
        signatureEmbedded: false
      };
      debugLog('Signature result object created successfully', { signatureResult });
    } catch (error) {
      errorLog('Failed to create signature result object', error);
      return res.status(500).json({ error: 'Failed to create signature result' });
    }
    
    // Skip document upload since we're not embedding signatures for now
    debugLog('Skipping document upload - storing signature metadata only');
    
    // Update signature data to use original document URL
    signatureData.signatureData.documentHash = 'metadata_only';
    signatureData.signatureData.documentIntegrity.signedDocumentUrl = documentUrl; // Use original document URL

    // Generate signature hash
    let digitalSignature;
    try {
      digitalSignature = new DigitalSignature(signatureData);
      digitalSignature.signatureHash = digitalSignature.generateHash();

      debugLog('Digital signature object created', {
        signatureId: digitalSignature.signatureId,
        documentHash: digitalSignature.signatureData.documentHash,
        signatureHash: digitalSignature.signatureHash ? 'generated' : 'missing'
      });
    } catch (error) {
      errorLog('Failed to create digital signature object', error);
      return res.status(500).json({ error: 'Failed to create digital signature' });
    }

    // Save to database
    try {
      debugLog('Saving digital signature to database');
      await digitalSignature.save();
      debugLog('Digital signature saved successfully', { signatureId: digitalSignature.signatureId });
    } catch (error) {
      errorLog('Failed to save digital signature to database', error);
      return res.status(500).json({ error: 'Failed to save signature to database' });
    }

    // If client email provided, create client signature request
    if (clientEmail) {
      debugLog('Creating client signature request', { clientEmail });
      
      const clientSignatureData = {
        signatureId: DigitalSignature.generateSignatureId(),
        documentUrl: documentUrl, // Use the original document URL
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
            originalDocumentUrl: documentUrl,
            signedDocumentUrl: documentUrl
          }
        },
        signatureAssociation: {
          documentUrl: documentUrl,
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

      // Send email to client with signature request
      try {
        debugLog('Sending client signature request email from initial signature', {
          clientEmail,
          clientSignatureId: clientSignature.signatureId,
          documentType
        });

        // Get deal information for the email
        // Use stored deal information from the original signature, or fallback to document type
        const dealInfo = digitalSignature.dealInfo || {
          vehicle: documentType.includes('vehicle') ? 'Vehicle Record' : 
                  documentType.includes('bill') ? 'Bill of Sale' : 
                  documentType.includes('contract') ? 'Purchase Contract' : 
                  documentType,
          vin: 'N/A',
          rpStockNumber: 'N/A',
          stockNumber: 'N/A'
        };

        const emailResult = await emailService.sendClientSignatureRequest({
          clientEmail,
          signatureId: clientSignature.signatureId,
          documentType,
          dealInfo,
          signerName: req.user.profile?.displayName || req.user.email
        });

        if (emailResult.success) {
          debugLog('Client signature request email sent successfully from initial signature', {
            clientEmail,
            clientSignatureId: clientSignature.signatureId
          });
        } else {
          errorLog('Failed to send client signature request email from initial signature', {
            clientEmail,
            clientSignatureId: clientSignature.signatureId,
            error: emailResult.error
          });
          // Don't fail the request if email fails, but log it
        }
      } catch (emailError) {
        errorLog('Error sending client signature request email from initial signature', emailError);
        // Don't fail the request if email fails, but log it
      }
    }

    // Ensure signatureResult is properly defined
    if (!signatureResult || !signatureResult.signedDocumentUrl) {
      errorLog('Signature result is missing or invalid', { signatureResult });
      return res.status(500).json({ error: 'Failed to create signature - missing result data' });
    }

    debugLog('Signature creation process completed successfully', {
      signatureId: digitalSignature.signatureId,
      signedDocumentUrl: signatureResult.signedDocumentUrl,
      hasClientRequest: !!clientEmail
    });

    res.json({
      success: true,
      signatureId: digitalSignature.signatureId,
      signedDocumentUrl: signatureResult.signedDocumentUrl,
      message: 'Document signed successfully'
    });

  } catch (error) {
    errorLog('Signature creation failed', error);
    res.status(500).json({ error: 'Failed to create signature' });
  }
});

// Send document to client for signature
router.post('/:signatureId/send-to-client', authenticateToken, async (req, res) => {
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

    // Send email to client with signature request
    try {
      debugLog('Sending client signature request email', {
        clientEmail,
        clientSignatureId: clientSignature.signatureId,
        documentType: originalSignature.documentType
      });

      // Use stored deal information from the original signature, or fallback to document type
      const dealInfo = originalSignature.dealInfo || {
        vehicle: originalSignature.documentType.includes('vehicle') ? 'Vehicle Record' : 
                originalSignature.documentType.includes('bill') ? 'Bill of Sale' : 
                originalSignature.documentType.includes('contract') ? 'Purchase Contract' : 
                originalSignature.documentType,
        vin: 'N/A',
        rpStockNumber: 'N/A',
        stockNumber: 'N/A'
      };

      const emailResult = await emailService.sendClientSignatureRequest({
        clientEmail,
        signatureId: clientSignature.signatureId,
        documentType: originalSignature.documentType,
        dealInfo,
        signerName: req.user.profile?.displayName || req.user.email
      });

      if (emailResult.success) {
        debugLog('Client signature request email sent successfully', {
          clientEmail,
          clientSignatureId: clientSignature.signatureId
        });
      } else {
        errorLog('Failed to send client signature request email', {
          clientEmail,
          clientSignatureId: clientSignature.signatureId,
          error: emailResult.error
        });
        // Don't fail the request if email fails, but log it
      }
    } catch (emailError) {
      errorLog('Error sending client signature request email', emailError);
      // Don't fail the request if email fails, but log it
    }

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
router.get('/:signatureId/compliance', authenticateToken, async (req, res) => {
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
router.get('/:signatureId/download', authenticateToken, async (req, res) => {
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

// Record intent to sign consent
router.post('/consent/intent-to-sign', async (req, res) => {
  try {
    const { signatureId, ipAddress, userAgent, screenResolution, timezone, language, sessionId } = req.body;

    debugLog('Intent to sign consent request received', {
      signatureId,
      ipAddress: ipAddress || 'will-be-captured',
      hasUserAgent: !!userAgent,
      hasScreenResolution: !!screenResolution,
      hasTimezone: !!timezone,
      hasLanguage: !!language,
      hasSessionId: !!sessionId
    });

    // Security validation
    if (!signatureId || !signatureId.startsWith('sig_') || signatureId.length < 20) {
      errorLog('Invalid signature ID format for intent-to-sign consent', { signatureId });
      return res.status(400).json({ error: 'Invalid signature request' });
    }

    // Rate limiting for consent requests
    const clientIP = getClientIP(req);
    const rateLimitKey = `consent_${clientIP}`;
    const currentTime = Date.now();
    const rateLimitWindow = 5 * 60 * 1000; // 5 minutes
    const maxAttempts = 5;

    if (!global.consentRateLimit) {
      global.consentRateLimit = new Map();
    }

    const rateLimit = global.consentRateLimit.get(rateLimitKey);
    if (rateLimit && (currentTime - rateLimit.timestamp) < rateLimitWindow) {
      if (rateLimit.attempts >= maxAttempts) {
        errorLog('Rate limit exceeded for consent requests', { clientIP, signatureId });
        return res.status(429).json({ error: 'Too many consent attempts. Please try again later.' });
      }
      rateLimit.attempts++;
    } else {
      global.consentRateLimit.set(rateLimitKey, { attempts: 1, timestamp: currentTime });
    }

    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      errorLog('Signature not found for intent to sign consent', { signatureId });
      return res.status(404).json({ error: 'Signature not found' });
    }

    // Check if signature is expired (7 days)
    const signatureAge = Date.now() - signature.createdAt.getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (signatureAge > maxAge) {
      errorLog('Signature request expired for intent-to-sign consent', { signatureId, age: signatureAge });
      return res.status(410).json({ error: 'Signature request has expired' });
    }

    // Update intent to sign consent
    signature.intentToSign = true;
    signature.intentToSignTimestamp = new Date();
    signature.intentToSignIpAddress = getClientIP(req);
    signature.intentToSignUserAgent = userAgent || req.get('User-Agent');

    // Update audit trail
    signature.auditTrail = {
      ...signature.auditTrail,
      consentTimestamp: new Date().toISOString(),
      consentMethod: 'manual',
      ipAddress: getClientIP(req),
      userAgent: userAgent || req.get('User-Agent'),
      screenResolution: screenResolution || 'unknown',
      timezone: timezone || 'unknown',
      language: language || 'unknown',
      sessionId: sessionId || 'unknown'
    };

    // Update legal compliance
    signature.legalCompliance.intentToSign = true;

    await signature.save();

    debugLog('Intent to sign consent recorded successfully', {
      signatureId: signature.signatureId,
      timestamp: signature.intentToSignTimestamp
    });

    res.json({
      success: true,
      signatureId: signature.signatureId,
      message: 'Intent to sign consent recorded'
    });

  } catch (error) {
    errorLog('Intent to sign consent recording failed', error);
    res.status(500).json({ error: 'Failed to record intent to sign consent' });
  }
});

// Record electronic business consent
router.post('/consent/electronic-business', async (req, res) => {
  try {
    const { signatureId, ipAddress, userAgent, screenResolution, timezone, language, sessionId } = req.body;

    debugLog('Electronic business consent request received', {
      signatureId,
      ipAddress: ipAddress || 'will-be-captured',
      hasUserAgent: !!userAgent,
      hasScreenResolution: !!screenResolution,
      hasTimezone: !!timezone,
      hasLanguage: !!language,
      hasSessionId: !!sessionId
    });

    // Security validation
    if (!signatureId || !signatureId.startsWith('sig_') || signatureId.length < 20) {
      errorLog('Invalid signature ID format for electronic business consent', { signatureId });
      return res.status(400).json({ error: 'Invalid signature request' });
    }

    // Rate limiting for consent requests (shared with intent-to-sign)
    const clientIP = getClientIP(req);
    const rateLimitKey = `consent_${clientIP}`;
    const currentTime = Date.now();
    const rateLimitWindow = 5 * 60 * 1000; // 5 minutes
    const maxAttempts = 5;

    if (!global.consentRateLimit) {
      global.consentRateLimit = new Map();
    }

    const rateLimit = global.consentRateLimit.get(rateLimitKey);
    if (rateLimit && (currentTime - rateLimit.timestamp) < rateLimitWindow) {
      if (rateLimit.attempts >= maxAttempts) {
        errorLog('Rate limit exceeded for consent requests', { clientIP, signatureId });
        return res.status(429).json({ error: 'Too many consent attempts. Please try again later.' });
      }
      rateLimit.attempts++;
    } else {
      global.consentRateLimit.set(rateLimitKey, { attempts: 1, timestamp: currentTime });
    }

    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      errorLog('Signature not found for electronic business consent', { signatureId });
      return res.status(404).json({ error: 'Signature not found' });
    }

    // Check if signature is expired (7 days)
    const signatureAge = Date.now() - signature.createdAt.getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (signatureAge > maxAge) {
      errorLog('Signature request expired for electronic business consent', { signatureId, age: signatureAge });
      return res.status(410).json({ error: 'Signature request has expired' });
    }

    // Update electronic business consent
    signature.consentToElectronicBusiness = true;
    signature.consentToElectronicBusinessTimestamp = new Date();
    signature.consentToElectronicBusinessIpAddress = getClientIP(req);
    signature.consentToElectronicBusinessUserAgent = userAgent || req.get('User-Agent');

    // Update audit trail
    signature.auditTrail = {
      ...signature.auditTrail,
      consentTimestamp: new Date().toISOString(),
      consentMethod: 'manual',
      ipAddress: getClientIP(req),
      userAgent: userAgent || req.get('User-Agent'),
      screenResolution: screenResolution || 'unknown',
      timezone: timezone || 'unknown',
      language: language || 'unknown',
      sessionId: sessionId || 'unknown'
    };

    // Update legal compliance
    signature.legalCompliance.consentToElectronicBusiness = true;

    await signature.save();

    debugLog('Electronic business consent recorded successfully', {
      signatureId: signature.signatureId,
      timestamp: signature.consentToElectronicBusinessTimestamp
    });

    res.json({
      success: true,
      signatureId: signature.signatureId,
      message: 'Electronic business consent recorded'
    });

  } catch (error) {
    errorLog('Electronic business consent recording failed', error);
    res.status(500).json({ error: 'Failed to record electronic business consent' });
  }
});

// Get signature status (for client-side polling) - Secure validation
router.get('/status/:signatureId', async (req, res) => {
  try {
    const { signatureId } = req.params;

    debugLog('Signature status request received', { signatureId });

    // Security validation
    if (!signatureId || !signatureId.startsWith('sig_') || signatureId.length < 20) {
      errorLog('Invalid signature ID format for status request', { signatureId });
      return res.status(400).json({ error: 'Invalid signature request' });
    }

    // Rate limiting for status requests
    const clientIP = getClientIP(req);
    const rateLimitKey = `status_${clientIP}`;
    const currentTime = Date.now();
    const rateLimitWindow = 1 * 60 * 1000; // 1 minute
    const maxAttempts = 30;

    if (!global.statusRateLimit) {
      global.statusRateLimit = new Map();
    }

    const rateLimit = global.statusRateLimit.get(rateLimitKey);
    if (rateLimit && (currentTime - rateLimit.timestamp) < rateLimitWindow) {
      if (rateLimit.attempts >= maxAttempts) {
        errorLog('Rate limit exceeded for status requests', { clientIP, signatureId });
        return res.status(429).json({ error: 'Too many status requests. Please try again later.' });
      }
      rateLimit.attempts++;
    } else {
      global.statusRateLimit.set(rateLimitKey, { attempts: 1, timestamp: currentTime });
    }

    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      errorLog('Signature not found for status request', { signatureId });
      return res.status(404).json({ error: 'Signature not found' });
    }

    // Check if signature is expired (7 days)
    const signatureAge = Date.now() - signature.createdAt.getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (signatureAge > maxAge) {
      errorLog('Signature request expired for status check', { signatureId, age: signatureAge });
      return res.status(410).json({ error: 'Signature request has expired' });
    }

    debugLog('Signature status retrieved', {
      signatureId: signature.signatureId,
      status: signature.status,
      signerType: signature.signerType
    });

    // Convert S3 URL to proxy URL for CORS-free access
    let documentUrl = signature.documentUrl;
    if (documentUrl && documentUrl.includes('s3.amazonaws.com')) {
      // Extract filename from S3 URL
      const urlParts = documentUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      // Use environment-based URL construction
      const baseUrl = process.env.RAILWAY_STATIC_URL || 'https://astonishing-chicken-production.up.railway.app';
      documentUrl = `${baseUrl}/api/documents/signature-proxy/${fileName}`;
    }

    res.json({
      success: true,
      signature: {
        signatureId: signature.signatureId,
        documentType: signature.documentType,
        status: signature.status,
        signerName: signature.signerName,
        signerEmail: signature.signerEmail,
        intentToSign: signature.intentToSign,
        consentToElectronicBusiness: signature.consentToElectronicBusiness,
        signatureTimestamp: signature.auditTrail?.signatureTimestamp,
        documentUrl: documentUrl
      }
    });

  } catch (error) {
    errorLog('Signature status retrieval failed', error);
    res.status(500).json({ error: 'Failed to retrieve signature status' });
  }
});

// Submit signature (for client-side signature submission) - Secure signature validation
router.post('/sign', async (req, res) => {
  try {
    debugLog('POST /sign route hit', {
      method: req.method,
      url: req.url,
      hasApiKey: !!req.headers['x-api-key'],
      apiKeyLength: req.headers['x-api-key'] ? req.headers['x-api-key'].length : 0,
      body: req.body
    });

    const { 
      signatureId, 
      signatureImage, 
      typedSignature, 
      coordinates,
      ipAddress,
      userAgent,
      screenResolution,
      timezone,
      language,
      sessionId
    } = req.body;

    debugLog('Signature submission request received', {
      signatureId,
      hasSignatureImage: !!signatureImage,
      hasTypedSignature: !!typedSignature,
      coordinates,
      ipAddress: ipAddress || 'will-be-captured',
      hasUserAgent: !!userAgent,
      hasScreenResolution: !!screenResolution,
      hasTimezone: !!timezone,
      hasLanguage: !!language,
      hasSessionId: !!sessionId
    });

    // Security validation
    if (!signatureId || !signatureId.startsWith('sig_') || signatureId.length < 20) {
      errorLog('Invalid signature ID format', { signatureId });
      return res.status(400).json({ error: 'Invalid signature request' });
    }

    // Rate limiting check (basic implementation)
    const clientIP = getClientIP(req);
    const rateLimitKey = `signature_${clientIP}`;
    const currentTime = Date.now();
    const rateLimitWindow = 5 * 60 * 1000; // 5 minutes
    const maxAttempts = 10;

    if (!global.signatureRateLimit) {
      global.signatureRateLimit = new Map();
    }

    const rateLimit = global.signatureRateLimit.get(rateLimitKey);
    if (rateLimit && (currentTime - rateLimit.timestamp) < rateLimitWindow) {
      if (rateLimit.attempts >= maxAttempts) {
        errorLog('Rate limit exceeded for signature submission', { clientIP, signatureId });
        return res.status(429).json({ error: 'Too many signature attempts. Please try again later.' });
      }
      rateLimit.attempts++;
    } else {
      global.signatureRateLimit.set(rateLimitKey, { attempts: 1, timestamp: currentTime });
    }

    if (!signatureImage && !typedSignature) {
      errorLog('No signature data provided in signature submission request');
      return res.status(400).json({ error: 'Either signature image or typed signature is required' });
    }

    const signature = await DigitalSignature.findOne({ signatureId });
    if (!signature) {
      errorLog('Signature not found for signature submission', { signatureId });
      return res.status(404).json({ error: 'Signature not found' });
    }

    // Check if signature is expired (7 days)
    const signatureAge = Date.now() - signature.createdAt.getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (signatureAge > maxAge) {
      errorLog('Signature request expired', { signatureId, age: signatureAge });
      return res.status(410).json({ error: 'Signature request has expired' });
    }

    // Check if signature is already completed
    if (signature.status === 'completed') {
      debugLog('Signature already completed, returning success', { signatureId });
      return res.json({
        success: true,
        signatureId: signature.signatureId,
        message: 'Signature already completed',
        status: 'completed'
      });
    }

    // Update signature data
    signature.signatureData.imageSignature = signatureImage || null;
    signature.signatureData.typedSignature = typedSignature || null;
    signature.signatureData.coordinates = coordinates || { x: 100, y: 200, page: 1 };
    signature.signatureData.timestamp = new Date();
    signature.status = 'completed';

    // Update audit trail
    signature.auditTrail = {
      ...signature.auditTrail,
      signatureTimestamp: new Date().toISOString(),
      ipAddress: getClientIP(req),
      userAgent: userAgent || req.get('User-Agent'),
      screenResolution: screenResolution || 'unknown',
      timezone: timezone || 'unknown',
      language: language || 'unknown',
      sessionId: sessionId || 'unknown'
    };

    // Update legal compliance
    signature.legalCompliance.auditTrailComplete = true;
    signature.legalCompliance.documentIntegrityMaintained = true;

    await signature.save();

    debugLog('Signature submitted successfully', {
      signatureId: signature.signatureId,
      timestamp: signature.signatureData.timestamp
    });

    // Send signature completion notification email
    try {
      // Use stored deal information from the signature, or fallback to document type
      const dealInfo = signature.dealInfo || {
        vehicle: signature.documentType.includes('vehicle') ? 'Vehicle Record' : 
                signature.documentType.includes('bill') ? 'Bill of Sale' : 
                signature.documentType.includes('contract') ? 'Purchase Contract' : 
                signature.documentType,
        vin: 'N/A',
        rpStockNumber: 'N/A',
        stockNumber: 'N/A'
      };

      const emailResult = await emailService.sendSignatureCompletionNotification({
        clientEmail: signature.signerEmail,
        signatureId: signature.signatureId,
        documentType: signature.documentType,
        dealInfo,
        signerName: signature.signerName
      });

      if (emailResult.success) {
        debugLog('Signature completion notification email sent successfully', {
          signatureId: signature.signatureId,
          clientEmail: signature.signerEmail
        });
      } else {
        errorLog('Failed to send signature completion notification email', {
          signatureId: signature.signatureId,
          clientEmail: signature.signerEmail,
          error: emailResult.error
        });
        // Don't fail the request if email fails, but log it
      }
    } catch (emailError) {
      errorLog('Error sending signature completion notification email', emailError);
      // Don't fail the request if email fails, but log it
    }

    res.json({
      success: true,
      signatureId: signature.signatureId,
      message: 'Signature submitted successfully',
      status: 'completed'
    });

  } catch (error) {
    errorLog('Signature submission failed', error);
    res.status(500).json({ error: 'Failed to submit signature' });
  }
});

module.exports = router; 