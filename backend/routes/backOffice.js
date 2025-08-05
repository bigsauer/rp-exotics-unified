const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Deal = require('../models/Deal');
const SalesDeal = require('../models/SalesDeal');
const DocumentType = require('../models/DocumentType');
const { authenticateToken, requireBackOfficeAccess } = require('../middleware/auth');
const StatusSyncService = require('../services/statusSyncService');
const cloudStorage = require('../services/cloudStorage');

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

// File upload configuration - Using memory storage for S3 upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and Word documents are allowed.'), false);
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

    // Fetch deals from both Deal and SalesDeal collections
    console.log('[BACKOFFICE] 🔍 DEBUG: Fetching deals with query:', JSON.stringify(query, null, 2));
    const [deals, salesDeals] = await Promise.all([
      Deal.find(query)
        .populate('assignedTo', 'profile.displayName email')
        .populate('seller.dealerId', 'name company')
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      
      SalesDeal.find(query)
        .populate('salesPerson.id', 'profile.displayName email')
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean()
    ]);
    console.log('[BACKOFFICE] 📊 DEBUG: Found deals:', {
      regularDeals: deals.length,
      salesDeals: salesDeals.length,
      total: deals.length + salesDeals.length
    });
    console.log('[BACKOFFICE] 📋 DEBUG: Sample deals:', deals.slice(0, 2).map(d => ({
      id: d._id,
      vehicle: d.vehicle,
      vin: d.vin,
      stockNumber: d.stockNumber
    })));
    console.log('[BACKOFFICE] 📋 DEBUG: Sample salesDeals:', salesDeals.slice(0, 2).map(d => ({
      id: d._id,
      vehicle: d.vehicle,
      vin: d.vin,
      stockNumber: d.stockNumber
    })));

    // Combine and sort all deals
    const allDeals = [...deals, ...salesDeals].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    // Get total count from both collections
    const [dealTotal, salesDealTotal] = await Promise.all([
      Deal.countDocuments(query),
      SalesDeal.countDocuments(query)
    ]);
    const total = dealTotal + salesDealTotal;

    // Transform deals for frontend - unified format for all deals
    const transformedDeals = allDeals.map(deal => {
      // Unified transformation - treat all deals the same way
      return {
        id: deal._id.toString(),
        vehicle: deal.vehicle,
        vin: deal.vin,
        stockNumber: deal.stockNumber,
        purchaseDate: deal.timeline?.purchaseDate || deal.purchaseDate,
        purchasePrice: deal.financial?.purchasePrice || deal.purchasePrice,
        currentStage: deal.currentStage,
        priority: deal.priority,
        assignedTo: deal.salesPerson?.id || deal.assignedTo,
        seller: deal.customer ? {
          name: deal.customer?.name,
          type: deal.customer?.type || 'individual',
          contact: deal.customer?.contact
        } : deal.seller,
        completionPercentage: deal.completionPercentage,
        pendingDocumentsCount: deal.pendingDocumentsCount,
        overdueDocuments: deal.overdueDocuments,
        titleInfo: deal.titleInfo,
        financial: deal.financial,
        compliance: deal.compliance,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
        // No distinction between deal types - all are just "deals"
        dealType: 'Deal'
      };
    });

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
    
    // Try to find in Deal collection first
    let deal = await Deal.findById(req.params.id)
      .populate('assignedTo', 'profile.displayName email')
      .populate('seller.dealerId', 'name company contact')
      .populate('documents.uploadedBy', 'profile.displayName')
      .populate('documents.approvedBy', 'profile.displayName')
      .populate('workflowHistory.changedBy', 'profile.displayName')
      .populate('activityLog.userId', 'profile.displayName')
      .lean();
    
    // If not found in Deal collection, try SalesDeal collection
    if (!deal) {
      console.log('[BACKOFFICE] Deal not found in Deal collection, trying SalesDeal...');
      deal = await SalesDeal.findById(req.params.id)
        .populate('salesPerson.id', 'profile.displayName email')
        .lean();
      
      if (deal) {
        console.log('[BACKOFFICE] Found deal in SalesDeal collection');
        // Transform SalesDeal to unified format
        deal = {
          ...deal,
          assignedTo: deal.salesPerson?.id,
          seller: {
            name: deal.customer?.name,
            type: deal.customer?.type || 'individual',
            contact: deal.customer?.contact
          },
          dealType: 'Deal' // Unified deal type
        };
      }
    }
    
    if (!deal) {
      console.warn('[BACKOFFICE] Deal not found in either collection:', req.params.id);
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
  upload.array('documents', 10), // Allow up to 10 files
  async (req, res) => {
    try {
      const { id, documentType } = req.params;
      const notes = req.body?.notes || '';

      console.log('[BACKOFFICE UPLOAD] Starting document upload');
      console.log('[BACKOFFICE UPLOAD] Deal ID:', id);
      console.log('[BACKOFFICE UPLOAD] Document type:', documentType);
      console.log('[BACKOFFICE UPLOAD] Files received:', req.files ? req.files.length : 0);

      if (!req.files || req.files.length === 0) {
        console.error('[BACKOFFICE UPLOAD] No files uploaded');
        return res.status(400).json({ error: 'No files uploaded' });
      }

      console.log('[BACKOFFICE UPLOAD] Files details:', req.files.map(file => ({
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer ? 'Present' : 'Missing'
      })));

      const deal = await Deal.findById(id);
      if (!deal) {
        console.error('[BACKOFFICE UPLOAD] Deal not found:', id);
        return res.status(404).json({ error: 'Deal not found' });
      }

      console.log('[BACKOFFICE UPLOAD] Deal found:', deal._id);

      // Get document type configuration
      const docTypeConfig = await DocumentType.findOne({ type: documentType });
      if (!docTypeConfig) {
        console.warn('[BACKOFFICE UPLOAD] Document type not found, using default config');
      }

      const uploadedDocuments = [];

      // Process each uploaded file
      for (const file of req.files) {
        // Generate unique filename for S3
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const s3FileName = `extra_doc_${uniqueSuffix}${ext}`;

        console.log('[BACKOFFICE UPLOAD] Uploading to S3:', s3FileName);

        // Upload to S3
        let s3Url;
        try {
          const uploadResult = await cloudStorage.uploadBuffer(file.buffer, s3FileName, file.mimetype);
          s3Url = uploadResult.url;
          console.log('[BACKOFFICE UPLOAD] S3 upload successful:', s3Url);
        } catch (s3Error) {
          console.error('[BACKOFFICE UPLOAD] S3 upload failed:', s3Error);
          return res.status(500).json({ error: 'Failed to upload file to cloud storage' });
        }

        // Create new document object
        const newDocument = {
          type: documentType,
          documentId: documentType === 'extra_doc' ? `extra_doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : documentType,
          fileName: file.originalname,
          filePath: s3Url, // Use S3 URL instead of local path
          fileSize: file.size,
          mimeType: file.mimetype,
          uploaded: true,
          uploadedAt: new Date(),
          uploadedBy: req.user?.id || null,
          approved: false,
          required: docTypeConfig?.required || false,
          notes: notes || '',
          version: 1
        };

        console.log('[BACKOFFICE UPLOAD] New document object:', newDocument);

        // Add to deal documents array
        deal.documents.push(newDocument);
        uploadedDocuments.push(newDocument);

        // Add activity log entry for each file
        deal.activityLog.push({
          action: 'document_uploaded',
          timestamp: new Date(),
          userId: req.user?.id || null,
          description: `Uploaded ${docTypeConfig?.name || documentType}: ${file.originalname}`,
          metadata: { documentType, fileName: file.originalname, s3Url }
        });
      }

      deal.updatedAt = new Date();
      deal.updatedBy = req.user?.id || null;

      await deal.save();
      console.log('[BACKOFFICE UPLOAD] Deal saved successfully with', uploadedDocuments.length, 'new documents');

      res.json({ 
        success: true,
        message: `${uploadedDocuments.length} document(s) uploaded successfully`, 
        data: uploadedDocuments 
      });
    } catch (error) {
      console.error('[BACKOFFICE UPLOAD] Error uploading document:', error);
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
      
      // Clean the address string
      const cleanAddress = addressString.trim();
      
      // Split by comma and clean each part
      const parts = cleanAddress.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
      if (parts.length === 0) {
        return { street: '', city: '', state: '', zip: '' };
      }
      
      // Handle different address formats
      if (parts.length === 1) {
        // Just street address
        return {
          street: parts[0],
          city: '',
          state: '',
          zip: ''
        };
      } else if (parts.length === 2) {
        // Street and city, or street and state/zip
        const secondPart = parts[1];
        if (secondPart.match(/^[A-Z]{2}\s+\d{5}/)) {
          // State and ZIP format
          const stateZipMatch = secondPart.match(/^([A-Z]{2})\s+(.+)$/);
          return {
            street: parts[0],
            city: '',
            state: stateZipMatch ? stateZipMatch[1] : '',
            zip: stateZipMatch ? stateZipMatch[2] : ''
          };
        } else {
          // City and state/zip
          return {
            street: parts[0],
            city: parts[1],
            state: '',
            zip: ''
          };
        }
      } else if (parts.length === 3) {
        // Street, city, state/zip
        const lastPart = parts[2];
        if (lastPart.match(/^[A-Z]{2}\s+\d{5}/)) {
          // State and ZIP format
          const stateZipMatch = lastPart.match(/^([A-Z]{2})\s+(.+)$/);
          return {
            street: parts[0],
            city: parts[1],
            state: stateZipMatch ? stateZipMatch[1] : '',
            zip: stateZipMatch ? stateZipMatch[2] : ''
          };
        } else {
          // Assume last part is ZIP
          return {
            street: parts[0],
            city: parts[1],
            state: '',
            zip: parts[2]
          };
        }
      } else {
        // 4 or more parts: street, city, state, zip
        return {
          street: parts[0],
          city: parts[1] || '',
          state: parts[2] || '',
          zip: parts[3] || ''
        };
      }
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
              'instantOffer',
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
      console.log('[BACKOFFICE] 🔄 Regenerating documents for deal:', id);
      console.log('[BACKOFFICE] 📋 Deal type:', updatedDeal.dealType);
      console.log('[BACKOFFICE] 📋 Deal subtype:', updatedDeal.dealType2SubType);
      console.log('[BACKOFFICE] 📋 Seller type:', updatedDeal.seller?.type);
      console.log('[BACKOFFICE] 📋 Buyer type:', updatedDeal.buyer?.type);
      
      try {
        const documentGenerator = require('../services/documentGenerator');
        const VehicleRecord = require('../models/VehicleRecord');
        
        // Get the vehicle record
        const vehicleRecord = await VehicleRecord.findById(updatedDeal.vehicleRecordId);
        if (!vehicleRecord) {
          console.warn('[BACKOFFICE] No vehicle record found for deal:', id);
        } else {
          // Clear existing generated documents from vehicle record
          vehicleRecord.generatedDocuments = [];
          
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
            buyerInfo: {
              name: updatedDeal.buyer.name,
              address: updatedDeal.buyer.contact?.address || updatedDeal.buyer.address,
              phone: updatedDeal.buyer.contact?.phone || updatedDeal.buyer.phone,
              email: updatedDeal.buyer.contact?.email || updatedDeal.buyer.email,
              licenseNumber: updatedDeal.buyer.licenseNumber,
              company: updatedDeal.buyer.company
            }
          };

          console.log('[BACKOFFICE] Regenerating documents for deal type:', updatedDeal.dealType);
          console.log('[BACKOFFICE] Deal data for regeneration:', {
            dealType: dealDataForDocs.dealType,
            dealType2SubType: dealDataForDocs.dealType2SubType,
            sellerType: dealDataForDocs.seller?.type,
            buyerType: dealDataForDocs.buyer?.type
          });

          let pdfInfo = null;
          let purchaseContractPdfInfo = null;

          // Use the comprehensive document generation logic
          console.log('[BACKOFFICE] Using comprehensive document generation for deal type:', updatedDeal.dealType);
          
          try {
            // Generate the appropriate document using the main document generator method
            const generatedDocument = await documentGenerator.generateDocument({
              ...dealDataForDocs,
              stockNumber: updatedDeal.rpStockNumber,
              salesperson: updatedDeal.salesperson,
              notes: updatedDeal.notes,
              generalNotes: updatedDeal.generalNotes,
            }, req.user);
            
            console.log('[BACKOFFICE] ✅ Document generated successfully:', {
              fileName: generatedDocument.fileName,
              documentType: generatedDocument.documentType,
              filePath: generatedDocument.filePath
            });
            
            // Set the appropriate variable based on document type
            if (generatedDocument.documentType.includes('vehicle_record')) {
              pdfInfo = generatedDocument;
            } else {
              purchaseContractPdfInfo = generatedDocument;
            }
            
          } catch (docGenError) {
            console.error('[BACKOFFICE] Error generating document:', docGenError);
            
            // Fallback: Generate a basic vehicle record
            try {
              console.log('[BACKOFFICE] Attempting fallback document generation...');
              pdfInfo = await documentGenerator.generateStandardVehicleRecord({
                ...dealDataForDocs,
                stockNumber: updatedDeal.rpStockNumber,
                salesperson: updatedDeal.salesperson,
                notes: updatedDeal.notes,
                generalNotes: updatedDeal.generalNotes,
              }, req.user);
              console.log('[BACKOFFICE] ✅ Fallback vehicle record generated:', pdfInfo);
            } catch (fallbackError) {
              console.error('[BACKOFFICE] Fallback document generation also failed:', fallbackError);
            }
          }

          // Save regenerated documents to vehicle record
          if (pdfInfo) {
            vehicleRecord.generatedDocuments.push({
              documentType: pdfInfo.documentType || 'vehicle_record',
              fileName: pdfInfo.fileName,
              filePath: pdfInfo.filePath,
              generatedAt: new Date(),
              generatedBy: req.user.id
            });
            console.log(`[BACKOFFICE] ✅ ${pdfInfo.documentType || 'vehicle_record'} PDF saved to vehicle record`);
          }
          
          if (purchaseContractPdfInfo) {
            vehicleRecord.generatedDocuments.push({
              documentType: purchaseContractPdfInfo.documentType || 'purchase_agreement',
              fileName: purchaseContractPdfInfo.fileName,
              filePath: purchaseContractPdfInfo.filePath,
              generatedAt: new Date(),
              generatedBy: req.user.id
            });
            console.log(`[BACKOFFICE] ✅ ${purchaseContractPdfInfo.documentType || 'purchase_agreement'} PDF saved to vehicle record`);
          }

          // Save vehicle record with regenerated documents
          if (vehicleRecord.generatedDocuments.length > 0) {
            await vehicleRecord.save();
            console.log('[BACKOFFICE] ✅ Vehicle record updated with regenerated documents');
          }

          // Update deal documents array with regenerated documents
          // Remove all generated document types that should be regenerated
          const generatedDocumentTypes = [
            'vehicle_record',
            'purchase_agreement',
            'wholesale_purchase_agreement',
            'wholesale_purchase_order',
            'wholesale_bos',
            'retail_pp_buy',
            'bill_of_sale',
            'vehicle_record_pdf'
          ];
          
          console.log('[BACKOFFICE] Filtering out existing generated documents before regeneration');
          const originalDocCount = updatedDeal.documents.length;
          updatedDeal.documents = updatedDeal.documents.filter(doc => {
            const shouldKeep = !generatedDocumentTypes.includes(doc.type);
            if (!shouldKeep) {
              console.log(`[BACKOFFICE] Removing existing document: ${doc.type} - ${doc.fileName}`);
            }
            return shouldKeep;
          });
          console.log(`[BACKOFFICE] Removed ${originalDocCount - updatedDeal.documents.length} existing generated documents`);

          if (pdfInfo) {
            updatedDeal.documents.push({
              type: pdfInfo.documentType || 'vehicle_record',
              documentId: `${pdfInfo.documentType || 'vehicle_record'}_${Date.now()}`,
              fileName: pdfInfo.fileName,
              filePath: pdfInfo.filePath,
              uploaded: true,
              uploadedAt: new Date(),
              uploadedBy: req.user.id,
              approved: false,
              required: false,
              version: 1
            });
            console.log(`[BACKOFFICE] ✅ Added ${pdfInfo.documentType || 'vehicle_record'} to deal documents`);
          }
          
          if (purchaseContractPdfInfo) {
            updatedDeal.documents.push({
              type: purchaseContractPdfInfo.documentType || 'purchase_agreement',
              documentId: `${purchaseContractPdfInfo.documentType || 'purchase_agreement'}_${Date.now()}`,
              fileName: purchaseContractPdfInfo.fileName,
              filePath: purchaseContractPdfInfo.filePath,
              uploaded: true,
              uploadedAt: new Date(),
              uploadedBy: req.user.id,
              approved: false,
              required: true,
              version: 1
            });
            console.log(`[BACKOFFICE] ✅ Added ${purchaseContractPdfInfo.documentType || 'purchase_agreement'} to deal documents`);
          }

          // Save deal with regenerated documents
          if (updatedDeal.documents.length > 0) {
            await updatedDeal.save();
            console.log('[BACKOFFICE] ✅ Deal updated with regenerated documents');
          }
        }
      } catch (error) {
        console.error('[BACKOFFICE] Error regenerating documents:', error);
        // Don't fail the entire request, just log the error
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

    // Check if this is an S3 URL (seller uploaded document) or local file
    if (document.filePath && document.filePath.startsWith('http')) {
      // This is an S3 URL, redirect to the URL
      console.log(`[BACKOFFICE DOWNLOAD] Redirecting to S3 URL: ${document.filePath}`);
      return res.redirect(document.filePath);
    } else {
      // This is a local file
      if (!fs.existsSync(document.filePath)) {
        console.log(`[BACKOFFICE DOWNLOAD] File not found at path: ${document.filePath}`);
        return res.status(404).json({ error: 'File not found' });
      }
      console.log(`[BACKOFFICE DOWNLOAD] File exists, serving download for: ${document.fileName}`);
      res.download(document.filePath, document.fileName);
    }
  } catch (error) {
    console.error('[BACKOFFICE DOWNLOAD] Error downloading document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 