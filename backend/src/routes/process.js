const express = require('express');
const router = express.Router();
const ProcessManagerService = require('../services/ProcessManagerService');
const HealthCheckService = require('../services/HealthCheckService');

const processManager = new ProcessManagerService();
const healthCheckService = new HealthCheckService();

// Authentication middleware (reuse from other routes)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// GET /api/process/status - Get process manager status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const processStatus = processManager.getCronProcessorStatus();
    const healthStatus = await healthCheckService.isCronProcessorRunning();
    
    res.json({
      success: true,
      processManager: processStatus,
      healthCheck: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Process status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get process status'
    });
  }
});

// POST /api/process/start-cron - Manually start cron processor
router.post('/start-cron', authenticateToken, async (req, res) => {
  try {
    console.log('🚀 Manual cron processor start requested');
    const result = await processManager.startCronProcessor();
    
    res.status(result.success ? 200 : 503).json({
      success: result.success,
      message: result.message,
      pid: result.pid || null
    });
  } catch (error) {
    console.error('❌ Manual cron start error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start cron processor'
    });
  }
});

// POST /api/process/stop-cron - Manually stop cron processor
router.post('/stop-cron', authenticateToken, async (req, res) => {
  try {
    console.log('🛑 Manual cron processor stop requested');
    const result = await processManager.stopCronProcessor();
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('❌ Manual cron stop error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop cron processor'
    });
  }
});

module.exports = router;