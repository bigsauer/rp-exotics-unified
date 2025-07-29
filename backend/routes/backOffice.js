const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Deal = require('../models/Deal');
const DocumentType = require('../models/DocumentType');
const { authenticateToken, requireBackOfficeAccess } = require('../middleware/auth');
const StatusSyncService = require('../services/statusSyncService');

// Apply authentication and back office access middleware to all routes
router.use(authenticateToken);
router.use(requireBackOfficeAccess);

// Test route to verify router is working
router.get('/test', (req, res) => {
  console.log('[DEBUG][BackOffice] Test route hit');
  res.json({ message: 'BackOffice router is working' });
});

// Debug middleware for all backOffice routes
router.use((req, res, next) => {
  console.log(`[DEBUG][BackOffice] ${req.method} ${req.originalUrl} - Route hit`);
  next();
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.'), false);
    }
  }
});

// ============================================================================
// GET ROUTES
// ============================================================================

// Get all deals for back office with filtering
router.get('/deals', async (req, res) => {
  try {
    const { 
      search, 
      stage, 
      priority, 
      assignedTo, 
      dateFrom, 
      dateTo,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { vehicle: new RegExp(search, 'i') },
        { stockNumber: new RegExp(search, 'i') },
        { vin: new RegExp(search, 'i') },
        { 'seller.name': new RegExp(search, 'i') }
      ];
    }

    // Filters
    if (stage) query.currentStage = stage;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    
    if (dateFrom || dateTo) {
      query.purchaseDate = {};
      if (dateFrom) query.purchaseDate.$gte = new Date(dateFrom);
      if (dateTo) query.purchaseDate.$lte = new Date(dateTo);
    }

    const deals = await Deal.find(query)
      .populate('assignedTo', 'profile.displayName email')
      .populate('seller.dealerId', 'name company')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(); // .lean() added for speed

    const total = await Deal.countDocuments(query);

    // Transform deals for frontend
    const transformedDeals = deals.map(deal => ({
      id: deal._id.toString(),
      vehicle: deal.vehicle,
      vin: deal.vin,
      stockNumber: deal.stockNumber,
      purchaseDate: deal.purchaseDate,
      purchasePrice: deal.purchasePrice,
      currentStage: deal.currentStage,
      priority: deal.priority,
      assignedTo: deal.assignedTo,
      seller: deal.seller,
      completionPercentage: deal.completionPercentage,
      pendingDocumentsCount: deal.pendingDocumentsCount,
      overdueDocuments: deal.overdueDocuments,
      titleInfo: deal.titleInfo,
      financial: deal.financial,
      compliance: deal.compliance,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt
    }));

    res.json({
      success: true,
      data: transformedDeals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting deals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific deal with full documentation details
router.get('/deals/:id', async (req, res) => {
  try {
    console.log('[BACKOFFICE] Fetching deal with id:', req.params.id);
    const deal = await Deal.findById(req.params.id)
      .populate('assignedTo', 'profile.displayName email')
      .populate('seller.dealerId', 'name company contact')
      .populate('documents.uploadedBy', 'profile.displayName')
      .populate('documents.approvedBy', 'profile.displayName')
      .populate('workflowHistory.changedBy', 'profile.displayName')
      .populate('activityLog.userId', 'profile.displayName')
      .lean(); // .lean() added for speed
    if (!deal) {
      console.warn('[BACKOFFICE] Deal not found:', req.params.id);
      return res.status(404).json({ error: 'Deal not found' });
    }
    console.log('[BACKOFFICE] Deal found:', deal._id);
    let vehicleRecordDocuments = [];
    if (deal.vehicleRecordId) {
      console.log('[BACKOFFICE] Fetching vehicle record:', deal.vehicleRecordId);
      const VehicleRecord = require('../models/VehicleRecord');
      const vehicleRecord = await VehicleRecord.findById(deal.vehicleRecordId);
      if (vehicleRecord && Array.isArray(vehicleRecord.generatedDocuments)) {
        vehicleRecordDocuments = vehicleRecord.generatedDocuments;
        console.log('[BACKOFFICE] Vehicle record found, documents:', vehicleRecordDocuments.length);
      } else {
        console.log('[BACKOFFICE] Vehicle record not found or has no documents');
      }
    }
    const response = {
      deal,
      vehicleRecordDocuments
    };
    console.log('[BACKOFFICE] Final response object:', {
      dealId: deal._id,
      vehicleRecordDocumentsCount: vehicleRecordDocuments.length
    });
    return res.json(response);
  } catch (err) {
    console.error('[BACKOFFICE] Error fetching deal:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get document types configuration
router.get('/document-types', async (req, res) => {
  try {
    const documentTypes = await DocumentType.find({ isActive: true })
      .sort({ order: 1, name: 1 });
    
    res.json({ success: true, data: documentTypes });
  } catch (error) {
    console.error('Error getting document types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get back office dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await Deal.aggregate([
      {
        $group: {
          _id: '$currentStage',
          count: { $sum: 1 }
        }
      }
    ]);

    const pendingTasks = await Deal.aggregate([
      {
        $match: {
          currentStage: { $ne: 'deal-complete' }
        }
      },
      {
        $project: {
          pendingDocs: {
            $size: {
              $filter: {
                input: '$documents',
                cond: { $and: [{ $eq: ['$$this.required', true] }, { $eq: ['$$this.approved', false] }] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalPendingTasks: { $sum: '$pendingDocs' }
        }
      }
    ]);

    const priorityStats = await Deal.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        stageDistribution: stats,
        pendingTasks: pendingTasks[0]?.totalPendingTasks || 0,
        priorityDistribution: priorityStats
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// POST ROUTES
// ============================================================================

// Upload document for a deal
router.post('/deals/:id/documents/:documentType/upload',
  upload.single('document'),
  async (req, res) => {
    try {
      const { id, documentType } = req.params;
      const notes = req.body?.notes || '';

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const deal = await Deal.findById(id);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      // Get document type configuration
      const docTypeConfig = await DocumentType.findOne({ type: documentType });
      if (!docTypeConfig) {
        return res.status(400).json({ error: 'Invalid document type' });
      }

      // Check if document already exists and update or create new
      const existingDocIndex = deal.documents.findIndex(doc => doc.type === documentType);
      
      const newDocument = {
        type: documentType,
        documentId: documentType === 'extra_doc' ? `extra_doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : documentType,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploaded: true,
        uploadedAt: new Date(),
        uploadedBy: req.user?.id || null,
        approved: false,
        required: docTypeConfig.required,
        notes: notes || '',
        version: existingDocIndex >= 0 ? deal.documents[existingDocIndex].version + 1 : 1
      };

      if (existingDocIndex >= 0) {
        deal.documents[existingDocIndex] = newDocument;
      } else {
        deal.documents.push(newDocument);
      }

      // Add activity log entry
      deal.activityLog.push({
        action: 'document_uploaded',
        timestamp: new Date(),
        userId: req.user?.id || null,
        description: `Uploaded ${docTypeConfig.name}`,
        metadata: { documentType, fileName: req.file.originalname }
      });

      deal.updatedAt = new Date();
      deal.updatedBy = req.user?.id || null;

      await deal.save();

      res.json({ 
        success: true,
        message: 'Document uploaded successfully', 
        data: newDocument 
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================================================
// PUT ROUTES
// ============================================================================

// Update deal stage
router.put('/deals/:id/stage', async (req, res) => {
  console.log('[DEBUG][UpdateStatus] Route hit!');
  console.log('[DEBUG][UpdateStatus] Headers:', req.headers);
  console.log('[DEBUG][UpdateStatus] User:', req.user);
  console.log('[DEBUG][UpdateStatus] Authorization header:', req.headers.authorization);
  console.log('[DEBUG][UpdateStatus] Request body:', req.body);
  console.log('[DEBUG][UpdateStatus] Request params:', req.params);
  try {
    const { id } = req.params;
    const { stage, notes, lienStatus, lienEta } = req.body;

    console.log('[DEBUG][UpdateStatus] Stage from body:', stage);
    console.log('[DEBUG][UpdateStatus] Notes from body:', notes);
    console.log('[DEBUG][UpdateStatus] Lien status from body:', lienStatus);
    console.log('[DEBUG][UpdateStatus] Lien ETA from body:', lienEta);

    if (!stage) {
      console.log('[DEBUG][UpdateStatus] Stage is missing from request body');
      return res.status(400).json({ error: 'Stage is required' });
    }

    const validStages = [
      // Wholesale stages
      'contract-received',
      'docs-signed',
      'title-processing',
      'funds-disbursed',
      'title-received',
      'deal-complete',
      // Retail stages
      'vehicle-acquired',
      'inspection-complete',
      'photos-complete',
      'listing-ready',
      'listed-active',
      'buyer-contract',
      'financing-approved',
      'delivery-scheduled',
      // Auction stages
      'transport-arranged',
      'vehicle-arrived',
      'ready-for-sale'
    ];
    if (!validStages.includes(stage)) {
      console.log('[DEBUG][UpdateStatus] Invalid stage:', stage);
      return res.status(400).json({ error: 'Invalid stage' });
    }

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const previousStage = deal.currentStage;
    deal.currentStage = stage;

    // Update lien status if provided for title-processing stage
    if (stage === 'title-processing' && (lienStatus || lienEta)) {
      if (!deal.titleInfo) {
        deal.titleInfo = {};
      }
      if (lienStatus) {
        deal.titleInfo.lienStatus = lienStatus;
      }
      if (lienEta) {
        deal.titleInfo.lienEta = new Date(lienEta);
      }
      
      // Add lien status to activity log
      deal.activityLog.push({
        action: 'lien_status_updated',
        timestamp: new Date(),
        userId: req.user?.id || null,
        description: `Lien status updated to ${lienStatus}${lienEta ? ` with ETA: ${lienEta}` : ''}`,
        metadata: { lienStatus, lienEta }
      });
    }

    // Add to workflow history
    deal.workflowHistory.push({
      stage,
      timestamp: new Date(),
      changedBy: req.user?.id || null,
      notes: notes || '',
      previousStage
    });

    // Add activity log entry
    deal.activityLog.push({
      action: 'stage_changed',
      timestamp: new Date(),
      userId: req.user?.id || null,
      description: `Stage changed from ${previousStage} to ${stage}`,
      metadata: { previousStage, newStage: stage, notes }
    });

    deal.updatedAt = new Date();
    deal.updatedBy = req.user?.id || null;

    await deal.save();

    // Automatically sync to sales system
    try {
      await StatusSyncService.syncFinanceToSales(deal._id);
      console.log(`[BACKOFFICE] Auto-synced deal ${deal._id} to sales system after stage update`);
    } catch (syncError) {
      console.error(`[BACKOFFICE] Error auto-syncing deal ${deal._id} to sales system:`, syncError);
      // Don't fail the request if sync fails - just log the error
      // The main deal update was successful, so we should still return success
    }

    res.json({ 
      success: true,
      message: 'Deal stage updated successfully', 
      data: deal 
    });
  } catch (error) {
    console.error('[DEBUG][UpdateStatus] Error updating deal stage:', error);
    console.error('[DEBUG][UpdateStatus] Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Approve or reject document
router.put('/deals/:id/documents/:documentType/approval', async (req, res) => {
  try {
    const { id, documentType } = req.params;
    const { approved, notes } = req.body;

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const documentIndex = deal.documents.findIndex(doc => doc.type === documentType);
    if (documentIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    deal.documents[documentIndex].approved = approved;
    deal.documents[documentIndex].approvedAt = new Date();
    deal.documents[documentIndex].approvedBy = req.user?.id || null;
    if (notes) {
      deal.documents[documentIndex].notes = notes;
    }

    // Add activity log entry
    deal.activityLog.push({
      action: approved ? 'document_approved' : 'document_rejected',
      timestamp: new Date(),
      userId: req.user?.id || null,
      description: `${approved ? 'Approved' : 'Rejected'} ${documentType}`,
      metadata: { documentType, approved, notes }
    });

    deal.updatedAt = new Date();
    deal.updatedBy = req.user?.id || null;

    await deal.save();

    res.json({ 
      success: true,
      message: `Document ${approved ? 'approved' : 'rejected'} successfully`, 
      data: deal.documents[documentIndex] 
    });
  } catch (error) {
    console.error('Error updating document approval:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update title information
router.put('/deals/:id/title', async (req, res) => {
  try {
    const { id } = req.params;
    const titleData = req.body;

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Update title information
    deal.titleInfo = { ...deal.titleInfo, ...titleData };

    // Add activity log entry
    deal.activityLog.push({
      action: 'title_updated',
      timestamp: new Date(),
      userId: req.user?.id || null,
      description: 'Title information updated',
      metadata: titleData
    });

    deal.updatedAt = new Date();
    deal.updatedBy = req.user?.id || null;

    await deal.save();

    res.json({ 
      success: true,
      message: 'Title information updated successfully', 
      data: deal.titleInfo 
    });
  } catch (error) {
    console.error('Error updating title info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign deal to user
router.put('/deals/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const previousAssignee = deal.assignedTo;
    deal.assignedTo = assignedTo;

    // Add activity log entry
    deal.activityLog.push({
      action: 'deal_assigned',
      timestamp: new Date(),
      userId: req.user?.id || null,
      description: `Deal assigned to user`,
      metadata: { previousAssignee, newAssignee: assignedTo }
    });

    deal.updatedAt = new Date();
    deal.updatedBy = req.user?.id || null;

    await deal.save();

    res.json({ 
      success: true,
      message: 'Deal assigned successfully', 
      data: deal 
    });
  } catch (error) {
    console.error('Error assigning deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update compliance information
router.put('/deals/:id/compliance', async (req, res) => {
  try {
    const { id } = req.params;
    const complianceData = req.body;

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Update compliance information
    deal.compliance = { ...deal.compliance, ...complianceData };

    // Add activity log entry
    deal.activityLog.push({
      action: 'compliance_updated',
      timestamp: new Date(),
      userId: req.user?.id || null,
      description: 'Compliance information updated',
      metadata: complianceData
    });

    deal.updatedAt = new Date();
    deal.updatedBy = req.user?.id || null;

    await deal.save();

    res.json({ 
      success: true,
      message: 'Compliance information updated successfully', 
      data: deal.compliance 
    });
  } catch (error) {
    console.error('Error updating compliance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update deal information and regenerate documents
router.put('/deals/:id/update-and-regenerate', authenticateToken, requireBackOfficeAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('[BACKOFFICE] Updating deal and regenerating documents for deal:', id);
    console.log('[BACKOFFICE] Update data:', updateData);

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check if user has permission to edit this deal
    if (req.user.role !== 'admin' && req.user.role !== 'finance') {
      return res.status(403).json({ error: 'Insufficient permissions to edit deals' });
    }

    // Helper function to parse address string into parts
    const parseAddress = (addressString) => {
      if (!addressString) return { street: '', city: '', state: '', zip: '' };
      const parts = addressString.split(',').map(s => s.trim());
      return {
        street: parts[0] || '',
        city: parts[1] || '',
        state: parts[2] || '',
        zip: parts[3] || ''
      };
    };

    // Update deal fields
    const fieldsToUpdate = [
      'seller.name',
      'seller.licenseNumber',
      'seller.contact.phone',
      'seller.contact.email',
      'buyer.name',
      'buyer.company',
      'buyer.licenseNumber',
      'buyer.contact.phone',
      'buyer.contact.email',
      'buyer.tier',
      'purchasePrice',
      'listPrice',
      'killPrice',
      'mileage',
      'color',
      'exteriorColor',
      'interiorColor',
      'rpStockNumber',
      'notes',
      'generalNotes'
    ];

    const updateObject = {};
    fieldsToUpdate.forEach(field => {
      if (updateData[field] !== undefined) {
        updateObject[field] = updateData[field];
      }
    });

    // Handle simplified address format
    if (updateData['seller.contact.address'] !== undefined) {
      const parsedAddress = parseAddress(updateData['seller.contact.address']);
      updateObject['seller.contact.address'] = parsedAddress;
    }

    if (updateData['buyer.contact.address'] !== undefined) {
      const parsedAddress = parseAddress(updateData['buyer.contact.address']);
      updateObject['buyer.contact.address'] = parsedAddress;
    }

    // Update the deal
    const updatedDeal = await Deal.findByIdAndUpdate(
      id,
      { $set: updateObject },
      { new: true }
    );

    if (!updatedDeal) {
      return res.status(404).json({ error: 'Failed to update deal' });
    }

    // Add activity log entry
    updatedDeal.activityLog.push({
      action: 'deal_updated',
      timestamp: new Date(),
      userId: req.user.id,
      description: 'Deal information updated and documents regenerated',
      metadata: { updatedFields: Object.keys(updateObject) }
    });

    await updatedDeal.save();

    // Regenerate documents if requested
    if (updateData.regenerateDocuments) {
      console.log('[BACKOFFICE] Regenerating documents for deal:', id);
      
      try {
        const documentGenerator = require('../services/documentGenerator');
        const VehicleRecord = require('../models/VehicleRecord');
        
        // Get the vehicle record
        const vehicleRecord = await VehicleRecord.findById(updatedDeal.vehicleRecordId);
        if (!vehicleRecord) {
          console.warn('[BACKOFFICE] No vehicle record found for deal:', id);
        } else {
          // Prepare deal data for document generation
          const dealDataForDocs = {
            ...updatedDeal.toObject(),
            sellerInfo: {
              name: updatedDeal.seller.name,
              address: updatedDeal.seller.contact?.address || updatedDeal.seller.address,
              phone: updatedDeal.seller.contact?.phone || updatedDeal.seller.phone,
              email: updatedDeal.seller.contact?.email || updatedDeal.seller.email,
              licenseNumber: updatedDeal.seller.licenseNumber,
              company: updatedDeal.seller.company
            },
            buyerInfo: updatedDeal.buyer ? {
              name: updatedDeal.buyer.name,
              address: updatedDeal.buyer.contact?.address || updatedDeal.buyer.address,
              phone: updatedDeal.buyer.contact?.phone || updatedDeal.buyer.phone,
              email: updatedDeal.buyer.contact?.email || updatedDeal.buyer.email,
              licenseNumber: updatedDeal.buyer.licenseNumber,
              company: updatedDeal.buyer.company
            } : null,
            stockNumber: updatedDeal.rpStockNumber || 'N/A',
            color: updatedDeal.color || updatedDeal.exteriorColor,
            mileage: updatedDeal.mileage
          };

          // Generate documents based on deal type
          const generatedDocs = [];
          if (updatedDeal.dealType === 'wholesale-flip') {
            if (updatedDeal.seller?.type === 'dealer') {
              let wholesaleBOS = await documentGenerator.generateWholesaleBOS(dealDataForDocs, req.user);
              console.log('[DOC GEN] Generated wholesaleBOS:', wholesaleBOS);
              generatedDocs.push({
                documentType: 'wholesale_purchase_order',
                fileName: wholesaleBOS.fileName,
                filePath: wholesaleBOS.filePath,
                fileSize: wholesaleBOS.fileSize,
                documentNumber: wholesaleBOS.documentNumber,
                generatedAt: new Date(),
                generatedBy: req.user._id,
                status: 'draft'
              });
            } else if (updatedDeal.seller?.type === 'private') {
              let retailPPBuy = await documentGenerator.generateRetailPPBuy(dealDataForDocs, req.user);
              console.log('[DOC GEN] Generated retailPPBuy:', retailPPBuy);
              generatedDocs.push({
                documentType: 'retail_pp_buy',
                fileName: retailPPBuy.fileName,
                filePath: retailPPBuy.filePath,
                fileSize: retailPPBuy.fileSize,
                documentNumber: retailPPBuy.documentNumber,
                generatedAt: new Date(),
                generatedBy: req.user._id,
                status: 'draft'
              });
            }
            // Always generate the vehicle record PDF
            const vehicleRecordPDF = await documentGenerator.generateVehicleRecordPDF(dealDataForDocs, req.user);
            console.log('[DOC GEN] Generated vehicleRecordPDF:', vehicleRecordPDF);
            generatedDocs.push({
              documentType: 'vehicle_record_pdf',
              fileName: vehicleRecordPDF.fileName,
              filePath: vehicleRecordPDF.filePath,
              fileSize: vehicleRecordPDF.fileSize,
              documentNumber: vehicleRecordPDF.documentNumber,
              generatedAt: new Date(),
              generatedBy: req.user._id,
              status: 'draft'
            });
          } else if (updatedDeal.dealType === 'wholesale-pp') {
            const wholesalePPBuy = await documentGenerator.generateWholesalePPBuy(dealDataForDocs, req.user);
            console.log('[DOC GEN] Generated wholesalePPBuy:', wholesalePPBuy);
            generatedDocs.push({
              documentType: 'wholesale_pp_buy',
              fileName: wholesalePPBuy.fileName,
              filePath: wholesalePPBuy.filePath,
              fileSize: wholesalePPBuy.fileSize,
              documentNumber: wholesalePPBuy.documentNumber,
              generatedAt: new Date(),
              generatedBy: req.user._id,
              status: 'draft'
            });
            const vehicleRecordPDF = await documentGenerator.generateVehicleRecordPDF(dealDataForDocs, req.user);
            console.log('[DOC GEN] Generated vehicleRecordPDF:', vehicleRecordPDF);
            generatedDocs.push({
              documentType: 'vehicle_record_pdf',
              fileName: vehicleRecordPDF.fileName,
              filePath: vehicleRecordPDF.filePath,
              fileSize: vehicleRecordPDF.fileSize,
              documentNumber: vehicleRecordPDF.documentNumber,
              generatedAt: new Date(),
              generatedBy: req.user._id,
              status: 'draft'
            });
          } else if (updatedDeal.dealType === 'retail-pp') {
            const retailPPBuy = await documentGenerator.generateRetailPPBuy(dealDataForDocs, req.user);
            console.log('[DOC GEN] Generated retailPPBuy:', retailPPBuy);
            generatedDocs.push({
              documentType: 'retail_pp_buy',
              fileName: retailPPBuy.fileName,
              filePath: retailPPBuy.filePath,
              fileSize: retailPPBuy.fileSize,
              documentNumber: retailPPBuy.documentNumber,
              generatedAt: new Date(),
              generatedBy: req.user._id,
              status: 'draft'
            });
            const vehicleRecordPDF = await documentGenerator.generateVehicleRecordPDF(dealDataForDocs, req.user);
            console.log('[DOC GEN] Generated vehicleRecordPDF:', vehicleRecordPDF);
            generatedDocs.push({
              documentType: 'vehicle_record_pdf',
              fileName: vehicleRecordPDF.fileName,
              filePath: vehicleRecordPDF.filePath,
              fileSize: vehicleRecordPDF.fileSize,
              documentNumber: vehicleRecordPDF.documentNumber,
              generatedAt: new Date(),
              generatedBy: req.user._id,
              status: 'draft'
            });
          } else {
            // Default wholesale documents
            const wholesaleBOS = await documentGenerator.generateWholesaleBOS(dealDataForDocs, req.user);
            console.log('[DOC GEN] Generated wholesaleBOS:', wholesaleBOS);
            generatedDocs.push({
              documentType: 'wholesale_bos',
              fileName: wholesaleBOS.fileName,
              filePath: wholesaleBOS.filePath,
              fileSize: wholesaleBOS.fileSize,
              documentNumber: wholesaleBOS.documentNumber,
              generatedAt: new Date(),
              generatedBy: req.user._id,
              status: 'draft'
            });
            const vehicleRecordPDF = await documentGenerator.generateVehicleRecordPDF(dealDataForDocs, req.user);
            console.log('[DOC GEN] Generated vehicleRecordPDF:', vehicleRecordPDF);
            generatedDocs.push({
              documentType: 'vehicle_record_pdf',
              fileName: vehicleRecordPDF.fileName,
              filePath: vehicleRecordPDF.filePath,
              fileSize: vehicleRecordPDF.fileSize,
              documentNumber: vehicleRecordPDF.documentNumber,
              generatedAt: new Date(),
              generatedBy: req.user._id,
              status: 'draft'
            });
          }

          // Debug: log each document object before saving
          generatedDocs.forEach((doc, idx) => {
            console.log(`[BACKOFFICE] Document object for vehicleRecord.generatedDocuments[${idx}]:`, doc);
          });

          // Delete old files that are no longer referenced
          if (vehicleRecord && Array.isArray(vehicleRecord.generatedDocuments)) {
            const fs = require('fs');
            const oldFilePaths = vehicleRecord.generatedDocuments.map(doc => doc.filePath).filter(Boolean);
            const newFilePaths = generatedDocs.map(doc => doc.filePath).filter(Boolean);
            const filesToDelete = oldFilePaths.filter(oldPath => !newFilePaths.includes(oldPath));
            filesToDelete.forEach(filePath => {
              try {
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  console.log(`[BACKOFFICE] Deleted old document file: ${filePath}`);
                } else {
                  console.log(`[BACKOFFICE] Old document file not found for deletion: ${filePath}`);
                }
              } catch (err) {
                console.error(`[BACKOFFICE] Error deleting old document file: ${filePath}`, err);
              }
            });
          }

          // Update vehicle record with new documents
          if (vehicleRecord) {
            console.log('[BACKOFFICE] Previous vehicleRecord.generatedDocuments:', vehicleRecord.generatedDocuments);
            vehicleRecord.generatedDocuments = generatedDocs;
            await vehicleRecord.save();
            console.log('[BACKOFFICE] Updated vehicleRecord.generatedDocuments:', vehicleRecord.generatedDocuments);
            console.log('[BACKOFFICE] Updated vehicle record with new documents');
          }

          console.log('[BACKOFFICE] Successfully regenerated documents:', generatedDocs.map(d => d.fileName));
        }
      } catch (docError) {
        console.error('[BACKOFFICE] Error regenerating documents:', docError);
        // Don't fail the entire request if document generation fails
        // Just log the error and continue
      }
    }

    res.json({
      success: true,
      message: 'Deal updated successfully',
      data: updatedDeal
    });

  } catch (error) {
    console.error('[BACKOFFICE] Error updating deal:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// DELETE ROUTES
// ============================================================================

// Delete document
router.delete('/deals/:id/documents/:documentType', async (req, res) => {
  try {
    const { id, documentType } = req.params;

    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const documentIndex = deal.documents.findIndex(doc => doc.type === documentType);
    if (documentIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Remove file from filesystem
    const filePath = deal.documents[documentIndex].filePath;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove document from array
    deal.documents.splice(documentIndex, 1);

    // Add activity log entry
    deal.activityLog.push({
      action: 'document_deleted',
      timestamp: new Date(),
      userId: req.user?.id || null,
      description: `Deleted ${documentType} document`,
      metadata: { documentType }
    });

    deal.updatedAt = new Date();
    deal.updatedBy = req.user?.id || null;

    await deal.save();

    res.json({ 
      success: true,
      message: 'Document deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// UTILITY ROUTES
// ============================================================================

// Get document file
router.get('/deals/:id/documents/:documentType/download', async (req, res) => {
  try {
    const { id, documentType } = req.params;
    console.log(`[BACKOFFICE DOWNLOAD] Request received - Deal ID: ${id}, Document Type: ${documentType}`);
    console.log(`[BACKOFFICE DOWNLOAD] User:`, req.user && { id: req.user._id, email: req.user.email, role: req.user.role });

    const deal = await Deal.findById(id);
    if (!deal) {
      console.log(`[BACKOFFICE DOWNLOAD] Deal not found for ID: ${id}`);
      return res.status(404).json({ error: 'Deal not found' });
    }
    console.log(`[BACKOFFICE DOWNLOAD] Deal found: ${deal._id}, has ${deal.documents?.length || 0} documents`);

    let document;
    if (documentType.startsWith('extra_doc_')) {
      // For new extra_doc files, find by documentId
      console.log(`[BACKOFFICE DOWNLOAD] Looking for document with documentId: ${documentType}`);
      document = deal.documents.find(doc => doc.documentId === documentType);
    } else if (documentType === 'extra_doc') {
      // For old extra_doc files without documentId, find by type
      console.log(`[BACKOFFICE DOWNLOAD] Looking for document with type: ${documentType}`);
      document = deal.documents.find(doc => doc.type === documentType);
    } else {
      // For other document types, find by type
      console.log(`[BACKOFFICE DOWNLOAD] Looking for document with type: ${documentType}`);
      document = deal.documents.find(doc => doc.type === documentType);
    }

    if (!document) {
      console.log(`[BACKOFFICE DOWNLOAD] Document not found. Available documents:`, deal.documents.map(d => ({ type: d.type, documentId: d.documentId, fileName: d.fileName })));
      return res.status(404).json({ error: 'Document not found' });
    }
    console.log(`[BACKOFFICE DOWNLOAD] Document found:`, { type: document.type, documentId: document.documentId, fileName: document.fileName, filePath: document.filePath });

    if (!fs.existsSync(document.filePath)) {
      console.log(`[BACKOFFICE DOWNLOAD] File not found at path: ${document.filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }
    console.log(`[BACKOFFICE DOWNLOAD] File exists, serving download for: ${document.fileName}`);

    res.download(document.filePath, document.fileName);
  } catch (error) {
    console.error('[BACKOFFICE DOWNLOAD] Error downloading document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 