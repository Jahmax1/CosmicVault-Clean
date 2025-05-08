// C:\Users\HP\CosmicVault-New\backend\routes\savings.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

module.exports = (io) => {
  router.post('/', auth, async (req, res) => {
    try {
      const { name, amount, currency, type } = req.body;
      console.log('[Savings] Request body:', req.body);

      if (!name || !amount || !currency || !type) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (!user.balances[currency] || user.balances[currency] < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      user.balances[currency] -= amount;
      const savings = { name, amount, currency, type };
      user.savings.push(savings);
      user.transactions.push({
        type: 'Savings Created',
        amount,
        currency,
        date: new Date(),
      });

      await user.save();
      console.log(`[Savings] Savings created for user: ${user.email} Name: ${name} Amount: ${amount} ${currency}`);

      io.to(user._id.toString()).emit('balanceUpdate', {
        currency,
        balance: user.balances[currency],
      });

      res.json({ message: `Savings goal '${name}' created for ${amount} ${currency}` });
    } catch (err) {
      console.error('[Savings] Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};