const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { sequelize } = require('./models');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// API routes
app.get(`/api/${config.apiVersion}`, (req, res) => {
  res.json({
    message: 'ZimCommerce API',
    version: config.apiVersion,
    documentation: '/api/docs'
  });
});

// TODO: Add route handlers
// const authRoutes = require('./routes/auth');
// const productRoutes = require('./routes/products');
// const orderRoutes = require('./routes/orders');
// const walletRoutes = require('./routes/wallets');
// const webhookRoutes = require('./routes/webhooks');

// app.use(`/api/${config.apiVersion}/auth`, authRoutes);
// app.use(`/api/${config.apiVersion}/products`, productRoutes);
// app.use(`/api/${config.apiVersion}/orders`, orderRoutes);
// app.use(`/api/${config.apiVersion}/wallets`, walletRoutes);
// app.use(`/api/${config.apiVersion}/webhooks`, webhookRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(config.nodeEnv === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found'
    }
  });
});

// Database connection and server startup
const PORT = config.port;

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');
    
    // Sync database (in development only)
    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: false });
      console.log('✓ Database models synchronized.');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server is running on port ${PORT}`);
      console.log(`✓ Environment: ${config.nodeEnv}`);
      console.log(`✓ API Version: ${config.apiVersion}`);
    });
  } catch (error) {
    console.error('✗ Unable to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

// Start the server only if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
