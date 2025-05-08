// C:\Users\HP\CosmicVault-New\backend\routes\auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('POST /api/auth/login - Request:', { email });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('POST /api/auth/login - Success:', { userId: user._id });
    res.json({ token });
  } catch (err) {
    console.error('POST /api/auth/login - Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  const { token } = req.body;
  console.log('POST /api/auth/refresh - Request');

  if (!token) {
    return res.status(400).json({ message: 'Token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('POST /api/auth/refresh - Success:', { userId: user._id });
    res.json({ token: newToken });
  } catch (err) {
    console.error('POST /api/auth/refresh - Error:', err.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;