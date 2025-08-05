const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Deal = require('../models/Deal');
const cloudStorage = require('../services/cloudStorage');
const emailService = require('../services/emailService');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');

// Rate limiting for upload attempts
const uploadAttempts = new Map();
const MAX_UPLOAD_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

// Configure multer for file uploads with enhanced security
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Maximum 10 files
    fieldSize: 1024 * 1024 // 1MB for form fields
  },
  fileFilter: (req, file, cb) => {
    // Enhanced file type validation
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, PNG files are allowed.'), false);
    }
    
    // Check file extension
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error('Invalid file extension. Only PDF, DOC, DOCX, JPG, PNG files are allowed.'), false);
    }
    
    // Check for potentially malicious file names
    const maliciousPatterns = /[<>:"/\\|?*\x00-\x1f]/;
    if (maliciousPatterns.test(file.originalname)) {
      return cb(new Error('Invalid file name. File name contains invalid characters.'), false);
    }
    
    cb(null, true);
  }
});

// Security middleware for seller upload routes
const securityMiddleware = (req, res, next) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Rate limiting for upload attempts
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!uploadAttempts.has(clientIP)) {
    uploadAttempts.set(clientIP, { count: 0, resetTime: now + RATE_LIMIT_WINDOW });
  }
  
  const attempts = uploadAttempts.get(clientIP);
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  if (attempts.count >= MAX_UPLOAD_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many upload attempts. Please try again later.'
    });
  }
  
  attempts.count++;
  next();
};

// Handle OPTIONS preflight requests for seller upload
router.options('/generate-link', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Generate seller upload link
router.post('/generate-link', authenticateToken, async (req, res) => {
  try {
    const { dealId, sellerEmail, vehicleInfo, vin } = req.body;

    if (!sellerEmail || !vehicleInfo || !vin) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sellerEmail, vehicleInfo, vin'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sellerEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate VIN format (17 characters)
    if (!vin || vin.length !== 17) {
      return res.status(400).json({
        success: false,
        message: 'Invalid VIN format. VIN must be 17 characters long.'
      });
    }

    // Generate a unique upload token with enhanced entropy
    const uploadToken = crypto.randomBytes(32).toString('hex');
    // Always use slipstreamdocs.com domain for seller upload links (never Vercel URLs)
    const frontendUrl = process.env.NODE_ENV === 'production' ? 'https://slipstreamdocs.com' : (process.env.FRONTEND_URL || 'https://slipstreamdocs.com');
    const uploadLink = `${frontendUrl}/seller-upload/${uploadToken}`;

    // Store the upload token and deal info with enhanced security
    global.sellerUploadTokens = global.sellerUploadTokens || new Map();
    global.sellerUploadTokens.set(uploadToken, {
      dealId,
      sellerEmail: sellerEmail.toLowerCase(), // Normalize email
      vehicleInfo,
      vin: vin.toUpperCase(), // Normalize VIN
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      uploadAttempts: 0,
      maxUploadAttempts: 3 // Limit upload attempts per token
    });

    // Send email to seller with enhanced security
    const emailSubject = `📄 Document Upload Request - ${vehicleInfo}`;
    const emailBody = `
Dear Vehicle Owner,

Thank you for choosing RP Exotics for your vehicle transaction! We're excited to work with you and make this process as smooth as possible.

🚗 **Vehicle Information:**
• Vehicle: ${vehicleInfo}
• VIN: ${vin}

📋 **Next Steps - Document Upload:**
We need you to upload some important documents to complete your vehicle sale. This is a secure, encrypted process that typically takes just a few minutes.

🔗 **Secure Upload Link:**
${uploadLink}

⏰ **Important Timeframes:**
• This secure link expires in 7 days
• You can upload documents up to 3 times with this link
• Please complete this within 24-48 hours for fastest processing

📁 **Documents You'll Need:**
• Valid state-issued photo ID for all title holders
• Front and back photos of the title (if you have it)
• Current vehicle registration (if no title)
• Photo of the current odometer reading
• Lienholder information (if applicable)

🛡️ **Security & Privacy:**
• This is a private, secure link - do not share with anyone
• All documents are encrypted and stored securely
• We only request documents necessary for your transaction
• Your information is protected by industry-standard security

💻 **Technical Requirements:**
• Supported file types: PDF, DOC, DOCX, JPG, PNG
• Maximum file size: 10MB per file
• Works on desktop, tablet, and mobile devices

❓ **Need Help?**
If you have any questions or need assistance:
• Email: support@rpexotics.com
• Phone: (555) 123-4567
• Hours: Monday-Friday, 9AM-6PM EST

We appreciate your business and look forward to completing your transaction!

Best regards,
The RP Exotics Team

---
*This is an automated message. Please do not reply directly to this email.*
*RP Exotics | Professional Vehicle Solutions*
    `;

    // Create HTML version of the email
    const htmlEmailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document Upload Request - RP Exotics</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
            .content { padding: 40px; }
            .vehicle-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 30px; }
            .vehicle-info h2 { color: #1e40af; margin-top: 0; font-size: 20px; }
            .vehicle-details { display: flex; justify-content: space-between; margin-top: 15px; }
            .vehicle-detail { flex: 1; }
            .vehicle-detail strong { color: #374151; }
            .upload-section { background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 25px; margin-bottom: 30px; }
            .upload-section h2 { color: #1e40af; margin-top: 0; font-size: 20px; }
            .upload-button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; transition: background-color 0.3s; }
            .upload-button:hover { background: #059669; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .info-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
            .info-card h3 { color: #1e40af; margin-top: 0; font-size: 16px; }
            .info-card ul { margin: 10px 0; padding-left: 20px; }
            .info-card li { margin-bottom: 5px; }
            .security-note { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .security-note strong { color: #92400e; }
            .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; border-top: 1px solid #e5e7eb; }
            .contact-info { background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .contact-info h3 { color: #374151; margin-top: 0; }
            .contact-info p { margin: 5px 0; }
            @media (max-width: 600px) {
                .vehicle-details { flex-direction: column; }
                .info-grid { grid-template-columns: 1fr; }
                .content { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚗 RP Exotics</h1>
                <p>Professional Vehicle Solutions</p>
            </div>
            
            <div class="content">
                <h2 style="color: #1e40af; margin-top: 0;">Document Upload Request</h2>
                
                <p>Dear Vehicle Owner,</p>
                
                <p>Thank you for choosing <strong>RP Exotics</strong> for your vehicle transaction! We're excited to work with you and make this process as smooth as possible.</p>
                
                <div class="vehicle-info">
                    <h2>🚗 Vehicle Information</h2>
                    <div class="vehicle-details">
                        <div class="vehicle-detail">
                            <strong>Vehicle:</strong><br>
                            ${vehicleInfo}
                        </div>
                        <div class="vehicle-detail">
                            <strong>VIN:</strong><br>
                            ${vin}
                        </div>
                    </div>
                </div>
                
                <div class="upload-section">
                    <h2>📋 Next Steps - Document Upload</h2>
                    <p>We need you to upload some important documents to complete your vehicle sale. This is a secure, encrypted process that typically takes just a few minutes.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${uploadLink}" class="upload-button">
                            🔗 Upload Documents Securely
                        </a>
                    </div>
                    
                    <div class="security-note">
                        <strong>🔒 Secure Link:</strong> This is a private, encrypted link that expires in 7 days. Do not share with anyone.
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-card">
                        <h3>⏰ Important Timeframes</h3>
                        <ul>
                            <li>Link expires in 7 days</li>
                            <li>Up to 3 upload attempts</li>
                            <li>Complete within 24-48 hours for fastest processing</li>
                        </ul>
                    </div>
                    
                    <div class="info-card">
                        <h3>📁 Documents You'll Need</h3>
                        <ul>
                            <li>Valid state-issued photo ID</li>
                            <li>Title photos (if available)</li>
                            <li>Vehicle registration</li>
                            <li>Odometer photo</li>
                            <li>Lienholder info (if applicable)</li>
                        </ul>
                    </div>
                </div>
                
                <div class="info-card">
                    <h3>💻 Technical Requirements</h3>
                    <ul>
                        <li><strong>File types:</strong> PDF, DOC, DOCX, JPG, PNG</li>
                        <li><strong>File size:</strong> Maximum 10MB per file</li>
                        <li><strong>Devices:</strong> Works on desktop, tablet, and mobile</li>
                    </ul>
                </div>
                
                <div class="contact-info">
                    <h3>❓ Need Help?</h3>
                    <p><strong>Email:</strong> support@rpexotics.com</p>
                    <p><strong>Phone:</strong> (555) 123-4567</p>
                    <p><strong>Hours:</strong> Monday-Friday, 9AM-6PM EST</p>
                </div>
                
                <p style="margin-top: 30px; font-size: 16px;">We appreciate your business and look forward to completing your transaction!</p>
                
                <p style="margin-top: 20px;">
                    Best regards,<br>
                    <strong>The RP Exotics Team</strong>
                </p>
            </div>
            
            <div class="footer">
                <p style="margin: 0; font-size: 14px;">
                    <em>This is an automated message. Please do not reply directly to this email.</em><br>
                    <strong>RP Exotics | Professional Vehicle Solutions</strong>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    await emailService.sendEmail({
      to: sellerEmail,
      subject: emailSubject,
      text: emailBody,
      html: htmlEmailBody
    });

    // Add CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.json({
      success: true,
      uploadLink,
      message: 'Upload link generated and email sent successfully'
    });

  } catch (error) {
    console.error('[SELLER UPLOAD] Error generating upload link:', error);
    
    // Add CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate upload link',
      error: error.message
    });
  }
});

// Handle seller document upload with enhanced security
router.post('/upload/:token', securityMiddleware, upload.array('documents', 10), async (req, res) => {
  try {
    const { token } = req.params;
    const files = req.files;
    let formData = null;
    try {
      formData = req.body.formData ? JSON.parse(req.body.formData) : null;
      console.log('[SELLER UPLOAD] Form data parsed successfully:', {
        hasFormData: !!formData,
        formDataKeys: formData ? Object.keys(formData) : [],
        pickupAddressType: formData?.pickupAddress ? typeof formData.pickupAddress : 'undefined'
      });
    } catch (parseError) {
      console.error('[SELLER UPLOAD] Error parsing form data:', parseError);
      return res.status(400).json({
        success: false,
        message: 'Invalid form data format'
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Verify upload token with enhanced validation
    global.sellerUploadTokens = global.sellerUploadTokens || new Map();
    const uploadInfo = global.sellerUploadTokens.get(token);

    if (!uploadInfo) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired upload link'
      });
    }

    if (new Date() > uploadInfo.expiresAt) {
      global.sellerUploadTokens.delete(token);
      return res.status(410).json({
        success: false,
        message: 'Upload link has expired'
      });
    }

    // Check upload attempt limits
    if (uploadInfo.uploadAttempts >= uploadInfo.maxUploadAttempts) {
      global.sellerUploadTokens.delete(token);
      return res.status(429).json({
        success: false,
        message: 'Maximum upload attempts reached for this link'
      });
    }

    // Increment upload attempts
    uploadInfo.uploadAttempts++;

    const { dealId, sellerEmail, vehicleInfo, vin } = uploadInfo;

    // Additional file validation
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 50 * 1024 * 1024; // 50MB total limit
    
    if (totalSize > maxTotalSize) {
      return res.status(400).json({
        success: false,
        message: 'Total file size exceeds 50MB limit'
      });
    }

    // Validate consent agreement
    if (formData && !formData.consentAgreement) {
      return res.status(400).json({
        success: false,
        message: 'You must agree to sell your vehicle to RP Exotics to proceed'
      });
    }

    // Upload files to cloud storage with enhanced security
    const uploadedFiles = [];
    
    for (const file of files) {
      // Generate secure filename
      const timestamp = Date.now();
      const randomSuffix = crypto.randomBytes(8).toString('hex');
      const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `seller_upload_${timestamp}_${randomSuffix}_${safeOriginalName}`;
      const filePath = `seller-uploads/${dealId}/${fileName}`;
      
      // Upload to cloud storage
      const uploadResult = await cloudStorage.uploadBuffer(
        file.buffer,
        filePath,
        file.mimetype
      );

      uploadedFiles.push({
        originalName: file.originalname,
        fileName: fileName,
        filePath: filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: sellerEmail,
        uploadedAt: new Date(),
        cloudUrl: uploadResult.url,
        checksum: crypto.createHash('sha256').update(file.buffer).digest('hex')
      });
    }

          // Find the deal and add the uploaded documents
      const deal = await Deal.findById(dealId);
      if (deal) {
        if (!deal.sellerUploadedDocuments) {
          deal.sellerUploadedDocuments = [];
        }
        
        // Add uploaded files to sellerUploadedDocuments
        deal.sellerUploadedDocuments.push(...uploadedFiles);
        
        // Also add uploaded files to the main documents array for the deal documents page
        if (!deal.documents) {
          deal.documents = [];
        }
        
        // Map uploaded files to document format for the main documents array
        const documentMappings = {
          'photoId': 'seller_photo_id',
          'titleFront': 'seller_title_front',
          'titleBack': 'seller_title_back',
          'registration': 'seller_registration',
          'odometerPhoto': 'seller_odometer'
        };
        
        // Add each uploaded file to the main documents array
        uploadedFiles.forEach((file, index) => {
          // Determine document type based on form data
          let documentType = 'seller_document';
          
          // Try to match the file to a specific document type based on form data
          if (formData) {
            const allFiles = [
              formData.photoId,
              formData.titleFront,
              formData.titleBack,
              formData.registration,
              formData.odometerPhoto
            ].filter(Boolean);
            
            const fileIndex = allFiles.findIndex(f => 
              f && f.name === file.originalName
            );
            
            if (fileIndex !== -1) {
              const fileKeys = ['photoId', 'titleFront', 'titleBack', 'registration', 'odometerPhoto'];
              const key = fileKeys[fileIndex];
              if (key && documentMappings[key]) {
                documentType = documentMappings[key];
              }
            }
          }
          
          // Create document object for main documents array
          const newDocument = {
            type: documentType,
            documentId: `seller_${Date.now()}_${index}`,
            fileName: file.originalName,
            filePath: file.cloudUrl, // Use S3 URL
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            uploaded: true,
            uploadedAt: file.uploadedAt,
            uploadedBy: null, // Seller upload, not a system user
            approved: true, // Auto-approve seller documents
            approvedAt: new Date(),
            approvedBy: null, // Auto-approved
            required: true,
            notes: `Auto-approved seller upload: ${sellerEmail}`,
            version: 1
          };
          
          deal.documents.push(newDocument);
        });
        
        // Add form data to deal with validation
        if (formData) {
          // Sanitize form data with defensive programming
          const sanitizedFormData = {
            consentAgreement: Boolean(formData.consentAgreement),
            emailAddress: formData.emailAddress ? String(formData.emailAddress).toLowerCase().trim() : '',
            mailingAddress: formData.mailingAddress && typeof formData.mailingAddress === 'object' ? {
              street: String(formData.mailingAddress.street || '').trim(),
              city: String(formData.mailingAddress.city || '').trim(),
              state: String(formData.mailingAddress.state || '').trim(),
              zip: String(formData.mailingAddress.zip || '').trim()
            } : {
              street: '',
              city: '',
              state: '',
              zip: ''
            },
            pickupAddress: formData.pickupAddress && typeof formData.pickupAddress === 'object' ? 
              `${String(formData.pickupAddress.street || '').trim()}, ${String(formData.pickupAddress.city || '').trim()}, ${String(formData.pickupAddress.state || '').trim()} ${String(formData.pickupAddress.zip || '').trim()}`.trim() : '',
            pickupHours: String(formData.pickupHours || '').trim(),
            hasLien: Boolean(formData.hasLien),
            lienholderName: String(formData.lienholderName || '').trim(),
            lienholderPhone: String(formData.lienholderPhone || '').trim(),
            loanAccountNumber: String(formData.loanAccountNumber || '').trim(),
            lastFourSSN: String(formData.lastFourSSN || '').trim()
          };
          
          deal.sellerPurchaseChecklist = {
            ...sanitizedFormData,
            submittedAt: new Date(),
            submittedBy: sellerEmail
          };
          
          // Update deal with seller information if not already present
          if (!deal.seller.email && sanitizedFormData.emailAddress) {
            deal.seller.email = sanitizedFormData.emailAddress;
          }
          
          if (!deal.seller.contact.address && sanitizedFormData.mailingAddress.street) {
            deal.seller.contact.address = sanitizedFormData.mailingAddress;
          }
        }
        
                // Add activity log entry for seller document upload
        // Note: We don't add userId for seller uploads since they're not system users
        deal.activityLog.push({
          action: 'seller_documents_uploaded',
          timestamp: new Date(),
          description: `Seller uploaded and auto-approved ${uploadedFiles.length} document(s) via secure link`,
          metadata: { 
            uploadedFiles: uploadedFiles.map(f => f.originalName),
            sellerEmail: sellerEmail,
            uploadToken: token.substring(0, 8) + '...',
            autoApproved: true,
            consentAgreement: Boolean(formData?.consentAgreement)
          }
        });

        await deal.save();

        // Auto-approval email notification removed as requested
        console.log(`[SELLER UPLOAD] Purchase checklist completed for ${vehicleInfo} - auto-approval email notification disabled`);
    }

    // Clean up the token after successful upload
    global.sellerUploadTokens.delete(token);

    res.json({
      success: true,
      message: `Purchase checklist completed successfully with ${uploadedFiles.length} document(s) auto-approved`,
      uploadedFiles: uploadedFiles.map(file => ({
        originalName: file.originalName,
        uploadedAt: file.uploadedAt,
        documentType: file.documentType || 'seller_document',
        approved: true
      })),
      dealId: dealId,
      documentsAdded: uploadedFiles.length,
      autoApproved: true
    });

  } catch (error) {
    console.error('[SELLER UPLOAD] Error uploading documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload documents',
      error: error.message
    });
  }
});

// Verify upload token with enhanced security
router.get('/verify/:token', securityMiddleware, async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('[SELLER UPLOAD] Verifying token:', {
      token: token,
      tokenLength: token ? token.length : 0,
      isValidHex: token ? /^[a-f0-9]+$/i.test(token) : false
    });

    // Validate token format (allow 63-64 character hex strings)
    if (!token || token.length < 63 || token.length > 64 || !/^[a-f0-9]+$/i.test(token)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    global.sellerUploadTokens = global.sellerUploadTokens || new Map();
    console.log('[SELLER UPLOAD] Available tokens:', Array.from(global.sellerUploadTokens.keys()));
    const uploadInfo = global.sellerUploadTokens.get(token);

    if (!uploadInfo) {
      console.log('[SELLER UPLOAD] Token not found in global map');
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired upload link. This link may have expired or the server was restarted. Please request a new upload link.'
      });
    }

    if (new Date() > uploadInfo.expiresAt) {
      global.sellerUploadTokens.delete(token);
      return res.status(410).json({
        success: false,
        message: 'Upload link has expired'
      });
    }

    // Check if max upload attempts reached
    if (uploadInfo.uploadAttempts >= uploadInfo.maxUploadAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Maximum upload attempts reached for this link'
      });
    }

    res.json({
      success: true,
      uploadInfo: {
        vehicleInfo: uploadInfo.vehicleInfo,
        vin: uploadInfo.vin,
        sellerEmail: uploadInfo.sellerEmail,
        remainingAttempts: uploadInfo.maxUploadAttempts - uploadInfo.uploadAttempts,
        expiresAt: uploadInfo.expiresAt
      }
    });

  } catch (error) {
    console.error('[SELLER UPLOAD] Error verifying token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify upload link',
      error: error.message
    });
  }
});

module.exports = router; 