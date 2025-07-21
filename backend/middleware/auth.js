const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'rp_exotics_super_secret_key_2025_change_this_in_production';

// Team member credentials (in production, these would be in a database)
const TEAM_MEMBERS = {
  'parker@rpexotics.com': { password: '1234', role: 'sales', displayName: 'Parker' },
  'brennan@rpexotics.com': { password: '1026', role: 'sales', displayName: 'Brennan' },
  'dan@rpexotics.com': { password: 'Ilikemen', role: 'sales', displayName: 'Dan' },
  'adiana@rpexotics.com': { password: 'PalicARP', role: 'sales', displayName: 'Adiana' },
  'brett@rpexotics.com': { password: 'coop123!', role: 'sales', displayName: 'Brett' },
  'chris@rpexotics.com': { password: 'Matti11!', role: 'admin', displayName: 'Chris' },
  'tammie@rpexotics.com': { password: 'Twood1125!', role: 'admin', displayName: 'Tammie' },
  'lynn@rpexotics.com': { password: 'titles123', role: 'finance', displayName: 'Lynn' }
};

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.cookies && req.cookies.token) {
    // Try to get token from cookie if not in header
    req.tokenSource = 'cookie';
    token = req.cookies.token;
  }

  if (!token) {
    console.warn('[AUTH] No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.warn('[AUTH] Invalid or expired token:', err);
      // Always return 401 for invalid/expired token
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    try {
      const user = await User.findById(decoded.userId);
      if (!user) {
        console.warn('[AUTH] User not found for decoded userId:', decoded.userId);
        // 401 for not found (not forbidden, just not authenticated)
        return res.status(401).json({ error: 'User not found' });
      }
      req.user = user;
      console.log('[AUTH] Authenticated user:', { id: user._id, email: user.email, role: user.role, isActive: user.isActive });
      next();
    } catch (dbErr) {
      console.error('[AUTH] Database error:', dbErr);
      return res.status(500).json({ error: 'Database error', details: dbErr.message });
    }
  });
};

// Middleware to check if user has back office access
const requireBackOfficeAccess = (req, res, next) => {
  try {
    console.log('[AUTH] requireBackOfficeAccess for user:', req.user && { id: req.user._id, email: req.user.email, role: req.user.role, isActive: req.user.isActive });
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'finance' && req.user.role !== 'sales')) {
      console.warn('[AUTH] Access denied for user:', req.user && { id: req.user._id, email: req.user.email, role: req.user.role });
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  } catch (error) {
    console.error('Back office access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check if user has admin access
const requireAdminAccess = (req, res, next) => {
  try {
    const user = TEAM_MEMBERS[req.user.email];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Admin access required' 
      });
    }

    next();
  } catch (error) {
    console.error('Admin access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check if user has finance access
const requireFinanceAccess = (req, res, next) => {
  try {
    const user = TEAM_MEMBERS[req.user.email];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'finance' && user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Finance or admin access required' 
      });
    }

    next();
  } catch (error) {
    console.error('Finance access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  authenticateToken,
  requireBackOfficeAccess,
  requireAdminAccess,
  requireFinanceAccess
}; 