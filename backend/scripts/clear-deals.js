require('dotenv').config();
const mongoose = require('mongoose');
const Deal = require('../models/Deal');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    await Deal.deleteMany({});
    console.log('All deals deleted.');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }); 