const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

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
      console.log('[USER AUTH] Looking for user with ID:', decoded.userId);
      
      const user = await User.findById(decoded.userId).select('-passwordHash -password -passwordResetToken');
      
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
    
    const users = await User.find({})
      .select('-passwordHash -password -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 });

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
    const user = await User.findById(req.params.id)
      .select('-passwordHash -password -passwordResetToken -passwordResetExpires');

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
      password,
      role = 'sales', 
      phone = '', 
      isActive = true,
      permissions 
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'First name, last name, email, and password are required' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Password validation
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username?.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Use provided password or generate default password
    const userPassword = password || (phone ? `${firstName.toLowerCase()}${phone.slice(-4)}` : `${firstName.toLowerCase()}1234`);
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(userPassword, saltRounds);

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

    const user = new User({
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
      mustChangePassword: !password, // Only require password change if no custom password was provided
      lastLogin: null,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      createdBy: req.user._id,
      passwordResetToken: null,
      passwordResetExpires: null
    });

    const savedUser = await user.save();
    
    // Remove password hash from response
    const userResponse = savedUser.toObject();
    delete userResponse.passwordHash;
    
    console.log(`[USER MANAGEMENT] Admin ${req.user.email} created user: ${email}`);
    
    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
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
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
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

    const result = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (!result) {
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

    const result = await User.findByIdAndDelete(req.params.id);

    if (!result) {
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
    
    console.log('[PASSWORD RESET] Received request body:', req.body);
    console.log('[PASSWORD RESET] newPassword value:', newPassword);
    console.log('[PASSWORD RESET] newPassword type:', typeof newPassword);
    console.log('[PASSWORD RESET] newPassword length:', newPassword ? newPassword.length : 'undefined');

    if (!newPassword || newPassword.length < 6) {
      console.log('[PASSWORD RESET] Validation failed - password too short or missing');
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const result = await User.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          passwordHash,
          mustChangePassword: false
        },
        $unset: { password: 1 } // Remove old password field if it exists
      },
      { new: true }
    );

    if (!result) {
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
    const stats = await User.aggregate([
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
    ]);

    const recentUsers = await User.find({})
      .select('firstName lastName email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const lastLoginStats = await User.find({ lastLogin: { $exists: true } })
      .select('firstName lastName email lastLogin')
      .sort({ lastLogin: -1 })
      .limit(5);

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