const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');

// Test email endpoint
router.post('/test', async (req, res) => {
  try {
    const { to, type } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    let result;
    
    switch (type) {
      case 'deal-status':
        result = await emailService.sendDealStatusUpdate(to, {
          vin: '1FTFW1RG2KFC38883',
          year: '2019',
          make: 'Ford',
          model: 'F-150',
          currentStage: 'documentation'
        });
        break;
        
      case 'document-upload':
        result = await emailService.sendDocumentUploadNotification(to, {
          vin: '1FTFW1RG2KFC38883'
        }, 'Bill of Sale');
        break;
        
      case 'new-deal':
        result = await emailService.sendNewDealNotification(to, {
          vin: '1FTFW1RG2KFC38883',
          dealType: 'retail',
          currentStage: 'initial-contact'
        });
        break;
        
      case 'system-alert':
        result = await emailService.sendSystemAlert(to, {
          title: 'System Maintenance',
          type: 'Maintenance',
          priority: 'Medium',
          message: 'Scheduled maintenance will occur tonight at 2 AM EST.'
        });
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid email type' });
    }

    if (result.success) {
      res.json({ success: true, message: 'Email sent successfully', data: result.data });
    } else {
      res.status(500).json({ error: 'Failed to send email', details: result.error });
    }
  } catch (error) {
    console.error('Email route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send deal status update email
router.post('/deal-status', async (req, res) => {
  try {
    const { to, dealData } = req.body;
    
    if (!to || !dealData) {
      return res.status(400).json({ error: 'Email address and deal data are required' });
    }

    const result = await emailService.sendDealStatusUpdate(to, dealData);
    
    if (result.success) {
      res.json({ success: true, message: 'Deal status email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send deal status email' });
    }
  } catch (error) {
    console.error('Deal status email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send document upload notification
router.post('/document-upload', async (req, res) => {
  try {
    const { to, dealData, documentType } = req.body;
    
    if (!to || !dealData || !documentType) {
      return res.status(400).json({ error: 'Email address, deal data, and document type are required' });
    }

    const result = await emailService.sendDocumentUploadNotification(to, dealData, documentType);
    
    if (result.success) {
      res.json({ success: true, message: 'Document upload notification sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send document notification' });
    }
  } catch (error) {
    console.error('Document notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send new deal notification
router.post('/new-deal', async (req, res) => {
  try {
    const { to, dealData } = req.body;
    
    if (!to || !dealData) {
      return res.status(400).json({ error: 'Email address and deal data are required' });
    }

    const result = await emailService.sendNewDealNotification(to, dealData);
    
    if (result.success) {
      res.json({ success: true, message: 'New deal notification sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send new deal notification' });
    }
  } catch (error) {
    console.error('New deal notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send deal receipt (for testing)
router.post('/deal-receipt', async (req, res) => {
  try {
    const { to, dealData, generatedDocuments } = req.body;
    
    if (!to || !dealData) {
      return res.status(400).json({ error: 'Email address and deal data are required' });
    }

    const result = await emailService.sendDealReceipt(to, dealData, generatedDocuments || []);
    
    if (result.success) {
      res.json({ success: true, message: 'Deal receipt sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send deal receipt' });
    }
  } catch (error) {
    console.error('Deal receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 