// C:\Users\HP\CosmicVault\backend\routes\redeem.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

router.post('/redeem', authMiddleware, async (req, res) => {
  const { points } = req.body;
  if (points <= 0) {
    return res.status(400).json({ message: 'Invalid points' });
  }
  try {
    const user = await User.findById(req.user.id);
    if (user.stardustPoints < points) {
      return res.status(400).json({ message: 'Insufficient points' });
    }
    user.stardustPoints -= points;
    await user.save();
    const io = req.app.get('io');
    io.to(user._id.toString()).emit('notification', `Redeemed ${points} Stardust Points`);
    res.json({ message: 'Points redeemed', stardustPoints: user.stardustPoints });
  } catch (err) {
    console.error('Redeem error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;