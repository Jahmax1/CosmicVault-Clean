// C:\Users\HP\CosmicVault-New\backend\routes\redeem.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

module.exports = (io) => {
  router.post('/', auth, async (req, res) => {
    try {
      const { points } = req.body;
      console.log('[Redeem] Request body:', req.body);

      if (!points || points <= 0) {
        return res.status(400).json({ message: 'Points must be a positive number' });
      }

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (user.stardustPoints < points) {
        return res.status(400).json({ message: 'Insufficient points' });
      }

      user.stardustPoints -= points;
      user.balances.USD = (user.balances.USD || 0) + points * 0.01; // 1 point = $0.01
      user.transactions.push({
        type: 'Points Redeemed',
        points,
        amount: points * 0.01,
        currency: 'USD',
        date: new Date(),
      });

      await user.save();
      console.log(`[Redeem] Redeemed ${points} points for user: ${user.email}`);

      io.to(user._id.toString()).emit('pointsUpdate', {
        stardustPoints: user.stardustPoints,
      });
      io.to(user._id.toString()).emit('balanceUpdate', {
        currency: 'USD',
        balance: user.balances.USD,
      });

      res.json({ message: `Redeemed ${points} points for ${(points * 0.01).toFixed(2)} USD` });
    } catch (err) {
      console.error('[Redeem] Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};