const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'rp_exotics_super_secret_key_2025_change_this_in_production';

// Helper to get token from cookie or header
function getToken(req) {
  return (
    req.cookies?.token ||
    (req.headers['authorization'] && req.headers['authorization'].split(' ')[1])
  );
}

router.post('/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await user.comparePassword(password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const { passwordHash, ...userData } = user.toObject();

  // JWT expiry: 12h if rememberMe, else 1h
  const expiresIn = rememberMe ? '12h' : '1h';
  const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn });

  // Set HTTP-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: rememberMe ? 12 * 60 * 60 * 1000 : 60 * 60 * 1000, // 12h or 1h
    sameSite: 'lax',
  });

  res.json({ user: userData, token });
});

// Get current user from JWT cookie
router.get('/me', async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
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

module.exports = router; 