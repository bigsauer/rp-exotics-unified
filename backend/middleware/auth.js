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
  console.log(`[AUTH DEBUG] ${req.method} ${req.originalUrl} - Starting authentication`);
  console.log(`[AUTH DEBUG] Headers:`, {
    authorization: req.headers['authorization'] ? 'Present' : 'Missing',
    cookie: req.cookies ? 'Present' : 'Missing',
    tokenInCookie: req.cookies?.token ? 'Present' : 'Missing'
  });
  
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.cookies && req.cookies.token) {
    // Try to get token from cookie if not in header
    req.tokenSource = 'cookie';
    token = req.cookies.token;
    console.log(`[AUTH DEBUG] Using token from cookie`);
  } else if (token) {
    console.log(`[AUTH DEBUG] Using token from Authorization header`);
  }

  if (!token) {
    console.warn(`[AUTH] No token provided for ${req.method} ${req.originalUrl}`);
    console.log(`[AUTH DEBUG] Auth header:`, authHeader);
    console.log(`[AUTH DEBUG] Cookies:`, req.cookies);
    return res.status(401).json({ error: 'Access token required' });
  }

  console.log(`[AUTH DEBUG] Token found, length: ${token.length}, starts with: ${token.substring(0, 20)}...`);

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.warn('[AUTH] Invalid or expired token:', err.message);
      console.log(`[AUTH DEBUG] Token verification failed:`, err.message);
      // Always return 401 for invalid/expired token
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    console.log(`[AUTH DEBUG] Token verified successfully, userId: ${decoded.userId}`);
    
    try {
      const user = await User.findById(decoded.userId);
      if (!user) {
        console.warn('[AUTH] User not found for decoded userId:', decoded.userId);
        // 401 for not found (not forbidden, just not authenticated)
        return res.status(401).json({ error: 'User not found' });
      }
      
      console.log(`[AUTH DEBUG] User found: ${user.email}, role: ${user.role}, active: ${user.isActive}`);
      
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
    console.log('[AUTH] requireBackOfficeAccess for user:', req.user && { 
      id: req.user._id, 
      email: req.user.email, 
      role: req.user.role, 
      isActive: req.user.isActive,
      permissions: req.user.permissions 
    });
    
    if (!req.user) {
      console.warn('[AUTH] No user object found in request');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has the required role
    const hasValidRole = req.user.role === 'admin' || req.user.role === 'finance' || req.user.role === 'sales';
    
    // Also check if user has backoffice permissions
    const hasBackofficePermission = req.user.permissions && req.user.permissions.backoffice && req.user.permissions.backoffice.access;
    
    if (!hasValidRole && !hasBackofficePermission) {
      console.warn('[AUTH] Access denied for user:', { 
        id: req.user._id, 
        email: req.user.email, 
        role: req.user.role,
        permissions: req.user.permissions 
      });
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Back office access required',
        userRole: req.user.role,
        userPermissions: req.user.permissions
      });
    }
    
    console.log('[AUTH] Back office access granted for user:', req.user.email);
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