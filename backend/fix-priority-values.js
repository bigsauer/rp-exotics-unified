#!/usr/bin/env node

// Fix priority values in existing sales deals
console.log('🔧 Fixing priority values in sales deals...');

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://brennan:OfSbbMXTdY2WxTFi@rp-exotics-cluster.wtjzoiq.mongodb.net/rp_exotics?retryWrites=true&w=majority&appName=rp-exotics-cluster';

async function fixPriorityValues() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!');
    
    const db = mongoose.connection.db;
    
    // Find sales deals with 'normal' priority
    const salesDeals = await db.collection('salesdeals').find({ priority: 'normal' }).toArray();
    console.log(`Found ${salesDeals.length} sales deals with 'normal' priority`);
    
    if (salesDeals.length === 0) {
      console.log('No sales deals with incorrect priority found');
      return;
    }
    
    // Update them to 'medium'
    const result = await db.collection('salesdeals').updateMany(
      { priority: 'normal' },
      { $set: { priority: 'medium', updatedAt: new Date() } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} sales deals from 'normal' to 'medium' priority`);
    
    // Also fix any finance deals with 'normal' priority
    const financeDeals = await db.collection('deals').find({ priority: 'normal' }).toArray();
    console.log(`Found ${financeDeals.length} finance deals with 'normal' priority`);
    
    if (financeDeals.length > 0) {
      const financeResult = await db.collection('deals').updateMany(
        { priority: 'normal' },
        { $set: { priority: 'medium', updatedAt: new Date() } }
      );
      console.log(`✅ Updated ${financeResult.modifiedCount} finance deals from 'normal' to 'medium' priority`);
    }
    
    console.log('\n🎉 Priority values fixed! Sync should now work without validation errors.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

fixPriorityValues(); 