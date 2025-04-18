// C:\Users\HP\CosmicVault\backend\routes\withdraw.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

router.post('/withdraw', authMiddleware, async (req, res) => {
  const { amount, currency } = req.body;
  if (!['USD', 'EUR', 'GBP'].includes(currency) || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount or currency' });
  }
  try {
    const user = await User.findById(req.user.id);
    if (user.balances[currency] < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    user.balances[currency] -= amount;
    user.transactions.push({ type: 'withdraw', amount, currency });
    await user.save();
    const io = req.app.get('io');
    io.to(user._id.toString()).emit('notification', `Withdrew ${amount} ${currency}`);
    res.json({ message: 'Withdrawal successful', balance: user.balances[currency] });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;