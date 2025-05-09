const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './Uploads/selfies',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
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
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      email,
      username,
      password: hashedPassword,
      walletId: `WALLET-${Date.now()}`,
      selfiePath: req.file ? req.file.path : undefined,
      balances: { USD: 0, EUR: 0, GBP: 0 },
      stardustPoints: 0,
      savings: [],
      investments: [],
      transactions: [],
    });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token });
  } catch (err) {
    console.error('[Auth] Register error:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  console.log('[Auth] POST /api/auth/login', {
    body: { ...req.body, password: '<redacted>' },
  });
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('[Auth] Login error:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;