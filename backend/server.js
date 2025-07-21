const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Unified deployment: allow all origins in dev, restrict in prod
const isProduction = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProduction ? undefined : true, // In production, same-origin requests only; in dev, allow all
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

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
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/backOffice'));
app.use('/api', require('./routes/dealers'));
app.use('/api', require('./routes/deals'));
app.use('/api', require('./routes/documents'));
app.use('/api', require('./routes/email'));
app.use('/api', require('./routes/salesTracker'));
app.use('/api', require('./routes/users'));

// The catch-all handler: for any request that doesn't match an API route, send back React's index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'OK',
    message: 'RP Exotics Backend is running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify frontend can connect
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Frontend successfully connected to backend!',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 