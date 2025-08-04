const express = require('express');
const router = express.Router();
const Broker = require('../models/Broker');
const { authenticateToken } = require('../middleware/auth');

// Get all brokers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, specialty, search } = req.query;
    let query = {};

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by specialty
    if (specialty && specialty !== 'all') {
      query.specialties = specialty;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const brokers = await Broker.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: brokers,
      count: brokers.length
    });
  } catch (error) {
    console.error('[BROKERS] Error fetching brokers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brokers',
      error: error.message
    });
  }
});

// Get single broker
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const broker = await Broker.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: 'Broker not found'
      });
    }

    res.json({
      success: true,
      data: broker
    });
  } catch (error) {
    console.error('[BROKERS] Error fetching broker:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch broker',
      error: error.message
    });
  }
});

// Create new broker
router.post('/', authenticateToken, async (req, res) => {
  try {
    const brokerData = {
      ...req.body,
      createdBy: req.user.id
    };

    const broker = new Broker(brokerData);
    await broker.save();

    const populatedBroker = await Broker.findById(broker._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Broker created successfully',
      data: populatedBroker
    });
  } catch (error) {
    console.error('[BROKERS] Error creating broker:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create broker',
      error: error.message
    });
  }
});

// Update broker
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const broker = await Broker.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: 'Broker not found'
      });
    }

    res.json({
      success: true,
      message: 'Broker updated successfully',
      data: broker
    });
  } catch (error) {
    console.error('[BROKERS] Error updating broker:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update broker',
      error: error.message
    });
  }
});

// Delete broker
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const broker = await Broker.findByIdAndDelete(req.params.id);

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: 'Broker not found'
      });
    }

    res.json({
      success: true,
      message: 'Broker deleted successfully'
    });
  } catch (error) {
    console.error('[BROKERS] Error deleting broker:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete broker',
      error: error.message
    });
  }
});

// Get broker statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const totalBrokers = await Broker.countDocuments();
    const activeBrokers = await Broker.countDocuments({ status: 'Active' });
    const inactiveBrokers = await Broker.countDocuments({ status: 'Inactive' });
    const pendingBrokers = await Broker.countDocuments({ status: 'Pending' });

    // Get top brokers by total volume
    const topBrokers = await Broker.find()
      .sort({ totalVolume: -1 })
      .limit(5)
      .select('name company totalVolume totalDeals');

    // Get brokers by specialty
    const specialtyStats = await Broker.aggregate([
      { $unwind: '$specialties' },
      {
        $group: {
          _id: '$specialties',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalBrokers,
        active: activeBrokers,
        inactive: inactiveBrokers,
        pending: pendingBrokers,
        topBrokers,
        specialtyStats
      }
    });
  } catch (error) {
    console.error('[BROKERS] Error fetching broker stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch broker statistics',
      error: error.message
    });
  }
});

// Update broker commission for a deal
router.post('/:id/update-commission', authenticateToken, async (req, res) => {
  try {
    const { commissionAmount, dealId } = req.body;
    const brokerId = req.params.id;
    
    if (!commissionAmount || commissionAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid commission amount required'
      });
    }

    const broker = await Broker.findById(brokerId);
    if (!broker) {
      return res.status(404).json({
        success: false,
        message: 'Broker not found'
      });
    }

    // Get current month in YYYY-MM format
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Find existing monthly commission record
    let monthlyCommission = broker.monthlyCommissions.find(
      mc => mc.month === currentMonth
    );

    if (monthlyCommission) {
      // Update existing record
      monthlyCommission.amount += commissionAmount;
      monthlyCommission.dealCount += 1;
      monthlyCommission.lastUpdated = new Date();
    } else {
      // Create new monthly record
      broker.monthlyCommissions.push({
        month: currentMonth,
        amount: commissionAmount,
        dealCount: 1,
        lastUpdated: new Date()
      });
    }

    // Update total stats
    broker.totalDeals += 1;
    broker.totalVolume += commissionAmount;
    broker.lastContact = new Date();

    await broker.save();

    res.json({
      success: true,
      message: 'Broker commission updated successfully',
      data: {
        brokerId: broker._id,
        brokerName: broker.name,
        commissionAmount,
        currentMonth,
        totalMonthlyAmount: monthlyCommission ? monthlyCommission.amount : commissionAmount,
        totalMonthlyDeals: monthlyCommission ? monthlyCommission.dealCount : 1
      }
    });
  } catch (error) {
    console.error('[BROKERS] Error updating broker commission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update broker commission',
      error: error.message
    });
  }
});

// Get broker commission summary
router.get('/:id/commission-summary', authenticateToken, async (req, res) => {
  try {
    const broker = await Broker.findById(req.params.id);
    if (!broker) {
      return res.status(404).json({
        success: false,
        message: 'Broker not found'
      });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyCommission = broker.monthlyCommissions.find(
      mc => mc.month === currentMonth
    );

    res.json({
      success: true,
      data: {
        brokerId: broker._id,
        brokerName: broker.name,
        currentMonth,
        monthlyCommission: monthlyCommission || {
          month: currentMonth,
          amount: 0,
          dealCount: 0
        },
        totalDeals: broker.totalDeals,
        totalVolume: broker.totalVolume,
        allMonthlyCommissions: broker.monthlyCommissions
      }
    });
  } catch (error) {
    console.error('[BROKERS] Error fetching broker commission summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch broker commission summary',
      error: error.message
    });
  }
});

module.exports = router; 