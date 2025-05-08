// C:\Users\HP\CosmicVault-New\backend\routes\deposit.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

module.exports = (io) => {
  router.post('/', auth, async (req, res) => {
    try {
      const { amount, currency } = req.body;
      console.log('[Deposit] Request body:', req.body);

      if (!amount || !currency) {
        return res.status(400).json({ message: 'Amount and currency are required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      user.balances[currency] = (user.balances[currency] || 0) + amount;
      user.transactions.push({
        type: 'Deposit',
        amount,
        currency,
        date: new Date(),
      });

      await user.save();
      console.log(`[Deposit] Deposited ${amount} ${currency} for user: ${user.email}`);

      io.to(user._id.toString()).emit('balanceUpdate', {
        currency,
        balance: user.balances[currency],
      });

      res.json({ message: `Deposited ${amount} ${currency} successfully` });
    } catch (err) {
      console.error('[Deposit] Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};