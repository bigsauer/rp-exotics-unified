const mongoose = require('mongoose');
require('dotenv').config();

// Define the correct flat permissions structure
const correctPermissions = {
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

async function fixUserPermissions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    // Explicitly use the rp_exotics database
    const rpExoticsDb = db.client.db('rp_exotics');
    const usersCollection = rpExoticsDb.collection('users');

    console.log('🔍 Using database: rp_exotics');
    console.log('🔍 Using collection: users');

    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`📋 Found ${users.length} users to update`);

    let updatedCount = 0;

    for (const user of users) {
      const role = user.role;
      
      if (!correctPermissions[role]) {
        console.log(`⚠️  Unknown role for user ${user.email}: ${role}`);
        continue;
      }

      // Check if user already has correct permissions
      const currentPermissions = user.permissions || {};
      const correctPerms = correctPermissions[role];
      
      console.log(`🔍 Checking ${user.email} (${role}):`, JSON.stringify(currentPermissions, null, 2));
      
      // Check if permissions need updating (convert nested to flat)
      let needsUpdate = false;
      
      // Check if user has old nested structure
      if (currentPermissions.deals || currentPermissions.dealers || currentPermissions.backoffice) {
        needsUpdate = true;
        console.log(`🔄 Converting nested permissions to flat for ${user.email}`);
      } else {
        // Check if flat permissions are correct
        for (const [key, value] of Object.entries(correctPerms)) {
          if (currentPermissions[key] !== value) {
            needsUpdate = true;
            break;
          }
        }
      }

      // Force update for all users to ensure consistency
      needsUpdate = true;
      console.log(`🔄 Force updating permissions for ${user.email} to ensure consistency`);

      if (needsUpdate) {
        await usersCollection.updateOne(
          { _id: user._id },
          { 
            $set: { 
              permissions: correctPerms,
              updatedAt: new Date()
            }
          }
        );
        console.log(`✅ Updated permissions for ${user.email} (${role})`);
        updatedCount++;
      } else {
        console.log(`ℹ️  User ${user.email} already has correct permissions`);
      }
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} users`);
    console.log('📊 Summary:');
    for (const [role, perms] of Object.entries(correctPermissions)) {
      const roleUsers = users.filter(u => u.role === role);
      console.log(`   ${role}: ${roleUsers.length} users`);
    }

  } catch (error) {
    console.error('❌ Error fixing user permissions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixUserPermissions(); 