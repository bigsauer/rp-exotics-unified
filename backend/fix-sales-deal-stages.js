#!/usr/bin/env node

// Fix sales deal stages that have invalid values
console.log('🔧 Fixing sales deal stages...');

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://brennan:OfSbbMXTdY2WxTFi@rp-exotics-cluster.wtjzoiq.mongodb.net/rp_exotics?retryWrites=true&w=majority&appName=rp-exotics-cluster';

async function fixSalesDealStages() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!');
    
    const db = mongoose.connection.db;
    
    // Find sales deals with invalid stages
    const invalidStages = await db.collection('salesdeals').find({
      currentStage: { $nin: ['purchased', 'documentation', 'verification', 'title-processing', 'ready-to-list'] }
    }).toArray();
    
    console.log(`Found ${invalidStages.length} sales deals with invalid stages`);
    
    if (invalidStages.length === 0) {
      console.log('No sales deals with invalid stages found');
      return;
    }
    
    // Fix each invalid stage
    for (const deal of invalidStages) {
      console.log(`Fixing deal ${deal._id} - current stage: ${deal.currentStage}`);
      
      // Map invalid stages to valid ones
      let newStage = 'purchased'; // default
      
      if (deal.currentStage === 'title_processing') {
        newStage = 'title-processing';
      } else if (deal.currentStage === 'title-processing') {
        newStage = 'title-processing'; // already correct
      } else if (deal.currentStage === 'ready_to_list') {
        newStage = 'ready-to-list';
      } else if (deal.currentStage === 'ready-to-list') {
        newStage = 'ready-to-list'; // already correct
      } else if (deal.currentStage === 'documentation') {
        newStage = 'documentation'; // already correct
      } else if (deal.currentStage === 'verification') {
        newStage = 'verification'; // already correct
      } else if (deal.currentStage === 'purchased') {
        newStage = 'purchased'; // already correct
      }
      
      // Update the deal
      await db.collection('salesdeals').updateOne(
        { _id: deal._id },
        { 
          $set: { 
            currentStage: newStage, 
            updatedAt: new Date() 
          } 
        }
      );
      
      console.log(`  → Updated to: ${newStage}`);
    }
    
    console.log('\n🎉 Sales deal stages fixed!');
    
    // Also check for any deals with 'normal' priority and fix them
    const normalPriorityDeals = await db.collection('salesdeals').find({ priority: 'normal' }).toArray();
    console.log(`Found ${normalPriorityDeals.length} sales deals with 'normal' priority`);
    
    if (normalPriorityDeals.length > 0) {
      await db.collection('salesdeals').updateMany(
        { priority: 'normal' },
        { $set: { priority: 'medium', updatedAt: new Date() } }
      );
      console.log(`✅ Updated ${normalPriorityDeals.length} deals from 'normal' to 'medium' priority`);
    }
    
    console.log('\n🎉 All fixes completed! Sync should now work without validation errors.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

fixSalesDealStages(); 