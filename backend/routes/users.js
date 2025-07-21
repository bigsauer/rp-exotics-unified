const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId, MongoClient } = require('mongodb');
const router = express.Router();

// Get database connection
let db;
const client = new MongoClient(process.env.MONGODB_URI);

async function getDb() {
  if (!db) {
    await client.connect();
    db = client.db('test');
  }
  return db;
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  console.log('[AUTH] Request headers:', req.headers);
  console.log('[AUTH] Request cookies:', req.cookies);
  
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  console.log('[AUTH] Token found:', !!token);
  if (token) {
    console.log('[AUTH] Token preview:', token.substring(0, 20) + '...');
  }

  if (!token) {
    console.log('[AUTH] No token found, returning 401');
    return res.status(401).json({ error: 'Access token required' });
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'rp_exotics_super_secret_key_2025_change_this_in_production';
  
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.log('[AUTH] JWT verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    console.log('[AUTH] JWT decoded successfully:', decoded);
    
    try {
      const database = await getDb();
      console.log('[USER AUTH] Looking for user with ID:', decoded.userId);
      console.log('[USER AUTH] User ID type:', typeof decoded.userId);
      
      const user = await database.collection('users').findOne(
        { _id: new ObjectId(decoded.userId.toString()) },
        { projection: { passwordHash: 0, password: 0, passwordResetToken: 0 } }
      );
      
      console.log('[USER AUTH] Found user:', user ? 'Yes' : 'No');
      if (user) {
        console.log('[USER AUTH] User details:', {
          id: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        });
      }
      
      if (!user || !user.isActive) {
        console.log('[USER AUTH] User not found or inactive, returning 403');
        return res.status(403).json({ error: 'User not found or inactive' });
      }
      
      console.log('[USER AUTH] Authentication successful for user:', user.email);
      req.user = user;
      next();
    } catch (error) {
      console.error('[USER AUTH] Authentication error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  });
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Apply authentication to all routes
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    console.log('[USERS API] Admin user requesting users list:', req.user.email);
    console.log('[USERS API] Admin user ID:', req.user._id);
    
    const database = await getDb();
    console.log('[USERS API] Database connected, querying users collection');
    
    const users = await database.collection('users')
      .find({}, { 
        projection: { 
          passwordHash: 0, 
          password: 0, 
          passwordResetToken: 0,
          passwordResetExpires: 0
        } 
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log('[USERS API] Found users:', users.length);
    console.log('[USERS API] Users:', users.map(u => ({ id: u._id, email: u.email, role: u.role, isActive: u.isActive })));
    
    res.json(users);
  } catch (error) {
    console.error('[USERS API] Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user (admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const database = await getDb();
    const user = await database.collection('users')
      .findOne(
        { _id: new ObjectId(req.params.id) },
        { 
          projection: { 
            passwordHash: 0, 
            password: 0, 
            passwordResetToken: 0,
            passwordResetExpires: 0
          } 
        }
      );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      username, 
      role = 'sales', 
      phone = '', 
      isActive = true,
      permissions 
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Check if user already exists
    const database = await getDb();
    const existingUser = await database.collection('users').findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username?.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Generate default password (first name + last 4 digits of phone or '1234')
    const defaultPassword = phone ? `${firstName.toLowerCase()}${phone.slice(-4)}` : `${firstName.toLowerCase()}1234`;
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // Set default permissions based on role
    const defaultPermissions = {
      admin: { 
        deals: { create: true, read: true, update: true, delete: true, viewFinancials: true },
        dealers: { create: true, read: true, update: true, delete: true },
        backoffice: { access: true },
        reports: { access: true, viewFinancials: true },
        users: { manage: true },
        system: { configure: true }
      },
      sales: { 
        deals: { create: true, read: true, update: true, delete: false, viewFinancials: false },
        dealers: { create: true, read: true, update: true, delete: false },
        backoffice: { access: false },
        reports: { access: true, viewFinancials: false },
        users: { manage: false },
        system: { configure: false }
      },
      finance: { 
        deals: { create: false, read: true, update: true, delete: false, viewFinancials: true },
        dealers: { create: false, read: true, update: false, delete: false },
        backoffice: { access: true },
        reports: { access: true, viewFinancials: true },
        users: { manage: false },
        system: { configure: false }
      }
    };

    const user = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      username: username?.toLowerCase() || email.split('@')[0].toLowerCase(),
      passwordHash,
      role,
      permissions: permissions || defaultPermissions[role] || defaultPermissions.sales,
      profile: {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        department: role === 'finance' ? 'Finance' : 'Sales',
        phone: phone || '',
        avatar: null
      },
      isActive,
      emailVerified: false,
      mustChangePassword: true,
      lastLogin: null,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user._id,
      passwordResetToken: null,
      passwordResetExpires: null
    };

    const result = await database.collection('users').insertOne(user);
    
    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    console.log(`[USER MANAGEMENT] Admin ${req.user.email} created user: ${email}`);
    
    res.status(201).json({
      message: 'User created successfully',
      user: { ...userWithoutPassword, _id: result.insertedId },
      defaultPassword: defaultPassword // Only return this for admin reference
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      role, 
      phone, 
      isActive, 
      permissions,
      profile 
    } = req.body;

    const updateData = { updatedAt: new Date() };

    // Only update fields that are provided
    if (firstName !== undefined) {
      updateData.firstName = firstName;
      if (profile) updateData.profile = { ...profile, firstName, lastName: profile.lastName || lastName };
    }
    if (lastName !== undefined) {
      updateData.lastName = lastName;
      if (profile) updateData.profile = { ...profile, lastName, firstName: profile.firstName || firstName };
    }
    if (email !== undefined) {
      // Check if email is already taken by another user
      const database = await getDb();
      const existingUser = await database.collection('users').findOne({
        email: email.toLowerCase(),
        _id: { $ne: new ObjectId(req.params.id) }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already taken by another user' });
      }
      
      updateData.email = email.toLowerCase();
    }
    if (role !== undefined) {
      updateData.role = role;
      
      // Update permissions based on role if not explicitly provided
      if (!permissions) {
        const defaultPermissions = {
          admin: { 
            deals: { create: true, read: true, update: true, delete: true, viewFinancials: true },
            dealers: { create: true, read: true, update: true, delete: true },
            backoffice: { access: true },
            reports: { access: true, viewFinancials: true },
            users: { manage: true },
            system: { configure: true }
          },
          sales: { 
            deals: { create: true, read: true, update: true, delete: false, viewFinancials: false },
            dealers: { create: true, read: true, update: true, delete: false },
            backoffice: { access: false },
            reports: { access: true, viewFinancials: false },
            users: { manage: false },
            system: { configure: false }
          },
          finance: { 
            deals: { create: false, read: true, update: true, delete: false, viewFinancials: true },
            dealers: { create: false, read: true, update: false, delete: false },
            backoffice: { access: true },
            reports: { access: true, viewFinancials: true },
            users: { manage: false },
            system: { configure: false }
          }
        };
        updateData.permissions = defaultPermissions[role] || defaultPermissions.sales;
      }
    }
    if (phone !== undefined) {
      updateData.phone = phone;
      if (profile) updateData.profile = { ...profile, phone };
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    if (permissions !== undefined) {
      updateData.permissions = permissions;
    }
    if (profile !== undefined) {
      updateData.profile = profile;
    }

    const result = await database.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[USER MANAGEMENT] Admin ${req.user.email} updated user: ${req.params.id}`);

    res.json({ 
      message: 'User updated successfully',
      updatedFields: Object.keys(updateData).filter(key => key !== 'updatedAt')
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const database = await getDb();
    const result = await database.collection('users').deleteOne({
      _id: new ObjectId(req.params.id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[USER MANAGEMENT] Admin ${req.user.email} deleted user: ${req.params.id}`);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Reset user password (admin only)
router.post('/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const database = await getDb();
    const result = await database.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: { 
          passwordHash,
          mustChangePassword: false,
          updatedAt: new Date()
        },
        $unset: { password: 1 } // Remove old password field if it exists
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[USER MANAGEMENT] Admin ${req.user.email} reset password for user: ${req.params.id}`);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', requireAdmin, async (req, res) => {
  try {
    const database = await getDb();
    const stats = await database.collection('users').aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactiveUsers: { $sum: { $cond: ['$isActive', 0, 1] } },
          adminUsers: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
          salesUsers: { $sum: { $cond: [{ $eq: ['$role', 'sales'] }, 1, 0] } },
          financeUsers: { $sum: { $cond: [{ $eq: ['$role', 'finance'] }, 1, 0] } }
        }
      }
    ]).toArray();

    const recentUsers = await database.collection('users')
      .find({}, { 
        projection: { 
          firstName: 1, 
          lastName: 1, 
          email: 1, 
          role: 1, 
          createdAt: 1,
          passwordHash: 0 
        } 
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const lastLoginStats = await database.collection('users')
      .find({ lastLogin: { $exists: true } }, { 
        projection: { 
          firstName: 1, 
          lastName: 1, 
          email: 1, 
          lastLogin: 1,
          passwordHash: 0 
        } 
      })
      .sort({ lastLogin: -1 })
      .limit(5)
      .toArray();

    res.json({
      overview: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        adminUsers: 0,
        salesUsers: 0,
        financeUsers: 0
      },
      recentUsers,
      lastLoginStats
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

module.exports = router; 