#!/usr/bin/env node

// Simple fix script - just run: node run-fix-manually.js
console.log('🔧 Starting sync fix...');

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://brennan:OfSbbMXTdY2WxTFi@rp-exotics-cluster.wtjzoiq.mongodb.net/rp_exotics?retryWrites=true&w=majority&appName=rp-exotics-cluster';

async function fixSync() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!');
    
    const db = mongoose.connection.db;
    
    // Get finance deals
    const financeDeals = await db.collection('deals').find({}).toArray();
    console.log(`Found ${financeDeals.length} finance deals`);
    
    // Get or create sales user
    let salesUser = await db.collection('users').findOne({ role: 'sales' });
    if (!salesUser) {
      const result = await db.collection('users').insertOne({
        firstName: 'Sales', lastName: 'Team', email: 'sales@rpexotics.com',
        username: 'salesteam', passwordHash: '$2b$12$default', role: 'sales',
        isActive: true, profile: { firstName: 'Sales', lastName: 'Team', 
        displayName: 'Sales Team', department: 'Sales', phone: '555-0000' }
      });
      salesUser = { _id: result.insertedId, profile: { displayName: 'Sales Team' }, email: 'sales@rpexotics.com', profile: { phone: '555-0000' } };
    }
    
    let created = 0;
    const stageMap = {
      'contract_received': 'purchased', 'title_processing': 'documentation',
      'payment_approved': 'verification', 'funds_disbursed': 'title-processing',
      'title_received': 'ready-to-list', 'deal_complete': 'ready-to-list'
    };
    
    for (const deal of financeDeals) {
      const existing = await db.collection('salesdeals').findOne({ vin: deal.vin });
      if (existing) continue;
      
      const mappedStage = stageMap[deal.currentStage] || 'purchased';
      
      await db.collection('salesdeals').insertOne({
        vehicle: deal.vehicle || `${deal.year} ${deal.make} ${deal.model}`,
        vin: deal.vin,
        stockNumber: deal.rpStockNumber || `SALES-${Date.now()}`,
        year: deal.year, make: deal.make, model: deal.model,
        salesPerson: { id: salesUser._id, name: salesUser.profile.displayName, email: salesUser.email, phone: salesUser.profile.phone },
        customer: { name: deal.seller?.name || 'Auto-created', type: 'dealer', contact: { email: 'auto@rpexotics.com', phone: '555-0000' } },
        financial: { purchasePrice: deal.purchasePrice, listPrice: deal.listPrice || deal.purchasePrice * 1.1 },
        timeline: { purchaseDate: deal.purchaseDate || deal.createdAt || new Date(), estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        currentStage: mappedStage, previousStage: null,
        stageHistory: [{ stage: mappedStage, enteredAt: new Date(), notes: `Auto-created from finance deal stage: ${deal.currentStage}` }],
        priority: deal.priority === 'normal' ? 'medium' : (deal.priority || 'medium'), status: 'active',
        createdAt: deal.createdAt || new Date(), updatedAt: new Date(),
        createdBy: salesUser._id, updatedBy: salesUser._id
      });
      
      created++;
      console.log(`Created sales deal for VIN: ${deal.vin} (${deal.currentStage} → ${mappedStage})`);
    }
    
    console.log(`\n🎉 SUCCESS! Created ${created} sales deals!`);
    console.log('Your sync system should now work properly!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

fixSync(); 