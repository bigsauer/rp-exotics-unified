const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Ensure only IT/admin users can access these routes
const requireITAccess = (req, res, next) => {
  if (req.user && (req.user.role === 'it' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. IT privileges required.' });
  }
};

// Apply IT access middleware to all routes
router.use(auth, requireITAccess);

// Get deployment status for all environments
router.get('/deployment/status', async (req, res) => {
  try {
    const deploymentStatus = {
      development: {
        status: 'online',
        lastDeploy: process.env.DEV_LAST_DEPLOY || new Date().toISOString(),
        version: process.env.DEV_VERSION || 'v1.2.3-dev',
        environment: 'development',
        url: process.env.DEV_URL || 'https://dev-opis-frontend.vercel.app'
      },
      staging: {
        status: 'online',
        lastDeploy: process.env.STAGING_LAST_DEPLOY || new Date().toISOString(),
        version: process.env.STAGING_VERSION || 'v1.2.3-staging',
        environment: 'staging',
        url: process.env.STAGING_URL || 'https://staging-opis-frontend.vercel.app'
      },
      production: {
        status: 'online',
        lastDeploy: process.env.PROD_LAST_DEPLOY || new Date().toISOString(),
        version: process.env.PROD_VERSION || 'v1.2.2',
        environment: 'production',
        url: process.env.PROD_URL || 'https://opis-frontend-dw442ltxo-bigsauers-projects.vercel.app'
      }
    };

    res.json({
      success: true,
      data: deploymentStatus
    });
  } catch (error) {
    console.error('[IT ROUTES] Error getting deployment status:', error);
    res.status(500).json({ error: 'Failed to get deployment status' });
  }
});

// Get deployment history
router.get('/deployment/history', async (req, res) => {
  try {
    // In a real implementation, this would come from a database
    const deploymentHistory = [
      {
        id: 1,
        environment: 'production',
        action: 'promote',
        status: 'completed',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        user: 'clayton@rp-exotics.com',
        fromVersion: 'v1.2.1',
        toVersion: 'v1.2.2'
      },
      {
        id: 2,
        environment: 'staging',
        action: 'promote',
        status: 'completed',
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        user: 'clayton@rp-exotics.com',
        fromVersion: 'v1.2.1-dev',
        toVersion: 'v1.2.1-staging'
      }
    ];

    res.json({
      success: true,
      data: deploymentHistory
    });
  } catch (error) {
    console.error('[IT ROUTES] Error getting deployment history:', error);
    res.status(500).json({ error: 'Failed to get deployment history' });
  }
});

// Trigger deployment to specific environment
router.post('/deploy', async (req, res) => {
  try {
    const { environment, action, timestamp } = req.body;
    
    console.log(`[IT ROUTES] Deployment triggered: ${action} to ${environment} at ${timestamp}`);
    
    // Log the deployment action
    const deploymentLog = {
      id: Date.now(),
      environment,
      action,
      status: 'in_progress',
      timestamp,
      user: req.user.email
    };

    // In a real implementation, you would:
    // 1. Trigger the actual deployment (Vercel/Railway webhook)
    // 2. Store the deployment log in database
    // 3. Update environment variables
    
    // Simulate deployment process
    setTimeout(() => {
      console.log(`[IT ROUTES] Deployment completed for ${environment}`);
    }, 5000);

    res.json({
      success: true,
      message: `Deployment to ${environment} initiated`,
      deploymentId: deploymentLog.id
    });
  } catch (error) {
    console.error('[IT ROUTES] Deployment error:', error);
    res.status(500).json({ error: 'Deployment failed' });
  }
});

// Promote from one environment to another
router.post('/promote', async (req, res) => {
  try {
    const { fromEnvironment, toEnvironment, action, timestamp } = req.body;
    
    console.log(`[IT ROUTES] Promotion triggered: ${fromEnvironment} → ${toEnvironment} at ${timestamp}`);
    
    // Validate promotion path
    const validPromotions = [
      ['development', 'staging'],
      ['staging', 'production']
    ];
    
    const isValidPromotion = validPromotions.some(([from, to]) => 
      from === fromEnvironment && to === toEnvironment
    );
    
    if (!isValidPromotion) {
      return res.status(400).json({ 
        error: `Invalid promotion path: ${fromEnvironment} → ${toEnvironment}` 
      });
    }

    // Log the promotion action
    const promotionLog = {
      id: Date.now(),
      environment: toEnvironment,
      action: 'promote',
      status: 'in_progress',
      timestamp,
      user: req.user.email,
      fromEnvironment,
      toEnvironment
    };

    // In a real implementation, you would:
    // 1. Trigger the promotion (copy from one environment to another)
    // 2. Update environment variables
    // 3. Store the promotion log in database
    
    // Simulate promotion process
    setTimeout(() => {
      console.log(`[IT ROUTES] Promotion completed: ${fromEnvironment} → ${toEnvironment}`);
    }, 3000);

    res.json({
      success: true,
      message: `Promotion from ${fromEnvironment} to ${toEnvironment} initiated`,
      promotionId: promotionLog.id
    });
  } catch (error) {
    console.error('[IT ROUTES] Promotion error:', error);
    res.status(500).json({ error: 'Promotion failed' });
  }
});

// Rollback deployment
router.post('/rollback', async (req, res) => {
  try {
    const { environment, action, timestamp } = req.body;
    
    console.log(`[IT ROUTES] Rollback triggered for ${environment} at ${timestamp}`);
    
    // Log the rollback action
    const rollbackLog = {
      id: Date.now(),
      environment,
      action: 'rollback',
      status: 'in_progress',
      timestamp,
      user: req.user.email
    };

    // In a real implementation, you would:
    // 1. Trigger the rollback (deploy previous version)
    // 2. Update environment variables
    // 3. Store the rollback log in database
    
    // Simulate rollback process
    setTimeout(() => {
      console.log(`[IT ROUTES] Rollback completed for ${environment}`);
    }, 2000);

    res.json({
      success: true,
      message: `Rollback for ${environment} initiated`,
      rollbackId: rollbackLog.id
    });
  } catch (error) {
    console.error('[IT ROUTES] Rollback error:', error);
    res.status(500).json({ error: 'Rollback failed' });
  }
});

// Feature flags management
router.get('/feature-flags', async (req, res) => {
  try {
    const featureFlags = {
      enhancedSignatures: { 
        enabled: true, 
        environments: ['development', 'staging'],
        description: 'Enhanced PDF signature system with cursive fonts'
      },
      newDashboard: { 
        enabled: false, 
        environments: ['development'],
        description: 'New dashboard layout and features'
      },
      advancedReporting: { 
        enabled: false, 
        environments: [],
        description: 'Advanced reporting and analytics'
      },
      betaFeatures: { 
        enabled: true, 
        environments: ['development', 'staging'],
        description: 'Beta features for testing'
      }
    };

    res.json({
      success: true,
      data: featureFlags
    });
  } catch (error) {
    console.error('[IT ROUTES] Error getting feature flags:', error);
    res.status(500).json({ error: 'Failed to get feature flags' });
  }
});

// Toggle feature flag
router.post('/feature-flags', async (req, res) => {
  try {
    const { feature, environment, action, timestamp } = req.body;
    
    console.log(`[IT ROUTES] Feature flag toggle: ${feature} for ${environment} at ${timestamp}`);
    
    // In a real implementation, you would:
    // 1. Update the feature flag in database/config
    // 2. Trigger environment-specific deployment if needed
    // 3. Log the change
    
    res.json({
      success: true,
      message: `Feature flag ${feature} toggled for ${environment}`,
      feature,
      environment,
      action
    });
  } catch (error) {
    console.error('[IT ROUTES] Feature flag toggle error:', error);
    res.status(500).json({ error: 'Feature flag toggle failed' });
  }
});

// Get testing environment status
router.get('/testing-environments', async (req, res) => {
  try {
    const testingEnvironments = {
      development: {
        status: 'active',
        users: ['clayton@rp-exotics.com', 'test@rp-exotics.com'],
        features: ['enhancedSignatures', 'betaFeatures'],
        lastTest: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        url: process.env.DEV_URL || 'https://dev-opis-frontend.vercel.app'
      },
      staging: {
        status: 'active',
        users: ['clayton@rp-exotics.com'],
        features: ['enhancedSignatures'],
        lastTest: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        url: process.env.STAGING_URL || 'https://staging-opis-frontend.vercel.app'
      }
    };

    res.json({
      success: true,
      data: testingEnvironments
    });
  } catch (error) {
    console.error('[IT ROUTES] Error getting testing environments:', error);
    res.status(500).json({ error: 'Failed to get testing environments' });
  }
});

// System health check
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      backend: 'online',
      database: 'online',
      storage: 'online',
      performance: 'good',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };

    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('[IT ROUTES] Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Run system diagnostics
router.post('/diagnostics', async (req, res) => {
  try {
    const { type } = req.body;
    
    console.log(`[IT ROUTES] Running diagnostics: ${type}`);
    
    let result = {};
    
    switch (type) {
      case 'system':
        result = {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          uptime: process.uptime(),
          platform: process.platform,
          nodeVersion: process.version
        };
        break;
      case 'database':
        // In a real implementation, test database connection
        result = { status: 'connected', responseTime: '15ms' };
        break;
      case 'api':
        // In a real implementation, test API endpoints
        result = { status: 'healthy', endpoints: ['/api/deals', '/api/users', '/api/signatures'] };
        break;
      default:
        return res.status(400).json({ error: 'Invalid diagnostic type' });
    }

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[IT ROUTES] Diagnostics error:', error);
    res.status(500).json({ error: 'Diagnostics failed' });
  }
});

module.exports = router; 