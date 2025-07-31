const express = require('express');
const jwt = require('jsonwebtoken');
const ApiKey = require('../models/ApiKey');
const User = require('../models/User');
const Dealer = require('../models/Dealer');
const Deal = require('../models/Deal');
const router = express.Router();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'rp_exotics_super_secret_key_2025_change_this_in_production';
  
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    try {
      const user = await User.findById(decoded.userId).select('-passwordHash');
      
      if (!user || !user.isActive) {
        return res.status(403).json({ error: 'User not found or inactive' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  });
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Apply authentication to all routes
router.use(authenticateToken);

// Get all API keys (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const apiKeys = await ApiKey.find({})
      .populate('createdBy', 'firstName lastName email')
      .populate('entityId', 'name email')
      .sort({ createdAt: -1 });

    res.json(apiKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Get API keys for current user
router.get('/my-keys', async (req, res) => {
  try {
    const apiKeys = await ApiKey.find({
      entityId: req.user._id,
      entityType: 'User',
      isActive: true
    }).sort({ createdAt: -1 });

    res.json(apiKeys);
  } catch (error) {
    console.error('Error fetching user API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Create new API key (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      entityId,
      entityType,
      permissions,
      expiresAt
    } = req.body;

    // Validation
    if (!name || !entityId || !entityType) {
      return res.status(400).json({ error: 'Name, entity ID, and entity type are required' });
    }

    // Validate entity exists
    let entity;
    switch (entityType) {
      case 'User':
        entity = await User.findById(entityId);
        break;
      case 'Dealer':
        entity = await Dealer.findById(entityId);
        break;
      case 'Deal':
        entity = await Deal.findById(entityId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid entity type' });
    }

    if (!entity) {
      return res.status(400).json({ error: 'Entity not found' });
    }

    // Generate API key
    const apiKey = new ApiKey({
      key: ApiKey.generateKey(),
      name,
      description,
      type: type || 'internal',
      entityId,
      entityType,
      permissions: permissions || {
        signAgreements: true,
        viewDocuments: true,
        createSignatures: true
      },
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user._id
    });

    const savedApiKey = await apiKey.save();
    
    // Populate references
    await savedApiKey.populate('createdBy', 'firstName lastName email');
    await savedApiKey.populate('entityId', 'name email');

    console.log(`[API KEY] Admin ${req.user.email} created API key: ${name}`);
    
    res.status(201).json({
      message: 'API key created successfully',
      apiKey: savedApiKey
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Update API key (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      permissions,
      isActive,
      expiresAt
    } = req.body;

    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Update fields
    if (name !== undefined) apiKey.name = name;
    if (description !== undefined) apiKey.description = description;
    if (permissions !== undefined) apiKey.permissions = permissions;
    if (isActive !== undefined) apiKey.isActive = isActive;
    if (expiresAt !== undefined) apiKey.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const updatedApiKey = await apiKey.save();
    
    // Populate references
    await updatedApiKey.populate('createdBy', 'firstName lastName email');
    await updatedApiKey.populate('entityId', 'name email');

    console.log(`[API KEY] Admin ${req.user.email} updated API key: ${updatedApiKey.name}`);
    
    res.json({
      message: 'API key updated successfully',
      apiKey: updatedApiKey
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// Delete API key (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    await ApiKey.findByIdAndDelete(req.params.id);
    
    console.log(`[API KEY] Admin ${req.user.email} deleted API key: ${apiKey.name}`);
    
    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// Regenerate API key (admin only)
router.post('/:id/regenerate', requireAdmin, async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Generate new key
    apiKey.key = ApiKey.generateKey();
    apiKey.updatedAt = new Date();
    
    const updatedApiKey = await apiKey.save();
    
    // Populate references
    await updatedApiKey.populate('createdBy', 'firstName lastName email');
    await updatedApiKey.populate('entityId', 'name email');

    console.log(`[API KEY] Admin ${req.user.email} regenerated API key: ${updatedApiKey.name}`);
    
    res.json({
      message: 'API key regenerated successfully',
      apiKey: updatedApiKey
    });
  } catch (error) {
    console.error('Error regenerating API key:', error);
    res.status(500).json({ error: 'Failed to regenerate API key' });
  }
});

// Validate API key (for signature verification)
router.post('/validate', async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const apiKey = await ApiKey.findOne({ key, isActive: true });
    if (!apiKey) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    if (!apiKey.isValid()) {
      return res.status(401).json({ error: 'API key has expired' });
    }

    // Increment usage
    await apiKey.incrementUsage();

    // Populate entity information
    await apiKey.populate('entityId', 'name email firstName lastName');

    res.json({
      valid: true,
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        type: apiKey.type,
        permissions: apiKey.permissions,
        entity: apiKey.entityId
      }
    });
  } catch (error) {
    console.error('Error validating API key:', error);
    res.status(500).json({ error: 'Failed to validate API key' });
  }
});

module.exports = router; 