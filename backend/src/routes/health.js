const express = require('express');
const router = express.Router();
const HealthCheckService = require('../services/HealthCheckService');

const healthCheckService = new HealthCheckService();

// GET /api/health - System health check
router.get('/', async (req, res) => {
  try {
    const health = await healthCheckService.getSystemHealth();
    
    const statusCode = health.overallHealth === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      timestamp: new Date().toISOString(),
      health: health
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/health/cron - Specific cron processor health check
router.get('/cron', async (req, res) => {
  try {
    const cronRunning = await healthCheckService.isCronProcessorRunning();
    
    res.status(cronRunning ? 200 : 503).json({
      success: true,
      cronProcessor: {
        running: cronRunning,
        status: cronRunning ? 'healthy' : 'inactive'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Cron health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Cron health check failed'
    });
  }
});

module.exports = router;