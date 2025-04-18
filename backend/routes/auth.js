// C:\Users\HP\CosmicVault\backend\routes\auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    user = new User({
      email,
      username,
      password: await bcrypt.hash(password, 10),
      walletId: `WALLET-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      referralCode: `REF-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, twoFactorCode } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (user.twoFactorEnabled && twoFactorCode) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
      });
      if (!verified) {
        return res.status(400).json({ message: 'Invalid 2FA code' });
      }
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/setup-2fa', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA already enabled' });
    }
    const secret = speakeasy.generateSecret({
      name: `CosmicVault:${user.email}`,
    });
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();
    res.json({ secret: secret.base32, qrCodeUrl: secret.otpauth_url });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;