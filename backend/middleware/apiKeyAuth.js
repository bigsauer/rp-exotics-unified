const ApiKey = require('../models/ApiKey');

// Middleware to verify API key
const authenticateApiKey = async (req, res, next) => {
  console.log(`[API KEY AUTH] ${req.method} ${req.originalUrl} - Starting API key authentication`);
  
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    console.warn(`[API KEY AUTH] No API key provided for ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: 'API key required' });
  }

  console.log(`[API KEY AUTH] API key found, length: ${apiKey.length}, starts with: ${apiKey.substring(0, 8)}...`);

  try {
    // Find the API key in the database
    const keyRecord = await ApiKey.findOne({ key: apiKey, isActive: true });
    
    if (!keyRecord) {
      console.warn('[API KEY AUTH] Invalid or inactive API key');
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    // Check if the API key has expired
    if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
      console.warn('[API KEY AUTH] API key has expired');
      return res.status(401).json({ error: 'API key has expired' });
    }

    // Update last used timestamp
    keyRecord.lastUsedAt = new Date();
    await keyRecord.save();

    console.log(`[API KEY AUTH] API key verified successfully, userId: ${keyRecord.userId}, permissions: ${keyRecord.permissions}`);
    
    // Add the API key info to the request
    req.apiKey = keyRecord;
    req.user = { 
      id: keyRecord.userId, 
      email: keyRecord.userEmail || 'api-user',
      role: keyRecord.userRole || 'api',
      permissions: keyRecord.permissions || []
    };
    
    next();
  } catch (error) {
    console.error('[API KEY AUTH] Database error:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
};

// Middleware to check if API key has specific permissions
const requireApiKeyPermission = (permission) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: 'API key authentication required' });
    }

    if (!req.apiKey.permissions || !req.apiKey.permissions.includes(permission)) {
      console.warn(`[API KEY AUTH] Permission denied: ${permission} not found in ${req.apiKey.permissions}`);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  authenticateApiKey,
  requireApiKeyPermission
}; 