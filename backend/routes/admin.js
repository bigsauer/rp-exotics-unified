const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// Performance tracking endpoint
router.get('/performance', async (req, res) => {
  try {
    const { period = 'thisMonth', userId = 'all' } = req.query;
    
    console.log('[ADMIN PERFORMANCE] Fetching performance data:', { period, userId });

    // Calculate date range based on period
    const now = new Date();
    let startDate, endDate, comparisonStartDate, comparisonEndDate;
    
    switch (period) {
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        comparisonStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        comparisonEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        comparisonStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        comparisonEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        comparisonStartDate = new Date(now.getFullYear() - 1, quarter * 3, 1);
        comparisonEndDate = new Date(now.getFullYear() - 1, (quarter + 1) * 3, 0);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        comparisonStartDate = new Date(now.getFullYear() - 1, 0, 1);
        comparisonEndDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        comparisonStartDate = new Date(now.getFullYear() - 2, 0, 1);
        comparisonEndDate = new Date(now.getFullYear() - 2, 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        comparisonStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        comparisonEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    // Build query
    const query = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    
    if (userId !== 'all') {
      query.createdBy = userId;
    }

    const comparisonQuery = {
      createdAt: { $gte: comparisonStartDate, $lte: comparisonEndDate }
    };
    
    if (userId !== 'all') {
      comparisonQuery.createdBy = userId;
    }

    // Fetch deals for current period
    const currentDeals = await Deal.find(query).populate('createdBy', 'profile.displayName email');
    
    // Fetch deals for comparison period
    const comparisonDeals = await Deal.find(comparisonQuery).populate('createdBy', 'profile.displayName email');

    // Calculate overview metrics
    const currentMetrics = calculateMetrics(currentDeals);
    const comparisonMetrics = calculateMetrics(comparisonDeals);

    // Calculate percentage changes
    const overview = {
      totalDeals: {
        value: currentMetrics.totalDeals,
        change: calculatePercentageChange(comparisonMetrics.totalDeals, currentMetrics.totalDeals)
      },
      carsBought: {
        value: currentMetrics.totalBuys,
        change: calculatePercentageChange(comparisonMetrics.totalBuys, currentMetrics.totalBuys)
      },
      carsSold: {
        value: currentMetrics.totalSales,
        change: calculatePercentageChange(comparisonMetrics.totalSales, currentMetrics.totalSales)
      },
      totalRevenue: {
        value: currentMetrics.totalRevenue,
        change: calculatePercentageChange(comparisonMetrics.totalRevenue, currentMetrics.totalRevenue)
      },
      dealsCompleted: {
        value: currentMetrics.completedDeals,
        change: calculatePercentageChange(comparisonMetrics.completedDeals, currentMetrics.completedDeals)
      },
      averageDealValue: {
        value: currentMetrics.averageDealValue,
        change: calculatePercentageChange(comparisonMetrics.averageDealValue, currentMetrics.averageDealValue)
      }
    };

    // Calculate user performance
    const userPerformance = await calculateUserPerformance(currentDeals, startDate, endDate);

    // Calculate deal type performance
    const dealTypePerformance = calculateDealTypePerformance(currentDeals);

    // Calculate monthly trends (last 6 months)
    const monthlyTrends = await calculateMonthlyTrends(userId);

    // Get recent activity
    const recentActivity = await getRecentActivity(currentDeals);

    const performanceData = {
      overview,
      userPerformance,
      dealTypePerformance,
      monthlyTrends,
      recentActivity
    };

    console.log('[ADMIN PERFORMANCE] Performance data calculated successfully');
    res.json(performanceData);

  } catch (error) {
    console.error('[ADMIN PERFORMANCE] Error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// Helper function to calculate metrics from deals
function calculateMetrics(deals) {
  // Count wholesale flip buy-sell deals as both a sale and a buy
  let totalDeals = deals.length;
  let totalBuys = 0;
  let totalSales = 0;
  
  deals.forEach(deal => {
    if (deal.dealType === 'wholesale-flip' && deal.dealType2SubType === 'buy-sell') {
      // Wholesale flip buy-sell deals count as both a buy and a sale
      totalBuys++;
      totalSales++;
    } else {
      // All other deals count as a buy
      totalBuys++;
    }
  });
  
  const totalRevenue = deals.reduce((sum, deal) => sum + (deal.purchasePrice || 0), 0);
  const completedDeals = deals.filter(deal => deal.currentStage === 'deal-complete').length;
  const averageDealValue = totalDeals > 0 ? totalRevenue / totalDeals : 0;

  return {
    totalDeals,
    totalBuys,
    totalSales,
    totalRevenue,
    completedDeals,
    averageDealValue
  };
}

// Helper function to calculate percentage change
function calculatePercentageChange(oldValue, newValue) {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return Math.round(((newValue - oldValue) / oldValue) * 100);
}

// Helper function to calculate user performance
async function calculateUserPerformance(deals, startDate, endDate) {
  const userStats = {};
  
  // Group deals by user
  deals.forEach(deal => {
    const userId = deal.createdBy?._id?.toString() || 'unknown';
    const userName = deal.createdBy?.profile?.displayName || deal.createdBy?.email || 'Unknown User';
    const userEmail = deal.createdBy?.email || 'unknown@email.com';
    
    if (!userStats[userId]) {
      userStats[userId] = {
        userId,
        name: userName,
        email: userEmail,
        carsBought: 0,
        carsSold: 0,
        totalRevenue: 0,
        dealsCompleted: 0,
        dealValues: []
      };
    }
    
    // Count wholesale flip buy-sell deals as both a buy and a sale
    if (deal.dealType === 'wholesale-flip' && deal.dealType2SubType === 'buy-sell') {
      userStats[userId].carsBought++;
      userStats[userId].carsSold++;
    } else {
      // All other deals count as a buy
      userStats[userId].carsBought++;
    }
    
    userStats[userId].totalRevenue += deal.purchasePrice || 0;
    userStats[userId].dealValues.push(deal.purchasePrice || 0);
    
    if (deal.currentStage === 'deal-complete') {
      userStats[userId].dealsCompleted++;
    }
  });

  // Calculate performance scores and convert to array
  const userPerformance = Object.values(userStats).map(user => {
    const averageDealValue = user.dealValues.length > 0 
      ? user.dealValues.reduce((sum, val) => sum + val, 0) / user.dealValues.length 
      : 0;
    
    // Calculate performance score (0-100) based on multiple factors
    const completionRate = user.carsBought > 0 ? (user.dealsCompleted / user.carsBought) * 100 : 0;
    const revenueScore = Math.min(user.totalRevenue / 1000000 * 100, 100); // Cap at 1M revenue
    const dealCountScore = Math.min(user.carsBought * 10, 100); // Cap at 10 deals
    
    const performanceScore = Math.round((completionRate * 0.4 + revenueScore * 0.4 + dealCountScore * 0.2));
    
    return {
      ...user,
      averageDealValue,
      performanceScore: Math.min(performanceScore, 100)
    };
  });

  // Sort by performance score (descending)
  return userPerformance.sort((a, b) => b.performanceScore - a.performanceScore);
}

// Helper function to calculate deal type performance
function calculateDealTypePerformance(deals) {
  const dealTypeStats = {};
  
  deals.forEach(deal => {
    const dealType = deal.dealType || 'unknown';
    
    if (!dealTypeStats[dealType]) {
      dealTypeStats[dealType] = {
        type: dealType,
        count: 0,
        revenue: 0,
        color: getDealTypeColor(dealType)
      };
    }
    
    dealTypeStats[dealType].count++;
    dealTypeStats[dealType].revenue += deal.purchasePrice || 0;
  });

  return Object.values(dealTypeStats).sort((a, b) => b.revenue - a.revenue);
}

// Helper function to get deal type color
function getDealTypeColor(dealType) {
  const colors = {
    'wholesale-d2d': 'from-blue-500 to-cyan-500',
    'wholesale-flip': 'from-purple-500 to-pink-500',
    'wholesale-pp': 'from-indigo-500 to-purple-500',
    'retail-pp': 'from-green-500 to-emerald-500',
    'retail-d2d': 'from-orange-500 to-red-500',
    'auction': 'from-yellow-500 to-orange-500',
    'finance': 'from-teal-500 to-cyan-500'
  };
  
  return colors[dealType] || 'from-gray-500 to-gray-600';
}

// Helper function to calculate monthly trends
async function calculateMonthlyTrends(userId) {
  const trends = [];
  const now = new Date();
  
  // Get last 6 months
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const query = {
      createdAt: { $gte: month, $lte: monthEnd }
    };
    
    if (userId !== 'all') {
      query.createdBy = userId;
    }
    
    const monthDeals = await Deal.find(query);
    const monthRevenue = monthDeals.reduce((sum, deal) => sum + (deal.purchasePrice || 0), 0);
    
    trends.push({
      month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      deals: monthDeals.length,
      revenue: monthRevenue
    });
  }
  
  return trends;
}

// Helper function to get recent activity
async function getRecentActivity(deals) {
  const recentDeals = deals
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);
  
  return recentDeals.map(deal => {
    const timeAgo = getTimeAgo(deal.createdAt);
    
    return {
      type: 'deal',
      title: `${deal.year} ${deal.make} ${deal.model} Deal Created`,
      description: `Stock #${deal.rpStockNumber || deal.stockNumber} • ${deal.createdBy?.profile?.displayName || deal.createdBy?.email}`,
      value: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(deal.purchasePrice || 0),
      time: timeAgo
    };
  });
}

// Helper function to get time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

module.exports = router; 