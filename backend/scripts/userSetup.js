const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const initialUsers = [
  { firstName: 'Parker', lastName: 'Gelber', email: 'parker@rpexotics.com', password: '1234', role: 'sales' },
  { firstName: 'Brennan', lastName: 'Sauer', email: 'brennan@rpexotics.com', password: '1026', role: 'sales' },
  { firstName: 'Dan', lastName: 'Mudd', email: 'dan@rpexotics.com', password: 'Ilikemen', role: 'sales' },
  { firstName: 'Chris', lastName: 'Murphy', email: 'chris@rpexotics.com', password: 'Matti11!', role: 'admin' },
  { firstName: 'Lynn', lastName: '', email: 'lynn@rpexotics.com', password: 'titles123', role: 'finance' },
  { firstName: 'Adiana', lastName: 'Palica', email: 'adiana@rpexotics.com', password: 'PalicARP', role: 'sales' },
  { firstName: 'Brett', lastName: 'M', email: 'brett@rpexotics.com', password: 'coop123!', role: 'sales' },
  { firstName: 'Tammie', lastName: 'W', email: 'tammie@rpexotics.com', password: 'Twood1125!', role: 'admin' }
];

const defaultPermissions = {
  admin: { 
    canCreateDeals: true, 
    canViewDeals: true, 
    canEditDeals: true, 
    canSearchDealers: true, 
    canManageDealers: true, 
    canAccessBackOffice: true, 
    canViewReports: true, 
    canViewFinancials: true, 
    canManageUsers: true,
    canViewMonthlyRevenue: true
  },
  sales: { 
    canCreateDeals: true, 
    canViewDeals: true, 
    canEditDeals: true, 
    canSearchDealers: true, 
    canManageDealers: true, 
    canAccessBackOffice: false, 
    canViewReports: true, 
    canViewFinancials: false, 
    canManageUsers: false,
    canViewMonthlyRevenue: false
  },
  finance: { 
    canCreateDeals: false, 
    canViewDeals: true, 
    canEditDeals: true, 
    canSearchDealers: true, 
    canManageDealers: false, 
    canAccessBackOffice: true, 
    canViewReports: true, 
    canViewFinancials: true, 
    canManageUsers: false,
    canViewMonthlyRevenue: true
  },
  viewer: { 
    canCreateDeals: false, 
    canViewDeals: true, 
    canEditDeals: false, 
    canSearchDealers: true, 
    canManageDealers: false, 
    canAccessBackOffice: false, 
    canViewReports: true, 
    canViewFinancials: false, 
    canManageUsers: false,
    canViewMonthlyRevenue: false
  }
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rpexotics');
  
  console.log('🗑️  Clearing existing users and indexes...');
  await User.deleteMany({});
  
  // Drop and recreate indexes to avoid conflicts
  try {
    await mongoose.connection.db.collection('users').dropIndexes();
    console.log('✅ Dropped existing indexes');
  } catch (error) {
    console.log('ℹ️  No indexes to drop or error dropping indexes:', error.message);
  }
  
  console.log('👥 Creating new users...');
  for (const u of initialUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const username = u.email.split('@')[0]; // Use email prefix as username
    
    await User.create({
      ...u,
      username,
      passwordHash,
      permissions: defaultPermissions[u.role] || {},
      profile: {
        firstName: u.firstName,
        lastName: u.lastName,
        displayName: `${u.firstName} ${u.lastName}`.trim()
      },
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✅ Created user: ${u.firstName} ${u.lastName} (${u.email})`);
  }
  
  console.log('🎉 All users seeded successfully!');
  process.exit();
}

seed(); 