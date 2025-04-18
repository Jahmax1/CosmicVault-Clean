// C:\Users\HP\CosmicVault\backend\routes\deposit.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

router.post('/deposit', authMiddleware, async (req, res) => {
  const { amount, currency } = req.body;
  if (!['USD', 'EUR', 'GBP'].includes(currency) || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount or currency' });
  }
  try {
    const user = await User.findById(req.user.id);
    user.balances[currency] += amount;
    user.transactions.push({ type: 'deposit', amount, currency });
    user.stardustPoints += Math.floor(amount / 10);
    await user.save();
    const io = req.app.get('io');
    io.to(user._id.toString()).emit('notification', `Deposited ${amount} ${currency}`);
    res.json({ message: 'Deposit successful', balance: user.balances[currency] });
  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;