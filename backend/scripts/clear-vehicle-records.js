require('dotenv').config();
const mongoose = require('mongoose');
const VehicleRecord = require('../models/VehicleRecord');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    await VehicleRecord.deleteMany({});
    console.log('All vehicle records deleted.');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }); 