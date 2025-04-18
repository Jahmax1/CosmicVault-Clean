// C:\Users\HP\CosmicVault\backend\routes\send.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

router.post('/send', authMiddleware, async (req, res) => {
  const { amount, currency, recipientWalletId } = req.body;
  if (!['USD', 'EUR', 'GBP'].includes(currency) || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount or currency' });
  }
  try {
    const sender = await User.findById(req.user.id);
    if (sender.balances[currency] < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    const recipient = await User.findOne({ walletId: recipientWalletId });
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    sender.balances[currency] -= amount;
    sender.transactions.push({ type: 'send', amount, currency });
    recipient.balances[currency] += amount;
    recipient.transactions.push({ type: 'receive', amount, currency });
    await sender.save();
    await recipient.save();
    const io = req.app.get('io');
    io.to(sender._id.toString()).emit('notification', `Sent ${amount} ${currency} to ${recipientWalletId}`);
    io.to(recipient._id.toString()).emit('notification', `Received ${amount} ${currency} from ${sender.walletId}`);
    res.json({ message: 'Transfer successful', balance: sender.balances[currency] });
  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;