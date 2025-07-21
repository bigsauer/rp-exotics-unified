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
  // Send deal status update notification
  async sendDealStatusUpdate(to, dealData) {
    if (!checkEmailService()) {
      return { success: false, error: 'Email service not configured' };
    }
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <onboarding@resend.dev>',
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
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/status" 
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
        from: 'RP Exotics <onboarding@resend.dev>',
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
        from: 'RP Exotics <onboarding@resend.dev>',
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
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/status" 
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
        from: 'RP Exotics <onboarding@resend.dev>',
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
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
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
      // Build the documents list HTML
      let documentsList = '';
      if (generatedDocuments && generatedDocuments.length > 0) {
        documentsList = `
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #166534; margin-top: 0;">Generated Documents</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${generatedDocuments.map(doc => `<li style="margin-bottom: 8px; color: #166534;">${doc.name}</li>`).join('')}
            </ul>
          </div>
        `;
      } else {
        documentsList = `
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #92400e; margin-top: 0;">Documents Status</h3>
            <p style="color: #92400e; margin: 0;">Documents are being processed and will be available shortly.</p>
          </div>
        `;
      }

      const { data, error } = await resend.emails.send({
        from: 'RP Exotics <onboarding@resend.dev>',
        to: [to],
        subject: `Deal Receipt - ${dealData.vin} (${dealData.rpStockNumber || 'N/A'})`,
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
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/status" 
                   style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                  View Deal Status
                </a>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/new" 
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
  }
};

module.exports = emailService; 