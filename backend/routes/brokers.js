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

// Get broker commission summary for date range
router.get('/:id/commission-range', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const broker = await Broker.findById(req.params.id);
    if (!broker) {
      return res.status(404).json({
        success: false,
        message: 'Broker not found'
      });
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Filter monthly commissions within the date range
    const filteredCommissions = broker.monthlyCommissions.filter(commission => {
      const commissionDate = new Date(commission.month + '-01');
      return commissionDate >= start && commissionDate <= end;
    });

    // Calculate totals for the date range
    const totalAmount = filteredCommissions.reduce((sum, commission) => sum + commission.amount, 0);
    const totalDeals = filteredCommissions.reduce((sum, commission) => sum + commission.dealCount, 0);

    // Also check deals table for broker fees in the date range
    const Deal = require('../models/Deal');
    const dealsWithBrokerFees = await Deal.find({
      'brokerFeePaidTo': broker.name,
      'createdAt': { $gte: start, $lte: end },
      'brokerFee': { $gt: 0 }
    }).select('brokerFee createdAt dealType vin make model year');

    const dealsTotalAmount = dealsWithBrokerFees.reduce((sum, deal) => sum + (deal.brokerFee || 0), 0);
    const dealsTotalCount = dealsWithBrokerFees.length;

    res.json({
      success: true,
      data: {
        brokerId: broker._id,
        brokerName: broker.name,
        dateRange: {
          startDate,
          endDate
        },
        monthlyCommissions: filteredCommissions,
        summary: {
          totalAmount,
          totalDeals,
          dealsTotalAmount,
          dealsTotalCount,
          combinedTotal: totalAmount + dealsTotalAmount,
          combinedDeals: totalDeals + dealsTotalCount
        },
        deals: dealsWithBrokerFees
      }
    });
  } catch (error) {
    console.error('[BROKERS] Error fetching broker commission range:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch broker commission range',
      error: error.message
    });
  }
});

// Get broker fee summary for date range
router.get('/:id/fees-range', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const broker = await Broker.findById(req.params.id);
    if (!broker) {
      return res.status(404).json({
        success: false,
        message: 'Broker not found'
      });
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Filter fees within the date range
    const filteredFees = broker.feesHistory.filter(fee => {
      const feeDate = new Date(fee.date);
      return feeDate >= start && feeDate <= end;
    });

    // Calculate totals for the date range
    const totalFeesEarned = filteredFees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalFeesPaid = filteredFees.filter(fee => fee.paid).reduce((sum, fee) => sum + fee.amount, 0);
    const totalFeesUnpaid = totalFeesEarned - totalFeesPaid;
    const totalDeals = filteredFees.length;

    // Group by month for detailed breakdown
    const monthlyBreakdown = {};
    filteredFees.forEach(fee => {
      const month = new Date(fee.date).toISOString().slice(0, 7); // YYYY-MM format
      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = {
          month,
          totalEarned: 0,
          totalPaid: 0,
          dealCount: 0,
          deals: []
        };
      }
      monthlyBreakdown[month].totalEarned += fee.amount;
      monthlyBreakdown[month].totalPaid += fee.paid ? fee.amount : 0;
      monthlyBreakdown[month].dealCount += 1;
      monthlyBreakdown[month].deals.push({
        dealId: fee.dealId,
        dealVin: fee.dealVin,
        dealVehicle: fee.dealVehicle,
        amount: fee.amount,
        date: fee.date,
        paid: fee.paid,
        paidDate: fee.paidDate,
        salesPerson: fee.salesPerson,
        notes: fee.notes
      });
    });

    res.json({
      success: true,
      data: {
        brokerId: broker._id,
        brokerName: broker.name,
        dateRange: {
          startDate,
          endDate
        },
        summary: {
          totalFeesEarned,
          totalFeesPaid,
          totalFeesUnpaid,
          totalDeals,
          paymentRate: totalDeals > 0 ? (filteredFees.filter(fee => fee.paid).length / totalDeals * 100).toFixed(2) : 0
        },
        monthlyBreakdown: Object.values(monthlyBreakdown),
        fees: filteredFees
      }
    });
  } catch (error) {
    console.error('[BROKERS] Error fetching broker fees range:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch broker fees range',
      error: error.message
    });
  }
});

// Get all broker fees (for admin/management view)
router.get('/fees/all', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    let query = {};
    
    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      query['feesHistory.date'] = { $gte: start, $lte: end };
    }
    
    // Filter by payment status if provided
    if (status === 'paid' || status === 'unpaid') {
      query['feesHistory.paid'] = status === 'paid';
    }

    const brokers = await Broker.find(query)
      .select('name email totalFeesEarned totalFeesPaid feesHistory')
      .sort({ totalFeesEarned: -1 });

    // Calculate overall statistics
    const totalFeesEarned = brokers.reduce((sum, broker) => sum + broker.totalFeesEarned, 0);
    const totalFeesPaid = brokers.reduce((sum, broker) => sum + broker.totalFeesPaid, 0);
    const totalFeesUnpaid = totalFeesEarned - totalFeesPaid;

    res.json({
      success: true,
      data: {
        brokers,
        summary: {
          totalFeesEarned,
          totalFeesPaid,
          totalFeesUnpaid,
          totalBrokers: brokers.length
        }
      }
    });
  } catch (error) {
    console.error('[BROKERS] Error fetching all broker fees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch broker fees',
      error: error.message
    });
  }
});

module.exports = router; 