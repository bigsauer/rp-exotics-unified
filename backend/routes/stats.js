const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Deal = require('../models/Deal');
const User = require('../models/User');
const Dealer = require('../models/Dealer');
const VehicleRecord = require('../models/VehicleRecord');

// Get comprehensive system statistics
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    console.log('[STATS] Fetching system overview statistics');
    
    // Get current date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Count total deals
    const totalDeals = await Deal.countDocuments();
    
    // Count deals by type
    const wholesaleDeals = await Deal.countDocuments({ dealType: { $regex: /^wholesale/ } });
    const retailDeals = await Deal.countDocuments({ dealType: { $regex: /^retail/ } });
    const auctionDeals = await Deal.countDocuments({ dealType: 'auction' });
    
    // Count wholesale flip buy-sell deals as both buys and sales
    const wholesaleFlipBuySellDeals = await Deal.countDocuments({ 
      dealType: 'wholesale-flip', 
      dealType2SubType: 'buy-sell' 
    });
    
    // Calculate total buys and sales
    const totalBuys = totalDeals + wholesaleFlipBuySellDeals; // Wholesale flip buy-sell counts as both
    const totalSales = wholesaleFlipBuySellDeals; // Only wholesale flip buy-sell deals count as sales
    
    // Count deals by status
    const activeDeals = await Deal.countDocuments({ currentStage: { $nin: ['deal-complete', 'funds-disbursed'] } });
    const completedDeals = await Deal.countDocuments({ currentStage: { $in: ['deal-complete', 'funds-disbursed'] } });
    
    // Today's activity
    const todayDeals = await Deal.countDocuments({ createdAt: { $gte: today } });
    const todayVehicleRecords = await VehicleRecord.countDocuments({ createdAt: { $gte: today } });
    
    // This month's activity
    const thisMonthDeals = await Deal.countDocuments({ createdAt: { $gte: thisMonth } });
    const lastMonthDeals = await Deal.countDocuments({ 
      createdAt: { $gte: lastMonth, $lt: thisMonth } 
    });
    
    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Dealer statistics
    const totalDealers = await Dealer.countDocuments();
    const activeDealers = await Dealer.countDocuments({ isActive: true });
    
    // Calculate growth
    const monthlyGrowth = lastMonthDeals > 0 ? 
      Math.round(((thisMonthDeals - lastMonthDeals) / lastMonthDeals) * 100) : 0;
    
    // System health metrics (simulated for now)
    const systemHealth = {
      database: {
        percentage: 99.8,
        status: 'good'
      },
      apiResponse: {
        time: Math.floor(Math.random() * 50) + 50, // 50-100ms
        status: 'good'
      },
      uptime: {
        percentage: 99.9,
        status: 'good'
      }
    };
    
    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const recentDeals = await Deal.find({ createdAt: { $gte: sevenDaysAgo } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('vehicle dealType currentStage createdAt')
      .lean();
    
    const stats = {
      overview: {
        totalDeals,
        totalBuys,
        totalSales,
        activeDeals,
        completedDeals,
        totalUsers,
        activeUsers,
        totalDealers,
        activeDealers
      },
      dealTypes: {
        wholesale: wholesaleDeals,
        retail: retailDeals,
        auction: auctionDeals
      },
      activity: {
        today: {
          newDeals: todayDeals,
          vehicleRecords: todayVehicleRecords,
          documents: Math.round(todayDeals * 2.5), // Estimate 2.5 docs per deal
          dealerContacts: Math.round(todayDeals * 1.5) // Estimate 1.5 contacts per deal
        },
        thisMonth: thisMonthDeals,
        lastMonth: lastMonthDeals,
        monthlyGrowth
      },
      systemHealth,
      recentActivity: recentDeals.map(deal => ({
        id: deal._id,
        vehicle: deal.vehicle,
        dealType: deal.dealType,
        status: deal.currentStage,
        date: deal.createdAt
      }))
    };
    
    console.log('[STATS] Successfully fetched system overview');
    res.json({ success: true, data: stats });
    
  } catch (error) {
    console.error('[STATS] Error fetching system overview:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
});

// Get user-specific statistics
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access these stats (admin or own stats)
    if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // User's deals
    const userDeals = await Deal.countDocuments({ createdBy: userId });
    const userTodayDeals = await Deal.countDocuments({ 
      createdBy: userId, 
      createdAt: { $gte: today } 
    });
    
    // User's completed deals
    const userCompletedDeals = await Deal.countDocuments({ 
      createdBy: userId, 
      currentStage: { $in: ['deal-complete', 'funds-disbursed'] } 
    });
    
    // User's recent activity
    const userRecentDeals = await Deal.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('vehicle dealType currentStage createdAt')
      .lean();
    
    const userStats = {
      totalDeals: userDeals,
      todayDeals: userTodayDeals,
      completedDeals: userCompletedDeals,
      completionRate: userDeals > 0 ? Math.round((userCompletedDeals / userDeals) * 100) : 0,
      recentDeals: userRecentDeals
    };
    
    res.json({ success: true, data: userStats });
    
  } catch (error) {
    console.error('[STATS] Error fetching user statistics:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Get real-time system metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    // Only allow admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const metrics = {
      timestamp: new Date(),
      deals: {
        total: await Deal.countDocuments(),
        active: await Deal.countDocuments({ currentStage: { $nin: ['deal-complete', 'funds-disbursed'] } }),
        today: await Deal.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } })
      },
      users: {
        total: await User.countDocuments(),
        active: await User.countDocuments({ isActive: true })
      },
      dealers: {
        total: await Dealer.countDocuments(),
        active: await Dealer.countDocuments({ isActive: true })
      },
      documents: {
        total: await VehicleRecord.countDocuments()
      }
    };
    
    res.json({ success: true, data: metrics });
    
  } catch (error) {
    console.error('[STATS] Error fetching system metrics:', error);
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

module.exports = router; 