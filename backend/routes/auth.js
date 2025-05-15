const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '..', 'Uploads', 'selfies');
if (!fs.existsSync(uploadDir)) {
  console.log('[Auth] Creating upload directory:', uploadDir);
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    console.log('[Auth] Uploading selfie:', uniqueName);
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

router.post('/register', upload.single('selfie'), async (req, res) => {
  console.log('[Auth] POST /api/auth/register', {
    body: { ...req.body, password: '<redacted>' },
    file: req.file,
  });

  try {
    const { email, username, password } = req.body;

    // Validate required fields
    if (!email || !username || !password) {
      return res.status(400).json({ message: 'Email, username, and password are required' });
    }

    // Validate email format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      email,
      username,
      password: hashedPassword,
      walletId: `WALLET-${Date.now()}`,
      selfiePath: req.file ? req.file.path : null,
      balances: { USD: 0, EUR: 0, GBP: 0 },
      stardustPoints: 0,
      savings: [],
      investments: [],
      transactions: [],
    });

    await user.save();
    console.log('[Auth] User registered:', { email, username, selfiePath: user.selfiePath });

    // Generate JWT token
    const tokenPayload = { id: user._id, email: user.email };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'default_jwt_secret', { expiresIn: '1h' });
    res.status(201).json({ token });
  } catch (err) {
    console.error('[Auth] Register error:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error during registration. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  console.log('[Auth] POST /api/auth/login', {
    body: { ...req.body, password: '<redacted>' },
  });

  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();
    console.log('[Auth] Updated lastLogin for user:', { email, lastLogin: user.lastLogin });

    // Generate JWT token
    const tokenPayload = { id: user._id, email: user.email };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'default_jwt_secret', { expiresIn: '1h' });
    console.log('[Auth] User logged in:', { email });
    res.json({ token });
  } catch (err) {
    console.error('[Auth] Login error:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error during login. Please try again.' });
  }
});

module.exports = router;