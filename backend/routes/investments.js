// C:\Users\HP\CosmicVault-New\backend\routes\investments.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

module.exports = (io) => {
  router.post('/', auth, async (req, res) => {
    try {
      const { name, amount, currency, type } = req.body;
      console.log('[Investments] Request body:', req.body);

      if (!name || !amount || !currency || !type) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (!user.balances[currency] || user.balances[currency] < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      user.balances[currency] -= amount;
      const investment = { name, amount, currency, type };
      user.investments.push(investment);
      user.transactions.push({
        type: 'Investment Created',
        amount,
        currency,
        date: new Date(),
      });

      await user.save();
      console.log(`[Investments] Investment created for user: ${user.email} Name: ${name} Amount: ${amount} ${currency}`);

      io.to(user._id.toString()).emit('balanceUpdate', {
        currency,
        balance: user.balances[currency],
      });

      res.json({ message: `Investment '${name}' created for ${amount} ${currency}` });
    } catch (err) {
      console.error('[Investments] Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};