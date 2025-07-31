const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Unified deployment: allow all origins in dev, restrict in prod
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://localhost:5001',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'https://rp-exotics-frontend.vercel.app',
  'https://astonishing-chicken-production.up.railway.app',
  'https://astonishing-chicken-production.up.railway.app', // Add your actual Railway backend URL if different
  process.env.FRONTEND_URL
].filter(Boolean);

function isAllowedOrigin(origin) {
  console.log('[CORS DEBUG] Incoming origin:', origin);
  if (!origin) {
    console.log('[CORS DEBUG] No origin provided, allowing request');
    return true; // Allow server-to-server/healthcheck and direct requests
  }
  if (allowedOrigins.includes(origin)) {
    console.log('[CORS DEBUG] Origin allowed:', origin);
    return true;
  }
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
    console.log('[CORS DEBUG] Vercel preview origin allowed:', origin);
    return true;
  }
  console.log('[CORS DEBUG] Origin NOT allowed:', origin);
  return false;
}

app.use(cors({
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors()); // Explicitly handle all OPTIONS preflight requests

app.use((req, res, next) => {
  console.log(`[DEBUG][SERVER] ${req.method} ${req.originalUrl} - Headers:`, req.headers);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB with better error handling
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/rp-exotics';

console.log('🔗 Attempting to connect to MongoDB...');
console.log('📍 Connection string:', mongoUri.includes('mongodb+srv') ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB');

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log('📊 Database:', mongoose.connection.name);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('\n🔧 To fix this issue:');
  console.log('1. For local development: Install MongoDB locally');
  console.log('   - macOS: brew install mongodb-community');
  console.log('   - Then run: brew services start mongodb-community');
  console.log('');
  console.log('2. For cloud development: Set up MongoDB Atlas');
  console.log('   - Create a free account at https://mongodb.com/atlas');
  console.log('   - Create a cluster and get your connection string');
  console.log('   - Add MONGODB_URI to your .env file');
  console.log('');
  console.log('3. For Railway deployment: Set MONGODB_URI in Railway dashboard');
  console.log('');
  console.log('⚠️  Server will continue running but database operations will fail');
});

// API routes (should come before the catch-all)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/backOffice', require('./routes/backOffice'));
app.use('/api/dealers', require('./routes/dealers'));
console.log('[DEBUG][server.js] Registering /api/deals route...');
app.use('/api/deals', require('./routes/deals'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/email', require('./routes/email'));
app.use('/api/sales', require('./routes/salesTracker'));
app.use('/api/users', require('./routes/users'));

// Debug logging for all API requests
app.use('/api', (req, res, next) => {
  console.log(`[API DEBUG] ${req.method} ${req.originalUrl} - Auth: ${req.headers['authorization'] || 'none'} - Cookies: ${JSON.stringify(req.cookies || {})}`);
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  console.log('[HEALTHCHECK] /api/health hit', {
    ip: req.ip,
    headers: req.headers
  });
  
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  // Test S3 connection if cloud storage is configured
  let s3Status = 'not_configured';
  let s3Error = null;
  
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET_NAME) {
    try {
      const cloudStorage = require('./services/cloudStorage');
      const bucketInfo = await cloudStorage.getBucketInfo();
      s3Status = bucketInfo.success ? 'connected' : 'error';
      s3Error = bucketInfo.error;
    } catch (error) {
      s3Status = 'error';
      s3Error = error.message;
    }
  }
  
  const healthStatus = {
    status: 'OK',
    message: 'RP Exotics Backend is running',
    database: dbStatus,
    s3_storage: s3Status,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
  
  if (s3Error) {
    healthStatus.s3_error = s3Error;
  }
  
  // Return 503 if critical services are down
  const criticalServicesDown = dbStatus === 'disconnected' || (s3Status === 'error' && process.env.NODE_ENV === 'production');
  const statusCode = criticalServicesDown ? 503 : 200;
  
  res.status(statusCode).json(healthStatus);
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Serve admin interface
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Test endpoint to verify frontend can connect
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Frontend successfully connected to backend!',
    timestamp: new Date().toISOString()
  });
});

// Add a fallback 404 JSON handler for all other routes
app.use((req, res, next) => {
  if (!req.originalUrl.startsWith('/api') && !req.originalUrl.startsWith('/uploads')) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 