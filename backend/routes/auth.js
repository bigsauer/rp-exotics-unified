const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'rp_exotics_super_secret_key_2025_change_this_in_production';
const bcrypt = require('bcryptjs'); // Added bcrypt for password comparison
const { authenticateToken } = require('../middleware/auth');

// Helper to get token from cookie or header
function getToken(req) {
  return (
    req.cookies?.token ||
    (req.headers['authorization'] && req.headers['authorization'].split(' ')[1])
  );
}

router.post('/login', async (req, res) => {
  console.log('[DEBUG][AUTH] /login hit with body:', req.body);
  const { email, password, rememberMe } = req.body;
  console.log('[AUTH][LOGIN] Received email:', email);
  try {
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    console.log('[DEBUG][AUTH] User lookup result:', user);
    if (!user) {
      console.log('[AUTH][LOGIN] User not found for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Support both password and passwordHash fields
    const hash = user.password || user.passwordHash;
    console.log('[DEBUG][AUTH] Password hash used for comparison:', hash);
    if (!hash) {
      console.log('[AUTH][LOGIN] No password hash found for user:', email);
      return res.status(401).json({ error: 'No password set for this user' });
    }
    const passwordMatch = await bcrypt.compare(password, hash);
    console.log('[AUTH][LOGIN] Password match:', passwordMatch);
    if (!passwordMatch) {
      console.log('[AUTH][LOGIN] Invalid password for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { passwordHash, password: pw, ...userData } = user.toObject();
    console.log('[DEBUG][AUTH] User data to return:', userData);

    // JWT expiry: 12h if rememberMe, else 1h
    const expiresIn = rememberMe ? '12h' : '1h';
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn });
    console.log('[DEBUG][AUTH] JWT generated:', token);

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: rememberMe ? 12 * 60 * 60 * 1000 : 60 * 60 * 1000, // 12h or 1h
      sameSite: 'lax',
    });
    console.log('[DEBUG][AUTH] Cookie set for user:', email);

    res.json({ user: userData, token });
  } catch (err) {
    console.error('[AUTH][LOGIN] Error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message, stack: err.stack });
  }
});

// Get current user from JWT cookie
router.get('/me', async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { passwordHash, ...userData } = user.toObject();
    res.json({ user: userData });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Alias for /me to support legacy frontend
router.get('/profile', async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { passwordHash, ...userData } = user.toObject();
    res.json({ user: userData });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Logout: clear the cookie
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Logged out' });
});

// Registration route
router.post('/register', async (req, res) => {
  console.log('[DEBUG][AUTH] /register hit with body:', req.body);
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
      email: email.toLowerCase().trim(), 
      passwordHash: hashedPassword 
    });
    await newUser.save();
    console.log('[AUTH][REGISTER] New user registered:', email);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('[AUTH][REGISTER] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// In-memory storage for pending password reset requests
const pendingPasswordResets = new Map();

// Forgot password request
router.post('/forgot-password', async (req, res) => {
  console.log('[DEBUG][AUTH] /forgot-password hit with body:', req.body);
  const { email, newPassword } = req.body;
  
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  try {
    // Check if user exists
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Store the request in memory
    const requestId = Date.now().toString();
    const request = {
      id: requestId,
      userEmail: email,
      newPassword: newPassword,
      userName: `${user.firstName} ${user.lastName}`,
      timestamp: new Date().toISOString()
    };
    pendingPasswordResets.set(requestId, request);

    // Send email to admin
    const emailService = require('../services/emailService');
    await emailService.sendPasswordResetRequest({
      userEmail: email,
      newPassword: newPassword,
      userName: `${user.firstName} ${user.lastName}`,
      adminEmail: 'brennan@rpexotics.com'
    });

    console.log('[AUTH][FORGOT-PASSWORD] Password reset request sent for:', email);
    res.json({ message: 'Password reset request sent successfully' });
  } catch (err) {
    console.error('[AUTH][FORGOT-PASSWORD] Error:', err);
    res.status(500).json({ error: 'Failed to send password reset request' });
  }
});

// Get pending password reset requests (admin only)
router.get('/pending-password-resets', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const requests = Array.from(pendingPasswordResets.values());
  res.json({ requests });
});

// Admin approve password reset (protected route)
router.post('/approve-password-reset', authenticateToken, async (req, res) => {
  const { userEmail, newPassword, approved } = req.body;
  
  // Check if current user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (!userEmail || !newPassword) {
    return res.status(400).json({ error: 'User email and new password are required' });
  }

  try {
    const user = await User.findOne({ email: { $regex: new RegExp(`^${userEmail}$`, 'i') } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (approved) {
      // Hash the new password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update user's password
      user.passwordHash = hashedPassword;
      await user.save();

      // Send confirmation email to user
      const emailService = require('../services/emailService');
      await emailService.sendPasswordResetConfirmation({
        userEmail: userEmail,
        userName: `${user.firstName} ${user.lastName}`
      });

      // Remove from pending requests
      for (const [id, request] of pendingPasswordResets.entries()) {
        if (request.userEmail.toLowerCase() === userEmail.toLowerCase()) {
          pendingPasswordResets.delete(id);
          break;
        }
      }

      console.log('[AUTH][APPROVE-PASSWORD-RESET] Password updated for:', userEmail);
      res.json({ message: 'Password updated successfully' });
    } else {
      // Send rejection email to user
      const emailService = require('../services/emailService');
      await emailService.sendPasswordResetRejection({
        userEmail: userEmail,
        userName: `${user.firstName} ${user.lastName}`
      });

      // Remove from pending requests
      for (const [id, request] of pendingPasswordResets.entries()) {
        if (request.userEmail.toLowerCase() === userEmail.toLowerCase()) {
          pendingPasswordResets.delete(id);
          break;
        }
      }

      console.log('[AUTH][APPROVE-PASSWORD-RESET] Password reset rejected for:', userEmail);
      res.json({ message: 'Password reset request rejected' });
    }
  } catch (err) {
    console.error('[AUTH][APPROVE-PASSWORD-RESET] Error:', err);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

module.exports = router; 