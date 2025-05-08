// C:\Users\HP\CosmicVault-New\backend\routes\send.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

module.exports = (io) => {
  router.post('/', auth, async (req, res) => {
    try {
      const { amount, currency, recipientWalletId, transferType, isInternational } = req.body;
      console.log('[Send] Request body:', req.body);

      if (!amount || !currency || !recipientWalletId) {
        return res.status(400).json({ message: 'Amount, currency, and recipient are required' });
      }

      const sender = await User.findById(req.user.id);
      if (!sender) return res.status(404).json({ message: 'Sender not found' });

      if (!sender.balances[currency] || sender.balances[currency] < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      const recipient = await User.findOne({ walletId: recipientWalletId });
      if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

      sender.balances[currency] -= amount;
      recipient.balances[currency] = (recipient.balances[currency] || 0) + amount;

      sender.transactions.push({
        type: `Transfer Sent (${transferType}${isInternational ? ' - International' : ''})`,
        amount,
        currency,
        recipient: recipientWalletId,
        date: new Date(),
      });

      recipient.transactions.push({
        type: `Transfer Received (${transferType}${isInternational ? ' - International' : ''})`,
        amount,
        currency,
        sender: sender.walletId,
        date: new Date(),
      });

      await sender.save();
      await recipient.save();
      console.log(`[Send] Transferred ${amount} ${currency} from ${sender.email} to ${recipient.email}`);

      io.to(sender._id.toString()).emit('balanceUpdate', {
        currency,
        balance: sender.balances[currency],
      });
      io.to(recipient._id.toString()).emit('balanceUpdate', {
        currency,
        balance: recipient.balances[currency],
      });

      res.json({ message: `Transferred ${amount} ${currency} to ${recipientWalletId}` });
    } catch (err) {
      console.error('[Send] Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};