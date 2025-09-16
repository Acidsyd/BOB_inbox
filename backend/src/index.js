require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const validateEnvironmentVariables = require('./config/validateEnv');

// Validate environment variables
const envValidation = validateEnvironmentVariables();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/lead-lists', require('./routes/leadLists'));
// Alias for frontend compatibility (frontend expects /api/leads/lists)
app.use('/api/leads/lists', require('./routes/leadLists'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/email-accounts', require('./routes/emailAccounts'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/oauth2', require('./routes/oauth2'));
app.use('/api/replies', require('./routes/replies'));
app.use('/api/inbox', require('./routes/inbox'));
app.use('/api/reply-templates', require('./routes/reply-templates'));
app.use('/api/email-sync', require('./routes/emailSync'));
app.use('/api/unsubscribe', require('./routes/unsubscribe').router);
app.use('/api/health', require('./routes/health'));
app.use('/api/process', require('./routes/process'));
app.use('/api/track', require('./routes/tracking'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Basic health check (legacy)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check available at: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Show environment validation status
  if (!envValidation.isValid) {
    console.log('⚠️  Server started with missing environment variables');
    console.log('   Some features may not work properly.');
  }
  
  // Start async bounce detection
  if (process.env.NODE_ENV !== 'test') {
    const AsyncBounceDetector = require('./services/AsyncBounceDetector');
    const bounceDetector = new AsyncBounceDetector();
    bounceDetector.startPeriodicDetection();
    console.log('🔍 AsyncBounceDetector started - checking for bounces every 5 minutes');
  }
});

module.exports = app;