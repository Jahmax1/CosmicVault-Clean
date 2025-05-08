// C:\Users\HP\CosmicVault-New\backend\routes\register.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('POST /api/auth/login - Request:', { email });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('POST /api/auth/login - Invalid credentials');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('POST /api/auth/login - Invalid credentials');
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

router.post('/register', async (req, res) => {
  const { email, password, username, walletId } = req.body;
  console.log('POST /api/auth/register - Request:', { email, username, walletId });

  if (!email || !password || !username || !walletId) {
    console.log('POST /api/auth/register - Missing fields');
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { walletId }] });
    if (existingUser) {
      console.log('POST /api/auth/register - User already exists');
      return res.status(400).json({ message: 'Email or wallet ID already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      username,
      walletId,
    });

    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('POST /api/auth/register - Success:', { userId: user._id });
    res.status(201).json({ token });
  } catch (err) {
    console.error('POST /api/auth/register - Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;