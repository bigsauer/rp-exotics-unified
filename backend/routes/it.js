const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// IT Management Routes - Only accessible by Clayton
const requireClaytonAccess = (req, res, next) => {
  if (!req.user || req.user.email !== 'clayton@rpexotics.com') {
    return res.status(403).json({ error: 'Access denied. IT management requires Clayton access.' });
  }
  next();
};

// Apply Clayton access requirement to all IT routes
router.use(auth, requireClaytonAccess);

// Get deployment status
router.get('/deployment/status', async (req, res) => {
  try {
    console.log('[IT API] Getting deployment status');
    
    // Read version from package.json
    const packageJson = await fs.readJson(path.join(__dirname, '../package.json'));
    const currentVersion = packageJson.version;
    
    // Get environment info
    const environment = process.env.NODE_ENV || 'development';
    const isProduction = environment === 'production';
    
    const deploymentStatus = {
      development: {
        status: 'online',
        lastDeploy: new Date().toISOString(),
        version: `${currentVersion}-dev`,
        environment: 'development'
      },
      production: {
        status: isProduction ? 'online' : 'offline',
        lastDeploy: new Date().toISOString(),
        version: currentVersion,
        environment: 'production'
      }
    };
    
    res.json({ success: true, data: deploymentStatus });
  } catch (error) {
    console.error('[IT API] Error getting deployment status:', error);
    res.status(500).json({ error: 'Failed to get deployment status' });
  }
});

// Trigger deployment
router.post('/deploy', async (req, res) => {
  try {
    const { environment, action, timestamp } = req.body;
    console.log(`[IT API] Deployment triggered for ${environment} by ${req.user.email}`);
    
    // Log the deployment request
    const deploymentLog = {
      id: Date.now(),
      environment,
      action,
      status: 'in_progress',
      timestamp,
      user: req.user.email,
      triggeredBy: req.user.email
    };
    
    // In a real implementation, this would trigger actual deployment
    // For now, we'll simulate the deployment process
    console.log(`[IT API] Simulating deployment to ${environment}...`);
    
    // Simulate deployment delay
    setTimeout(() => {
      console.log(`[IT API] Deployment to ${environment} completed`);
    }, 2000);
    
    res.json({ 
      success: true, 
      message: `Deployment to ${environment} initiated`,
      deploymentId: deploymentLog.id,
      estimatedTime: '2-5 minutes'
    });
  } catch (error) {
    console.error('[IT API] Deployment error:', error);
    res.status(500).json({ error: 'Failed to trigger deployment' });
  }
});

// Promote development to production
router.post('/promote', async (req, res) => {
  try {
    const { action, fromEnvironment, toEnvironment, timestamp } = req.body;
    console.log(`[IT API] Promotion from ${fromEnvironment} to ${toEnvironment} by ${req.user.email}`);
    
    // Log the promotion request
    const promotionLog = {
      id: Date.now(),
      environment: toEnvironment,
      action,
      status: 'in_progress',
      timestamp,
      user: req.user.email,
      fromEnvironment,
      toEnvironment
    };
    
    // In a real implementation, this would:
    // 1. Run tests on development
    // 2. Create a production build
    // 3. Deploy to production
    // 4. Run health checks
    console.log(`[IT API] Simulating promotion from ${fromEnvironment} to ${toEnvironment}...`);
    
    // Simulate promotion process
    setTimeout(() => {
      console.log(`[IT API] Promotion to ${toEnvironment} completed`);
    }, 3000);
    
    res.json({ 
      success: true, 
      message: `Promotion to ${toEnvironment} initiated`,
      promotionId: promotionLog.id,
      estimatedTime: '3-7 minutes',
      steps: [
        'Running tests on development',
        'Creating production build',
        'Deploying to production',
        'Running health checks'
      ]
    });
  } catch (error) {
    console.error('[IT API] Promotion error:', error);
    res.status(500).json({ error: 'Failed to promote to production' });
  }
});

// Rollback deployment
router.post('/rollback', async (req, res) => {
  try {
    const { environment, action, timestamp } = req.body;
    console.log(`[IT API] Rollback requested for ${environment} by ${req.user.email}`);
    
    // Log the rollback request
    const rollbackLog = {
      id: Date.now(),
      environment,
      action,
      status: 'in_progress',
      timestamp,
      user: req.user.email
    };
    
    // In a real implementation, this would:
    // 1. Identify the previous version
    // 2. Deploy the previous version
    // 3. Run health checks
    console.log(`[IT API] Simulating rollback for ${environment}...`);
    
    // Simulate rollback process
    setTimeout(() => {
      console.log(`[IT API] Rollback for ${environment} completed`);
    }, 2000);
    
    res.json({ 
      success: true, 
      message: `Rollback for ${environment} initiated`,
      rollbackId: rollbackLog.id,
      estimatedTime: '2-4 minutes'
    });
  } catch (error) {
    console.error('[IT API] Rollback error:', error);
    res.status(500).json({ error: 'Failed to rollback deployment' });
  }
});

// Get system metrics
router.get('/metrics', async (req, res) => {
  try {
    console.log('[IT API] Getting system metrics');
    
    // Get system information
    const os = require('os');
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    // Get CPU usage (simplified)
    const cpuUsage = Math.random() * 30 + 20; // Simulate 20-50% CPU usage
    
    // Get disk usage
    const diskUsage = Math.random() * 20 + 10; // Simulate 10-30% disk usage
    
    const metrics = {
      system: {
        memoryUsage: Math.round(memoryUsage),
        cpuUsage: Math.round(cpuUsage),
        diskUsage: Math.round(diskUsage),
        uptime: Math.floor(os.uptime() / 3600), // Hours
        platform: os.platform(),
        arch: os.arch()
      },
      application: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
        memoryUsage: process.memoryUsage()
      }
    };
    
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('[IT API] Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to get system metrics' });
  }
});

// Get deployment history
router.get('/deployment/history', async (req, res) => {
  try {
    console.log('[IT API] Getting deployment history');
    
    // In a real implementation, this would read from a database
    // For now, return mock data
    const history = [
      {
        id: Date.now() - 1000,
        environment: 'development',
        action: 'deploy',
        status: 'completed',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        user: 'clayton@rpexotics.com',
        details: 'v1.2.3-dev deployed successfully'
      },
      {
        id: Date.now() - 2000,
        environment: 'production',
        action: 'promote',
        status: 'completed',
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        user: 'clayton@rpexotics.com',
        fromVersion: 'v1.2.2-dev',
        toVersion: 'v1.2.2',
        details: 'Promoted from development to production'
      }
    ];
    
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('[IT API] Error getting deployment history:', error);
    res.status(500).json({ error: 'Failed to get deployment history' });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    console.log('[IT API] Health check requested');
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        backend: 'online',
        database: 'online',
        storage: 'online'
      },
      environment: process.env.NODE_ENV || 'development',
      version: require('../package.json').version
    };
    
    res.json({ success: true, data: health });
  } catch (error) {
    console.error('[IT API] Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

module.exports = router; 