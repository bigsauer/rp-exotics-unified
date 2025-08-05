const { Resend } = require('resend');

// Initialize Resend with API key from environment variable (only if key exists)
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.log('[EMAIL SERVICE] Resend API key not found, email service will be disabled');
}

// Helper function to check if email service is available
const checkEmailService = () => {
  if (!resend) {
    console.log('[EMAIL SERVICE] Email service disabled');
    return false;
  }
  return true;
};

// Email service functions
const emailService = {
  // Generic email sending function
  async sendEmail({ to, subject, text, html }) {
    if (!checkEmailService()) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <noreply@slipstreamdocs.com>',
        to: [to],
        subject: subject,
        text: text,
        html: html
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error };
      }

      console.log('Email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error };
    }
  },

  // Send deal status update notification
  async sendDealStatusUpdate(to, dealData) {
    if (!checkEmailService()) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <noreply@slipstreamdocs.com>',
        to: [to],
        subject: `Deal Status Update - ${dealData.vin}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1f2937, #111827); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #10b981;">RP Exotics</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8;">Deal Management System</p>
            </div>
            
            <div style="padding: 30px; background: white;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Deal Status Update</h2>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1f2937; margin-top: 0;">Vehicle Information</h3>
                <p><strong>VIN:</strong> ${dealData.vin}</p>
                <p><strong>Year:</strong> ${dealData.year || 'N/A'}</p>
                <p><strong>Make:</strong> ${dealData.make || 'N/A'}</p>
                <p><strong>Model:</strong> ${dealData.model || 'N/A'}</p>
              </div>
              
              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1e40af; margin-top: 0;">Status Update</h3>
                <p><strong>Current Stage:</strong> ${dealData.currentStage}</p>
                <p><strong>Last Updated:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://slipstreamdocs.com/deals/status" 
                   style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Deal Details
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280;">
              <p style="margin: 0;">This is an automated message from RP Exotics Deal Management System</p>
            </div>
          </div>
        `
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error };
      }

      console.log('Email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error };
    }
  },

  // Send document upload notification
  async sendDocumentUploadNotification(to, dealData, documentType) {
    if (!checkEmailService()) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <noreply@slipstreamdocs.com>',
        to: [to],
        subject: `Document Uploaded - ${documentType} for ${dealData.vin}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1f2937, #111827); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #10b981;">RP Exotics</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8;">Document Management</p>
            </div>
            
            <div style="padding: 30px; background: white;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Document Uploaded</h2>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #166534; margin-top: 0;">Document Information</h3>
                <p><strong>Document Type:</strong> ${documentType}</p>
                <p><strong>VIN:</strong> ${dealData.vin}</p>
                <p><strong>Upload Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/status" 
                   style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Review Documents
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280;">
              <p style="margin: 0;">This is an automated message from RP Exotics Deal Management System</p>
            </div>
          </div>
        `
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error };
      }

      console.log('Document notification email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error };
    }
  },

  // Send new deal notification
  async sendNewDealNotification(to, dealData) {
    if (!checkEmailService()) {
      return { success: false, error: 'Email service not configured' };
    }
    try {
      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <noreply@slipstreamdocs.com>',
        to: [to],
        subject: `New Deal Created - ${dealData.vin}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1f2937, #111827); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #10b981;">RP Exotics</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8;">New Deal Notification</p>
            </div>
            <div style="padding: 30px; background: white;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">New Deal Created</h2>
              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1e40af; margin-top: 0;">Deal Information</h3>
                <p><strong>VIN:</strong> ${dealData.vin}</p>
                <p><strong>Stock Number:</strong> ${dealData.rpStockNumber || 'N/A'}</p>
                <p><strong>Vehicle:</strong> ${dealData.year} ${dealData.make} ${dealData.model}</p>
                <p><strong>Deal Type:</strong> ${dealData.dealType}</p>
                <p><strong>Created By:</strong> ${dealData.salesperson || 'N/A'}</p>
                <p><strong>Created:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Status:</strong> ${dealData.currentStage}</p>
              </div>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1f2937; margin-top: 0;">Contact Information</h3>
                <p><strong>Seller:</strong> ${dealData.seller?.name || 'N/A'}</p>
                <p><strong>Buyer:</strong> ${dealData.buyer?.name || 'N/A'}</p>
              </div>
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://slipstreamdocs.com/deals/status" 
                   style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Deal Details
                </a>
              </div>
            </div>
            <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280;">
              <p style="margin: 0;">This is an automated message from RP Exotics Deal Management System</p>
            </div>
          </div>
        `
      });
      if (error) {
        console.error('Resend error:', error);
        return { success: false, error };
      }
      console.log('New deal notification email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error };
    }
  },

  // Send system alert
  async sendSystemAlert(to, alertData) {
    if (!checkEmailService()) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <noreply@slipstreamdocs.com>',
        to: [to],
        subject: `System Alert - ${alertData.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: white;">RP Exotics</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8;">System Alert</p>
            </div>
            
            <div style="padding: 30px; background: white;">
              <h2 style="color: #dc2626; margin-bottom: 20px;">${alertData.title}</h2>
              
              <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #991b1b; margin-top: 0;">Alert Details</h3>
                <p><strong>Type:</strong> ${alertData.type}</p>
                <p><strong>Priority:</strong> ${alertData.priority}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Message:</strong> ${alertData.message}</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://slipstreamdocs.com" 
                   style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Access System
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280;">
              <p style="margin: 0;">This is an automated message from RP Exotics Deal Management System</p>
            </div>
          </div>
        `
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error };
      }

      console.log('System alert email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error };
    }
  },

  // Send deal receipt with all generated documents
  async sendDealReceipt(to, dealData, generatedDocuments) {
    if (!checkEmailService()) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      console.log(`[EMAIL][sendDealReceipt] Attempting to send deal receipt to: ${to}`);
      console.log(`[EMAIL][sendDealReceipt] Deal Data:`, dealData);
      console.log(`[EMAIL][sendDealReceipt] Generated Documents:`, generatedDocuments);
      
      // Prepare attachments array
      const attachments = [];
      
      // Process generated documents and add them as attachments
      if (generatedDocuments && generatedDocuments.length > 0) {
        for (const doc of generatedDocuments) {
          if (doc.filePath) {
            try {
              // Download the file from S3 or local storage
              const fs = require('fs-extra');
              const path = require('path');
              const cloudStorage = require('./cloudStorage');
              
              let fileBuffer;
              let fileName;
              
              if (doc.filePath.startsWith('http')) {
                // File is in S3, download it
                console.log(`[EMAIL][sendDealReceipt] Downloading file from S3: ${doc.filePath}`);
                
                // Extract filename from URL
                const urlParts = doc.filePath.split('/');
                const fileNameFromUrl = urlParts[urlParts.length - 1];
                
                const downloadResult = await cloudStorage.downloadFile(fileNameFromUrl);
                if (downloadResult.success) {
                  fileBuffer = downloadResult.data; // Use 'data' instead of 'buffer'
                  fileName = doc.fileName || fileNameFromUrl;
                } else {
                  console.warn(`[EMAIL][sendDealReceipt] Failed to download file from S3: ${doc.filePath}`);
                  continue;
                }
              } else {
                // File is local, read it
                console.log(`[EMAIL][sendDealReceipt] Reading local file: ${doc.filePath}`);
                const fileExists = await fs.pathExists(doc.filePath);
                if (fileExists) {
                  fileBuffer = await fs.readFile(doc.filePath);
                  fileName = doc.fileName || path.basename(doc.filePath);
                } else {
                  console.warn(`[EMAIL][sendDealReceipt] Local file not found: ${doc.filePath}`);
                  continue;
                }
              }
              
              // Add to attachments array
              attachments.push({
                filename: fileName,
                content: fileBuffer
              });
              
              console.log(`[EMAIL][sendDealReceipt] Added attachment: ${fileName}`);
            } catch (attachmentError) {
              console.error(`[EMAIL][sendDealReceipt] Error processing attachment ${doc.name}:`, attachmentError);
              // Continue with other attachments even if one fails
            }
          }
        }
      }
      
      // Build the documents list HTML
      let documentsList = '';
      if (generatedDocuments && generatedDocuments.length > 0) {
        const attachedDocs = generatedDocuments.filter(doc => doc.filePath).map(doc => doc.name);
        const pendingDocs = generatedDocuments.filter(doc => !doc.filePath).map(doc => doc.name);
        
        if (attachedDocs.length > 0) {
          documentsList = `
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #166534; margin-top: 0;">Generated Documents (Attached)</h3>
              <ul style="margin: 0; padding-left: 20px;">
                ${attachedDocs.map(doc => `<li style="margin-bottom: 8px; color: #166534;">${doc}</li>`).join('')}
              </ul>
            </div>
          `;
        }
        
        if (pendingDocs.length > 0) {
          documentsList += `
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #92400e; margin-top: 0;">Documents Being Processed</h3>
              <ul style="margin: 0; padding-left: 20px;">
                ${pendingDocs.map(doc => `<li style="margin-bottom: 8px; color: #92400e;">${doc}</li>`).join('')}
              </ul>
            </div>
          `;
        }
      } else {
        documentsList = `
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #92400e; margin-top: 0;">Documents Status</h3>
            <p style="color: #92400e; margin: 0;">Documents are being processed and will be available shortly.</p>
          </div>
        `;
      }

      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <noreply@slipstreamdocs.com>',
        to: [to],
        subject: `Deal Receipt - ${dealData.vin} (${dealData.rpStockNumber || 'N/A'})`,
        attachments: attachments.length > 0 ? attachments : undefined,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1f2937, #111827); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #10b981;">RP Exotics</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8;">Deal Receipt & Documents</p>
            </div>
            
            <div style="padding: 30px; background: white;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Deal Successfully Created</h2>
              
              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1e40af; margin-top: 0;">Deal Information</h3>
                <p><strong>VIN:</strong> ${dealData.vin}</p>
                <p><strong>Stock Number:</strong> ${dealData.rpStockNumber || 'N/A'}</p>
                <p><strong>Vehicle:</strong> ${dealData.year} ${dealData.make} ${dealData.model}</p>
                <p><strong>Deal Type:</strong> ${dealData.dealType}</p>
                <p><strong>Created By:</strong> ${dealData.salesperson || 'N/A'}</p>
                <p><strong>Created:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1f2937; margin-top: 0;">Contact Information</h3>
                <p><strong>Seller:</strong> ${dealData.seller?.name || 'N/A'}</p>
                <p><strong>Buyer:</strong> ${dealData.buyer?.name || 'N/A'}</p>
              </div>

              ${documentsList}
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://slipstreamdocs.com/deals/status" 
                   style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                  View Deal Status
                </a>
                <a href="https://slipstreamdocs.com/deals/new" 
                   style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Create New Deal
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280;">
              <p style="margin: 0;">This is an automated receipt from RP Exotics Deal Management System</p>
              <p style="margin: 5px 0 0 0; font-size: 12px;">Thank you for using our system!</p>
            </div>
          </div>
        `
      });

      if (error) {
        console.error('[EMAIL][sendDealReceipt] Resend error:', error);
        return { success: false, error };
      }

      console.log('[EMAIL][sendDealReceipt] Deal receipt email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('[EMAIL][sendDealReceipt] Email service error:', error);
      return { success: false, error };
    }
  },

  // Send password reset request to admin
  async sendPasswordResetRequest({ userEmail, newPassword, userName, adminEmail }) {
    if (!checkEmailService()) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <noreply@slipstreamdocs.com>',
        to: [adminEmail],
        subject: `Password Reset Request - ${userName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1f2937, #111827); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #10b981;">RP Exotics</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8;">Password Reset Request</p>
            </div>
            
            <div style="padding: 30px; background: white;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request</h2>
              
              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; margin-top: 0;">User Information</h3>
                <p><strong>Name:</strong> ${userName}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p><strong>Requested New Password:</strong> ${newPassword}</p>
                <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1e40af; margin-top: 0;">Action Required</h3>
                <p>Please review this password reset request and approve or reject it through the admin panel.</p>
                <p><strong>Note:</strong> The user has requested to change their password to: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">${newPassword}</code></p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px;">This request will expire in 24 hours for security purposes.</p>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280;">
              <p style="margin: 0;">This is an automated message from RP Exotics Deal Management System</p>
            </div>
          </div>
        `
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error };
      }

      console.log('Password reset request email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error };
    }
  },

  // Send password reset confirmation to user
  async sendPasswordResetConfirmation({ userEmail, userName }) {
    if (!checkEmailService()) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <noreply@slipstreamdocs.com>',
        to: [userEmail],
        subject: 'Password Reset Approved - RP Exotics',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1f2937, #111827); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #10b981;">RP Exotics</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8;">Password Reset Confirmation</p>
            </div>
            
            <div style="padding: 30px; background: white;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Approved</h2>
              
              <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
                <h3 style="color: #065f46; margin-top: 0;">✅ Request Approved</h3>
                <p>Hello ${userName},</p>
                <p>Your password reset request has been approved by the administrator.</p>
                <p>You can now log in to your account using your new password.</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://slipstreamdocs.com" 
                   style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Login to Your Account
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280;">
              <p style="margin: 0;">This is an automated message from RP Exotics Deal Management System</p>
            </div>
          </div>
        `
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error };
      }

      console.log('Password reset confirmation email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error };
    }
  },

  // Send password reset rejection to user
  async sendPasswordResetRejection({ userEmail, userName }) {
    if (!checkEmailService()) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <noreply@slipstreamdocs.com>',
        to: [userEmail],
        subject: 'Password Reset Request Rejected - RP Exotics',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1f2937, #111827); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #10b981;">RP Exotics</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8;">Password Reset Update</p>
            </div>
            
            <div style="padding: 30px; background: white;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request Rejected</h2>
              
              <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
                <h3 style="color: #991b1b; margin-top: 0;">❌ Request Rejected</h3>
                <p>Hello ${userName},</p>
                <p>Your password reset request has been rejected by the administrator.</p>
                <p>Please contact the administrator directly if you need assistance with your account.</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://slipstreamdocs.com" 
                   style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Return to Login
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280;">
              <p style="margin: 0;">This is an automated message from RP Exotics Deal Management System</p>
            </div>
          </div>
        `
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, error };
      }

      console.log('Password reset rejection email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error };
    }
  },

  // Send client signature request
  async sendClientSignatureRequest({ clientEmail, signatureId, documentType, dealInfo, signerName }) {
    if (!checkEmailService()) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      // Generate the signature URL using the production frontend URL
      const frontendUrl = 'https://slipstreamdocs.com';
      const signatureUrl = `${frontendUrl}/sign/${signatureId}`;
      
      console.log('[EMAIL][sendClientSignatureRequest] Sending signature request', {
        clientEmail,
        signatureId,
        documentType,
        signatureUrl,
        frontendUrl
      });

      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <noreply@slipstreamdocs.com>',
        to: [clientEmail],
        subject: `Document Signature Required - ${documentType} for ${dealInfo?.vehicle || 'Vehicle Deal'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1f2937, #111827); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #10b981;">RP Exotics</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8;">Digital Document Signature</p>
            </div>
            
            <div style="padding: 30px; background: white;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Document Signature Required</h2>
              
              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1e40af; margin-top: 0;">Document Information</h3>
                <p><strong>Document Type:</strong> ${documentType}</p>
                <p><strong>Vehicle:</strong> ${dealInfo?.vehicle || 'N/A'}</p>
                <p><strong>VIN:</strong> ${dealInfo?.vin || 'N/A'}</p>
                <p><strong>Stock Number:</strong> ${dealInfo?.rpStockNumber || dealInfo?.stockNumber || 'N/A'}</p>
                <p><strong>Requested By:</strong> ${signerName || 'RP Exotics Finance Team'}</p>
                <p><strong>Request Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #166534; margin-top: 0;">📋 Action Required</h3>
                <p>Please click the button below to review and sign the document electronically. This process is secure and legally binding.</p>
                <p><strong>Important:</strong> This signature link will expire in 7 days for security purposes.</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${signatureUrl}" 
                   style="background: #10b981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  📝 Sign Document Online
                </a>
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h4 style="color: #92400e; margin-top: 0; font-size: 14px;">🔒 Security Notice</h4>
                <p style="color: #92400e; font-size: 12px; margin: 0;">
                  This is a secure, legally binding electronic signature process. Your signature will be recorded with full audit trail including IP address, timestamp, and consent verification.
                </p>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280;">
              <p style="margin: 0; font-size: 12px;">This is an automated message from RP Exotics Deal Management System</p>
              <p style="margin: 5px 0 0 0; font-size: 11px;">If you have any questions, please contact RP Exotics directly.</p>
            </div>
          </div>
        `
      });

      if (error) {
        console.error('[EMAIL][sendClientSignatureRequest] Resend error:', error);
        return { success: false, error };
      }

      console.log('[EMAIL][sendClientSignatureRequest] Client signature request email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('[EMAIL][sendClientSignatureRequest] Email service error:', error);
      return { success: false, error };
    }
  },

  // Send signature completion notification
  async sendSignatureCompletionNotification({ clientEmail, signatureId, documentType, dealInfo, signerName }) {
    if (!checkEmailService()) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      console.log('[EMAIL][sendSignatureCompletionNotification] Sending signature completion notification', {
        clientEmail,
        signatureId,
        documentType
      });

      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <noreply@slipstreamdocs.com>',
        to: [clientEmail],
        subject: `Document Signed Successfully - ${documentType} for ${dealInfo?.vehicle || 'Vehicle Deal'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1f2937, #111827); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #10b981;">RP Exotics</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.8;">Digital Document Signature</p>
            </div>
            
            <div style="padding: 30px; background: white;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">✅ Document Signed Successfully</h2>
              
              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1e40af; margin-top: 0;">Document Information</h3>
                <p><strong>Document Type:</strong> ${documentType}</p>
                <p><strong>Vehicle:</strong> ${dealInfo?.vehicle || 'N/A'}</p>
                <p><strong>VIN:</strong> ${dealInfo?.vin || 'N/A'}</p>
                <p><strong>Stock Number:</strong> ${dealInfo?.rpStockNumber || dealInfo?.stockNumber || 'N/A'}</p>
                <p><strong>Signed By:</strong> ${signerName || 'Client'}</p>
                <p><strong>Signature Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Signature Time:</strong> ${new Date().toLocaleTimeString()}</p>
              </div>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #166534; margin-top: 0;">🎉 Signature Complete</h3>
                <p>Your document has been successfully signed and is now legally binding. The signature includes:</p>
                <ul style="color: #166534; margin: 10px 0;">
                  <li>✅ Intent to sign verification</li>
                  <li>✅ Consent to electronic business</li>
                  <li>✅ Complete audit trail with timestamp</li>
                  <li>✅ IP address and device information</li>
                  <li>✅ ESIGN Act and UETA compliance</li>
                </ul>
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h4 style="color: #92400e; margin-top: 0; font-size: 14px;">📋 Next Steps</h4>
                <p style="color: #92400e; font-size: 12px; margin: 0;">
                  RP Exotics will process your signed document and contact you with next steps. Please keep this email for your records.
                </p>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280;">
              <p style="margin: 0; font-size: 12px;">This is an automated message from RP Exotics Deal Management System</p>
              <p style="margin: 5px 0 0 0; font-size: 11px;">If you have any questions, please contact RP Exotics directly.</p>
            </div>
          </div>
        `
      });

      if (error) {
        console.error('[EMAIL][sendSignatureCompletionNotification] Resend error:', error);
        return { success: false, error };
      }

      console.log('[EMAIL][sendSignatureCompletionNotification] Signature completion notification sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('[EMAIL][sendSignatureCompletionNotification] Email service error:', error);
      return { success: false, error };
    }
  }
};

module.exports = emailService; 