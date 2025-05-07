// C:\Users\HP\CosmicVault-New\backend\routes\register.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const speakeasy = require('speakeasy');
const User = require('../models/User');

const uploadDir = path.join(__dirname, '../Uploads');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('[Multer] Saving to:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
}).single('selfie');

// Test register route
router.post('/test-register', upload, (req, res) => {
  console.log('[Test Register] Route hit: POST /api/auth/test-register');
  console.log('[Test Register] req.body:', req.body);
  console.log('[Test Register] req.file:', req.file);
  try {
    if (!req.body.password) {
      console.log('[Test Register] Password missing');
      return res.status(400).json({ message: 'Password is required' });
    }
    bcrypt.hash(req.body.password, 10, (err, hash) => {
      if (err) {
        console.error('[Test Register] Bcrypt error:', err);
        return res.status(500).json({ message: `Bcrypt error: ${err.message}` });
      }
      console.log('[Test Register] Hashed password:', hash);
      res.json({ body: req.body, file: req.file, hash });
    });
  } catch (err) {
    console.error('[Test Register] Error:', err);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// Register route
router.post(
  '/register',
  (req, res, next) => {
    console.log('[Register] Route hit: POST /api/auth/register');
    console.log('[Register] Before Multer - Headers:', req.headers);
    upload(req, res, (err) => {
      if (err) {
        console.error('[Register] Multer error:', err);
        return res.status(400).json({ message: `Multer error: ${err.message}` });
      }
      console.log('[Register] After Multer - req.body:', req.body);
      console.log('[Register] After Multer - req.file:', req.file);
      next();
    });
  },
  async (req, res) => {
    console.log('[Register] Processing request');
    console.log('[Register] Parsed request body:', req.body);
    console.log('[Register] Password value:', req.body.password);

    const { email, username, password, idType, idNumber } = req.body;
    const selfie = req.file;

    if (!email || !username || !password || !idType || !idNumber || !selfie) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }, { idNumber }] });
      if (existingUser) {
        return res.status(400).json({ message: 'Email, username, or ID number already in use' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate unique wallet ID and referral code
      const walletId = `CV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const referralCode = Math.random().toString(36).substr(2, 8).toUpperCase();

      // Create user
      const user = new User({
        email,
        username,
        password: hashedPassword,
        idType,
        idNumber,
        selfiePath: selfie.path,
        walletId,
        referralCode,
      });

      await user.save();

      // Generate JWT
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({ message: 'Registration successful', token });
    } catch (err) {
      console.error('[Register] Error:', err);
      if (err.name === 'MongooseError' || err.name === 'MongoServerError') {
        res.status(500).json({ message: 'Database connection error. Please try again later.' });
      } else {
        res.status(500).json({ message: `Server error: ${err.message}` });
      }
    }
  }
);

// Login route
router.post('/login', async (req, res) => {
  console.log('[Login] Route hit: POST /api/auth/login');
  console.log('[Login] Request body:', req.body);

  const { email, password, twoFactorCode } = req.body;

  if (!email || !password) {
    console.log('[Login] Email or password missing');
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('[Login] User not found:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('[Login] Password mismatch for user:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Verify 2FA if enabled
    if (user.twoFactorEnabled && twoFactorCode) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
      });
      if (!verified) {
        console.log('[Login] Invalid 2FA code for user:', email);
        return res.status(400).json({ message: 'Invalid 2FA code' });
      }
    } else if (user.twoFactorEnabled && !twoFactorCode) {
      console.log('[Login] 2FA code missing for user:', email);
      return res.status(400).json({ message: '2FA code is required' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log('[Login] Login successful for user:', email);
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error('[Login] Error:', err);
    if (err.name === 'MongooseError' || err.name === 'MongoServerError') {
      console.log('[Login] Database connection error:', err.message);
      res.status(500).json({ message: 'Database connection error. Please try again later.' });
    } else {
      res.status(500).json({ message: `Server error: ${err.message}` });
    }
  }
});

module.exports = router;