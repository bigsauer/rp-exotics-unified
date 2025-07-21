#!/usr/bin/env node

// Migration script to update all deals to use unified hyphenated status titles and priorities
console.log('🔧 Migrating all deals to unified status titles and priorities...');

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://brennan:OfSbbMXTdY2WxTFi@rp-exotics-cluster.wtjzoiq.mongodb.net/rp_exotics?retryWrites=true&w=majority&appName=rp-exotics-cluster';

const statusMap = {
  'contract_received': 'contract-received',
  'contract-received': 'contract-received',
  'purchased': 'contract-received',
  'title_processing': 'title-processing',
  'title-processing': 'title-processing',
  'documentation': 'title-processing',
  'payment_approved': 'payment-approved',
  'payment-approved': 'payment-approved',
  'verification': 'payment-approved',
  'funds_disbursed': 'funds-disbursed',
  'funds-disbursed': 'funds-disbursed',
  'processing': 'funds-disbursed',
  'title_received': 'title-received',
  'title-received': 'title-received',
  'ready-to-list': 'title-received',
  'ready_to_list': 'title-received',
  'deal_complete': 'deal-complete',
  'deal-complete': 'deal-complete',
  'completion': 'deal-complete',
};

const priorityMap = {
  'normal': 'medium',
  'medium': 'medium',
  'high': 'high',
  'urgent': 'urgent',
  'low': 'low',
};

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    // Update finance deals
    const financeDeals = await db.collection('deals').find({}).toArray();
    let updatedFinance = 0;
    for (const deal of financeDeals) {
      const newStage = statusMap[deal.currentStage];
      const newPriority = priorityMap[deal.priority] || 'medium';
      if ((newStage && deal.currentStage !== newStage) || deal.priority !== newPriority) {
        await db.collection('deals').updateOne(
          { _id: deal._id },
          { $set: { currentStage: newStage || deal.currentStage, priority: newPriority, updatedAt: new Date() } }
        );
        updatedFinance++;
        console.log(`Finance deal ${deal._id}: ${deal.currentStage} → ${newStage}, priority: ${deal.priority} → ${newPriority}`);
      }
    }
    
    // Update sales deals
    const salesDeals = await db.collection('salesdeals').find({}).toArray();
    let updatedSales = 0;
    for (const deal of salesDeals) {
      const newStage = statusMap[deal.currentStage];
      const newPriority = priorityMap[deal.priority] || 'medium';
      if ((newStage && deal.currentStage !== newStage) || deal.priority !== newPriority) {
        await db.collection('salesdeals').updateOne(
          { _id: deal._id },
          { $set: { currentStage: newStage || deal.currentStage, priority: newPriority, updatedAt: new Date() } }
        );
        updatedSales++;
        console.log(`Sales deal ${deal._id}: ${deal.currentStage} → ${newStage}, priority: ${deal.priority} → ${newPriority}`);
      }
    }
    
    console.log(`\n✅ Migration complete! Updated ${updatedFinance} finance deals and ${updatedSales} sales deals.`);
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

migrate(); 