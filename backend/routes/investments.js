// C:\Users\HP\CosmicVault\backend\routes\investments.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

router.post('/investments', authMiddleware, async (req, res) => {
  const { name, amount, currency, type } = req.body;
  if (!['USD', 'EUR', 'GBP'].includes(currency) || amount <= 0 || !['basic', 'gold', 'platinum'].includes(type)) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const user = await User.findById(req.user.id);
    if (user.balances[currency] < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    user.balances[currency] -= amount;
    user.investments.push({ name, amount, currency, type });
    user.stardustPoints += Math.floor(amount / 15);
    await user.save();
    const io = req.app.get('io');
    io.to(user._id.toString()).emit('notification', `Started investment ${name} for ${amount} ${currency}`);
    res.json({ message: 'Investment created', investments: user.investments });
  } catch (err) {
    console.error('Investments error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;