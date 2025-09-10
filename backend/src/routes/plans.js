const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const planLimitsService = require('../services/PlanLimitsService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth middleware
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

/**
 * GET /api/plans/status
 * Get current plan status and usage for the organization
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const planStatus = await planLimitsService.getPlanStatus(organizationId);
    
    res.json({
      success: true,
      data: planStatus
    });
  } catch (error) {
    console.error('Error fetching plan status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch plan status',
      message: error.message 
    });
  }
});

/**
 * GET /api/plans/limits
 * Get plan limits only (no usage data)
 */
router.get('/limits', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const limits = await planLimitsService.getPlanLimits(organizationId);
    
    res.json({
      success: true,
      data: limits
    });
  } catch (error) {
    console.error('Error fetching plan limits:', error);
    res.status(500).json({ 
      error: 'Failed to fetch plan limits',
      message: error.message 
    });
  }
});

/**
 * GET /api/plans/usage
 * Get current usage only
 */
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const usage = await planLimitsService.getCurrentUsage(organizationId);
    
    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ 
      error: 'Failed to fetch usage',
      message: error.message 
    });
  }
});

/**
 * POST /api/plans/check-action
 * Check if an action can be performed within plan limits
 */
router.post('/check-action', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { actionType, currentCount } = req.body;
    
    if (!actionType) {
      return res.status(400).json({
        error: 'Action type is required'
      });
    }

    const canPerform = await planLimitsService.canPerformAction(
      organizationId, 
      actionType, 
      currentCount
    );
    
    const limits = await planLimitsService.getPlanLimits(organizationId);
    
    res.json({
      success: true,
      data: {
        canPerform,
        actionType,
        planType: limits.planType,
        isBeta: limits.isBeta
      }
    });
  } catch (error) {
    console.error('Error checking action:', error);
    res.status(500).json({ 
      error: 'Failed to check action',
      message: error.message 
    });
  }
});

module.exports = router;