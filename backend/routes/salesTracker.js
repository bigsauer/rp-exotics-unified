const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const SalesDeal = require('../models/SalesDeal');
const User = require('../models/User');
const StatusSyncService = require('../services/statusSyncService');

const router = express.Router();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Calculate days in current stage
const calculateDaysInStage = (deal) => {
  const stageEntry = deal.stageHistory.find(sh => sh.stage === deal.currentStage && !sh.exitedAt);
  if (!stageEntry) return 0;
  
  const now = new Date();
  const enteredAt = new Date(stageEntry.enteredAt);
  return Math.ceil((now - enteredAt) / (1000 * 60 * 60 * 24));
};

// Calculate total days in process
const calculateTotalDaysInProcess = (deal) => {
  const now = new Date();
  const startDate = new Date(deal.timeline.purchaseDate);
  return Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
};

// Calculate estimated completion date
const calculateEstimatedCompletion = (deal) => {
  const stageTimelines = {
    'purchased': 0,
    'documentation': 2,
    'verification': 1,
    'title-processing': 5,
    'ready-to-list': 0
  };

  const currentStageIndex = Object.keys(stageTimelines).indexOf(deal.currentStage);
  const remainingStages = Object.keys(stageTimelines).slice(currentStageIndex + 1);
  
  let estimatedDays = 0;
  remainingStages.forEach(stage => {
    estimatedDays += stageTimelines[stage];
  });

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);
  return estimatedDate;
};

// Calculate progress percentage
const calculateProgressPercentage = (deal) => {
  const stageOrder = ['purchased', 'documentation', 'verification', 'title-processing', 'ready-to-list'];
  const currentIndex = stageOrder.indexOf(deal.currentStage);
  return Math.round(((currentIndex + 1) / stageOrder.length) * 100);
};

// Get timeline status
const getTimelineStatus = (deal) => {
  if (!deal.timeline.estimatedCompletionDate) return 'no-estimate';
  
  const estimated = new Date(deal.timeline.estimatedCompletionDate);
  const now = new Date();
  const daysUntilEstimated = Math.ceil((estimated - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilEstimated < 0) return 'overdue';
  if (daysUntilEstimated <= 1) return 'urgent';
  if (daysUntilEstimated <= 3) return 'attention';
  return 'on-track';
};

// Calculate stage efficiency
const calculateStageEfficiency = (deal) => {
  const efficiency = {};
  deal.stageHistory.forEach(stage => {
    if (stage.exitedAt) {
      const duration = (new Date(stage.exitedAt) - new Date(stage.enteredAt)) / (1000 * 60 * 60 * 24);
      efficiency[stage.stage] = Math.round(duration * 10) / 10; // Round to 1 decimal
    }
  });
  return efficiency;
};

// Unified valid stages for sales
const VALID_STAGES = [
  'contract-received',
  'docs-signed',
  'title-processing',
  'payment-approved',
  'funds-disbursed',
  'title-received',
  'deal-complete'
];

// ============================================================================
// GET ROUTES
// ============================================================================

// Get deals for sales dashboard with filtering
router.get('/deals', authenticateToken, async (req, res) => {
  try {
    console.log('[SALES] Fetching deals for user:', req.user.id, 'role:', req.user.role);
    console.log('[SALES] User permissions:', req.user.permissions);
    console.log('[SALES] User object:', JSON.stringify(req.user, null, 2));
    
    // IMPORTANT: All sales people can see ALL deals - no filtering by user
    // This ensures that every sales person has full visibility of all deals
    let query = {};
    
    // No user-based filtering - all users can view all deals
    // This is the key requirement: all sales people must see all deals
    console.log('[SALES] ✅ NO FILTERING APPLIED - All sales people can view all deals');
    console.log('[SALES] ✅ This ensures full visibility for all sales team members');

    console.log('[SALES] Final query:', JSON.stringify(query));

    // Fetch from the main deals collection (same as finance page)
    // This ensures sales people see the same deals that finance people see
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // First, let's check if there are any deals in the main collection
    const totalDeals = await db.collection('deals').countDocuments({});
    console.log('[SALES] Total deals in main collection:', totalDeals);
    
    // Get all deals from the main collection (same as finance endpoint)
    const allDeals = await db.collection('deals').find({}).toArray();
    console.log('[SALES] All deals from main collection:', allDeals.length);
    
    if (allDeals.length > 0) {
      console.log('[SALES] Sample deal:', allDeals[0].vehicle || allDeals[0].rpStockNumber);
    }

    // Apply the same query as the endpoint but to main deals collection
    const deals = await db.collection('deals').find(query)
      .sort({ createdAt: -1 })
      .toArray();

    console.log('[SALES] Found deals with filter:', deals.length);
    console.log('[SALES] Deals found:', deals.map(d => ({ 
      id: d._id, 
      vehicle: d.vehicle || `${d.year} ${d.make} ${d.model}`,
      stockNumber: d.rpStockNumber 
    })));

    // Transform deals to match sales format
    const transformedDeals = deals.map(deal => {
      // Calculate basic metrics for each deal
      const now = new Date();
      const createdDate = new Date(deal.createdAt || deal.purchaseDate || now);
      const daysInProcess = Math.ceil((now - createdDate) / (1000 * 60 * 60 * 24));
      
      return {
        _id: deal._id,
        vehicle: deal.vehicle || `${deal.year || ''} ${deal.make || ''} ${deal.model || ''}`.trim(),
        vin: deal.vin,
        stockNumber: deal.rpStockNumber,
        dealType: deal.dealType || 'wholesale',
        currentStage: deal.currentStage || 'contract-received',
        seller: deal.seller?.name || 'Unknown',
        buyer: deal.buyer?.name || 'Pending',
        purchasePrice: deal.purchasePrice || 0,
        listPrice: deal.listPrice || 0,
        priority: deal.priority || 'medium',
        notes: deal.generalNotes || '',
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
        purchaseDate: deal.purchaseDate,
        salesPerson: {
          id: deal.salesperson || null,
          name: deal.salesperson || 'Unknown',
          email: ''
        },
        // Add calculated metrics
        calculatedMetrics: {
          daysInCurrentStage: daysInProcess,
          estimatedCompletion: new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days from creation
          progressPercentage: Math.min(Math.round((daysInProcess / 30) * 100), 100),
          timelineStatus: daysInProcess > 30 ? 'overdue' : 'on-track'
        }
      };
    });

    const total = transformedDeals.length;

    console.log('[SALES] ✅ Returning ALL deals to user:', total, 'deals');

    res.json({
      deals: transformedDeals,
      totalPages: 1,
      currentPage: 1,
      total
    });
  } catch (error) {
    console.error('[SALES] Error getting deals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific deal with full details
router.get('/deals/:id', authenticateToken, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // IMPORTANT: No restrictions - all sales people can view any deal
    // This ensures full visibility across the entire sales team
    console.log('[SALES] ✅ NO RESTRICTIONS - All sales people can view any deal');

    const deal = await SalesDeal.findOne(query)
      .populate('salesPerson.id', 'name email phone')
      .populate('communications.from.userId', 'name role')
      .populate('communications.to.userId', 'name role')
      .populate('salesActions.assignedTo', 'name email');

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found or access denied' });
    }

    // Add calculated metrics
    const dealWithMetrics = {
      ...deal.toObject(),
      calculatedMetrics: {
        daysInCurrentStage: calculateDaysInStage(deal),
        totalDaysInProcess: calculateTotalDaysInProcess(deal),
        estimatedCompletion: calculateEstimatedCompletion(deal),
        progressPercentage: calculateProgressPercentage(deal),
        timelineStatus: getTimelineStatus(deal),
        stageEfficiency: calculateStageEfficiency(deal)
      }
    };

    res.json(dealWithMetrics);
  } catch (error) {
    console.error('Error getting deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sales dashboard statistics
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    let salesPersonFilter = {};
    
    // No filtering - show all deals to all users

    const stats = await SalesDeal.aggregate([
      { $match: salesPersonFilter },
      {
        $group: {
          _id: '$currentStage',
          count: { $sum: 1 },
          avgDaysInStage: { $avg: '$metrics.daysInCurrentStage' }
        }
      }
    ]);

    const priorityStats = await SalesDeal.aggregate([
      { $match: salesPersonFilter },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const timelineStats = await SalesDeal.aggregate([
      { $match: salesPersonFilter },
      {
        $project: {
          timelineStatus: {
            $cond: {
              if: { $lt: ['$timeline.estimatedCompletionDate', new Date()] },
              then: 'overdue',
              else: {
                $cond: {
                  if: { 
                    $lt: [
                      '$timeline.estimatedCompletionDate', 
                      { $add: [new Date(), 24 * 60 * 60 * 1000] } // 1 day from now
                    ] 
                  },
                  then: 'urgent',
                  else: 'on-track'
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$timelineStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      stageDistribution: stats,
      priorityDistribution: priorityStats,
      timelineDistribution: timelineStats,
      totalActiveDeals: await SalesDeal.countDocuments({
        ...salesPersonFilter,
        status: 'active'
      })
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get notifications for current user
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { unreadOnly = false, limit = 50 } = req.query;
    
    let query = {};
    if (unreadOnly === 'true') {
      query['notifications.read'] = false;
    }

    const deals = await SalesDeal.find(query, {
      notifications: 1,
      vehicle: 1,
      stockNumber: 1
    }).limit(parseInt(limit));

    const notifications = [];
    deals.forEach(deal => {
      deal.notifications.forEach(notification => {
        if (!unreadOnly || !notification.read) {
          notifications.push({
            ...notification.toObject(),
            dealId: deal._id,
            vehicle: deal.vehicle,
            stockNumber: deal.stockNumber
          });
        }
      });
    });

    // Sort by timestamp, newest first
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(notifications.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get communication history for a deal
router.get('/deals/:id/communications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    let query = { _id: req.params.id };
    // No restrictions - all users can view any deal

    const deal = await SalesDeal.findOne(query, {
      communications: { 
        $slice: [-(limit * page), limit] 
      }
    })
    .populate('communications.from.userId', 'name role')
    .populate('communications.to.userId', 'name role');

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found or access denied' });
    }

    res.json(deal.communications.reverse()); // Most recent first
  } catch (error) {
    console.error('Error getting communications:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// POST ROUTES
// ============================================================================

// Create new sales deal
router.post('/deals', authenticateToken, async (req, res) => {
  try {
    const dealData = req.body;
    
    // Set sales person information
    dealData.salesPerson = {
      id: req.user.id,
      name: req.user.profile.displayName,
      email: req.user.email,
      phone: req.user.profile.phone || ''
    };

    // Initialize stage history
    dealData.stageHistory = [{
      stage: dealData.currentStage || 'contract-received',
      enteredAt: new Date(),
      notes: 'Deal created'
    }];

    // Set created by
    dealData.createdBy = req.user.id;
    dealData.updatedBy = req.user.id;

    const deal = new SalesDeal(dealData);
    await deal.save();

    // Populate sales person info
    await deal.populate('salesPerson.id', 'name email');

    res.status(201).json({
      message: 'Sales deal created successfully',
      deal
    });
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send message to back office
router.post('/deals/:id/message', authenticateToken, async (req, res) => {
  try {
    const { message, urgent = false, recipients = [] } = req.body;
    
    let query = { _id: req.params.id };
    if (req.user.role === 'sales' && !req.user.permissions?.viewAllDeals) {
      query['salesPerson.id'] = req.user.id;
    }

    const deal = await SalesDeal.findOne(query);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found or access denied' });
    }

    // Create communication record
    const communication = {
      type: 'message',
      direction: 'outbound',
      from: {
        userId: req.user.id,
        name: req.user.profile.displayName,
        role: req.user.role
      },
      to: recipients.length > 0 ? recipients : [
        { userId: null, name: 'Back Office Team', role: 'back-office' }
      ],
      subject: `${deal.vehicle} - ${deal.stockNumber}`,
      content: message,
      timestamp: new Date(),
      urgent: urgent,
      read: false
    };

    deal.communications.push(communication);
    
    // Update last activity
    deal.updatedAt = new Date();
    deal.updatedBy = req.user.id;

    await deal.save();

    res.json({ 
      message: 'Message sent successfully', 
      communication 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Log customer interaction
router.post('/deals/:id/customer-interaction', authenticateToken, async (req, res) => {
  try {
    const { 
      type, 
      duration, 
      outcome, 
      summary, 
      nextAction, 
      scheduledFollowUp 
    } = req.body;
    
    let query = { _id: req.params.id };
    if (req.user.role === 'sales' && !req.user.permissions?.viewAllDeals) {
      query['salesPerson.id'] = req.user.id;
    }

    const deal = await SalesDeal.findOne(query);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found or access denied' });
    }

    const interaction = {
      type,
      timestamp: new Date(),
      duration: duration || 0,
      outcome,
      summary,
      nextAction,
      scheduledFollowUp: scheduledFollowUp ? new Date(scheduledFollowUp) : null
    };

    deal.customerInteractions.push(interaction);
    
    // Update metrics
    deal.metrics.communicationCount = (deal.metrics.communicationCount || 0) + 1;
    deal.metrics.lastCustomerContact = new Date();
    
    // Create follow-up action if scheduled
    if (scheduledFollowUp && nextAction) {
      deal.salesActions.push({
        action: 'follow-up-customer',
        description: nextAction,
        dueDate: new Date(scheduledFollowUp),
        completed: false,
        assignedTo: req.user.id,
        priority: outcome === 'concerned' ? 'high' : 'normal'
      });
    }

    deal.updatedAt = new Date();
    deal.updatedBy = req.user.id;

    await deal.save();

    res.json({ 
      message: 'Customer interaction logged successfully', 
      interaction 
    });
  } catch (error) {
    console.error('Error logging customer interaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create sales action/reminder
router.post('/deals/:id/actions', authenticateToken, async (req, res) => {
  try {
    const { action, description, dueDate, priority = 'normal' } = req.body;
    
    let query = { _id: req.params.id };
    if (req.user.role === 'sales' && !req.user.permissions?.viewAllDeals) {
      query['salesPerson.id'] = req.user.id;
    }

    const deal = await SalesDeal.findOne(query);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found or access denied' });
    }

    const salesAction = {
      action,
      description,
      dueDate: new Date(dueDate),
      completed: false,
      assignedTo: req.user.id,
      priority,
      notes: ''
    };

    deal.salesActions.push(salesAction);
    deal.updatedAt = new Date();
    deal.updatedBy = req.user.id;

    await deal.save();

    res.json({ 
      message: 'Sales action created successfully', 
      action: salesAction 
    });
  } catch (error) {
    console.error('Error creating sales action:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PUT ROUTES
// ============================================================================

// Update deal information
router.put('/deals/:id', authenticateToken, async (req, res) => {
  try {
    const updateData = req.body;
    
    let query = { _id: req.params.id };
    if (req.user.role === 'sales' && !req.user.permissions?.viewAllDeals) {
      query['salesPerson.id'] = req.user.id;
    }

    const deal = await SalesDeal.findOne(query);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found or access denied' });
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'salesPerson' && key !== 'createdBy') {
        deal[key] = updateData[key];
      }
    });

    deal.updatedAt = new Date();
    deal.updatedBy = req.user.id;

    await deal.save();

    res.json({ 
      message: 'Deal updated successfully', 
      deal 
    });
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update customer information
router.put('/deals/:id/customer', authenticateToken, async (req, res) => {
  try {
    const customerData = req.body;
    
    let query = { _id: req.params.id };
    if (req.user.role === 'sales' && !req.user.permissions?.viewAllDeals) {
      query['salesPerson.id'] = req.user.id;
    }

    const deal = await SalesDeal.findOne(query);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found or access denied' });
    }

    // Update customer information
    deal.customer = { ...deal.customer, ...customerData };
    deal.updatedAt = new Date();
    deal.updatedBy = req.user.id;

    await deal.save();

    res.json({ 
      message: 'Customer information updated successfully', 
      customer: deal.customer 
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Move deal to next stage
router.put('/deals/:id/stage', authenticateToken, async (req, res) => {
  try {
    const { newStage, notes = '' } = req.body;
    
    let query = { _id: req.params.id };
    if (req.user.role === 'sales' && !req.user.permissions?.viewAllDeals) {
      query['salesPerson.id'] = req.user.id;
    }

    const deal = await SalesDeal.findOne(query);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found or access denied' });
    }

    // Move to next stage
    if (!VALID_STAGES.includes(newStage)) {
      return res.status(400).json({ error: 'Invalid stage' });
    }
    deal.moveToNextStage(newStage, notes);
    deal.updatedAt = new Date();
    deal.updatedBy = req.user.id;

    await deal.save();

    // Automatically sync to finance system
    try {
      await StatusSyncService.syncSalesToFinance(deal._id);
      console.log(`[SALES TRACKER] Auto-synced deal ${deal._id} to finance system after stage update`);
    } catch (syncError) {
      console.error(`[SALES TRACKER] Error auto-syncing deal ${deal._id} to finance system:`, syncError);
      // Don't fail the request if sync fails
    }

    res.json({ 
      message: 'Deal moved to next stage successfully', 
      deal: {
        currentStage: deal.currentStage,
        previousStage: deal.previousStage,
        stageHistory: deal.stageHistory
      }
    });
  } catch (error) {
    console.error('Error moving deal stage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete sales action
router.put('/deals/:id/actions/:actionId/complete', authenticateToken, async (req, res) => {
  try {
    const { notes } = req.body;
    
    let query = { _id: req.params.id };
    if (req.user.role === 'sales' && !req.user.permissions?.viewAllDeals) {
      query['salesPerson.id'] = req.user.id;
    }

    const deal = await SalesDeal.findOne(query);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found or access denied' });
    }

    const action = deal.salesActions.id(req.params.actionId);
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    action.completed = true;
    action.completedAt = new Date();
    action.notes = notes || '';

    deal.updatedAt = new Date();
    deal.updatedBy = req.user.id;

    await deal.save();

    res.json({ 
      message: 'Action completed successfully', 
      action 
    });
  } catch (error) {
    console.error('Error completing action:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notifications as read
router.put('/notifications/mark-read', authenticateToken, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    await SalesDeal.updateMany(
      { 
        'salesPerson.id': req.user.id,
        'notifications._id': { $in: notificationIds }
      },
      { 
        $set: { 'notifications.$.read': true }
      }
    );

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update deal priority
router.put('/deals/:id/priority', authenticateToken, async (req, res) => {
  try {
    const { priority, reason } = req.body;
    
    let query = { _id: req.params.id };
    if (req.user.role === 'sales' && !req.user.permissions?.viewAllDeals) {
      query['salesPerson.id'] = req.user.id;
    }

    const validPriorities = ['urgent', 'high', 'normal', 'low'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority level' });
    }

    const deal = await SalesDeal.findOne(query);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found or access denied' });
    }

    const oldPriority = deal.priority;
    deal.priority = priority;
    deal.updatedAt = new Date();
    deal.updatedBy = req.user.id;

    // Log communication about priority change
    deal.communications.push({
      type: 'message',
      direction: 'internal',
      from: {
        userId: req.user.id,
        name: req.user.profile.displayName,
        role: req.user.role
      },
      to: [{ userId: null, name: 'System', role: 'system' }],
      subject: 'Priority Updated',
      content: `Priority changed from ${oldPriority} to ${priority}. Reason: ${reason || 'Not specified'}`,
      timestamp: new Date(),
      read: true
    });

    await deal.save();

    res.json({ 
      message: 'Deal priority updated successfully', 
      deal: { priority: deal.priority }
    });
  } catch (error) {
    console.error('Error updating priority:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DELETE ROUTES
// ============================================================================

// Delete sales deal (soft delete by setting status to cancelled)
router.delete('/deals/:id', authenticateToken, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role === 'sales' && !req.user.permissions?.viewAllDeals) {
      query['salesPerson.id'] = req.user.id;
    }

    const deal = await SalesDeal.findOne(query);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found or access denied' });
    }

    // Soft delete by setting status to cancelled
    deal.status = 'cancelled';
    deal.updatedAt = new Date();
    deal.updatedBy = req.user.id;

    await deal.save();

    res.json({ message: 'Deal cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual sync endpoint for testing
router.post('/sync/manual', async (req, res) => {
  try {
    console.log('[SALES TRACKER] Manual sync requested');
    
    const StatusSyncService = require('../services/statusSyncService');
    const syncCount = await StatusSyncService.syncAllDeals();
    
    res.json({
      success: true,
      message: `Manual sync completed. ${syncCount} deals synchronized.`,
      syncCount
    });
  } catch (error) {
    console.error('[SALES TRACKER] Error during manual sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform manual sync',
      details: error.message
    });
  }
});

// Get sync status for a specific VIN
router.get('/sync/status/:vin', async (req, res) => {
  try {
    const { vin } = req.params;
    console.log(`[SALES TRACKER] Getting sync status for VIN: ${vin}`);
    
    const StatusSyncService = require('../services/statusSyncService');
    const status = await StatusSyncService.getSyncStatus(vin);
    
    res.json(status);
  } catch (error) {
    console.error(`[SALES TRACKER] Error getting sync status for VIN ${req.params.vin}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      details: error.message
    });
  }
});

// Sync a specific deal by VIN
router.post('/sync/deal/:vin', async (req, res) => {
  try {
    const { vin } = req.params;
    const { direction = 'both' } = req.body;
    
    console.log(`[SALES TRACKER] Manual sync for VIN: ${vin}, direction: ${direction}`);
    
    const StatusSyncService = require('../services/statusSyncService');
    const result = await StatusSyncService.syncDealByVin(vin, direction);
    
    res.json({
      success: true,
      message: `Sync completed for VIN: ${vin}`,
      result
    });
  } catch (error) {
    console.error(`[SALES TRACKER] Error syncing deal for VIN ${req.params.vin}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync deal',
      details: error.message
    });
  }
});

module.exports = router; 