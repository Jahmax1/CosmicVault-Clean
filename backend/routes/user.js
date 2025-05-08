// C:\Users\HP\CosmicVault-New\backend\routes\user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

module.exports = (io) => {
  router.get('/user', authMiddleware, async (req, res) => {
    try {
      console.log('GET /api/user - User ID:', req.userId);
      const user = await User.findById(req.userId).select('-password');
      if (!user) {
        console.log('GET /api/user - User not found:', req.userId);
        return res.status(404).json({ message: 'User not found' });
      }
      console.log('GET /api/user - User fetched:', user.email);
      res.json(user);
    } catch (err) {
      console.error('GET /api/user - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/deposit', authMiddleware, async (req, res) => {
    const { amount, currency } = req.body;
    console.log('POST /api/deposit - Request:', { amount, currency, userId: req.userId });

    if (!amount || amount <= 0 || !['USD', 'EUR', 'GBP'].includes(currency)) {
      console.log('POST /api/deposit - Invalid input');
      return res.status(400).json({ message: 'Invalid amount or currency' });
    }

    try {
      const user = await User.findById(req.userId);
      if (!user) {
        console.log('POST /api/deposit - User not found:', req.userId);
        return res.status(404).json({ message: 'User not found' });
      }

      user.balances[currency] = (user.balances[currency] || 0) + amount;
      user.transactions.push({
        type: 'deposit',
        amount,
        currency,
        date: new Date(),
      });

      await user.save();
      io.to(req.userId).emit('balanceUpdate', { currency, balance: user.balances[currency] });
      console.log('POST /api/deposit - Success:', { balance: user.balances[currency] });
      res.json({ message: `Deposited ${amount} ${currency}` });
    } catch (err) {
      console.error('POST /api/deposit - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/withdraw', authMiddleware, async (req, res) => {
    const { amount, currency } = req.body;
    console.log('POST /api/withdraw - Request:', { amount, currency, userId: req.userId });

    if (!amount || amount <= 0 || !['USD', 'EUR', 'GBP'].includes(currency)) {
      console.log('POST /api/withdraw - Invalid input');
      return res.status(400).json({ message: 'Invalid amount or currency' });
    }

    try {
      const user = await User.findById(req.userId);
      if (!user) {
        console.log('POST /api/withdraw - User not found:', req.userId);
        return res.status(404).json({ message: 'User not found' });
      }

      if ((user.balances[currency] || 0) < amount) {
        console.log('POST /api/withdraw - Insufficient funds');
        return res.status(400).json({ message: 'Insufficient funds' });
      }

      user.balances[currency] -= amount;
      user.transactions.push({
        type: 'withdraw',
        amount,
        currency,
        date: new Date(),
      });

      await user.save();
      io.to(req.userId).emit('balanceUpdate', { currency, balance: user.balances[currency] });
      console.log('POST /api/withdraw - Success:', { balance: user.balances[currency] });
      res.json({ message: `Withdrew ${amount} ${currency}` });
    } catch (err) {
      console.error('POST /api/withdraw - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/savings', authMiddleware, async (req, res) => {
    const { name, amount, currency, type } = req.body;
    console.log('POST /api/savings - Request:', { name, amount, currency, type, userId: req.userId });

    if (!name || !amount || amount <= 0 || !['USD', 'EUR', 'GBP'].includes(currency) || !['accessible', 'fixed'].includes(type)) {
      console.log('POST /api/savings - Invalid input');
      return res.status(400).json({ message: 'Invalid savings details' });
    }

    try {
      const user = await User.findById(req.userId);
      if (!user) {
        console.log('POST /api/savings - User not found:', req.userId);
        return res.status(404).json({ message: 'User not found' });
      }

      if ((user.balances[currency] || 0) < amount) {
        console.log('POST /api/savings - Insufficient funds');
        return res.status(400).json({ message: 'Insufficient funds' });
      }

      user.balances[currency] -= amount;
      user.savings.push({ name, amount, currency, type, date: new Date() });
      user.transactions.push({
        type: 'savings',
        amount,
        currency,
        date: new Date(),
      });

      await user.save();
      io.to(req.userId).emit('balanceUpdate', { currency, balance: user.balances[currency] });
      console.log('POST /api/savings - Success');
      res.json({ message: `Created savings goal ${name}` });
    } catch (err) {
      console.error('POST /api/savings - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/investments', authMiddleware, async (req, res) => {
    const { name, amount, currency, type } = req.body;
    console.log('POST /api/investments - Request:', { name, amount, currency, type, userId: req.userId });

    if (!name || !amount || amount <= 0 || !['USD', 'EUR', 'GBP'].includes(currency) || !['basic', 'gold', 'platinum'].includes(type)) {
      console.log('POST /api/investments - Invalid input');
      return res.status(400).json({ message: 'Invalid investment details' });
    }

    try {
      const user = await User.findById(req.userId);
      if (!user) {
        console.log('POST /api/investments - User not found:', req.userId);
        return res.status(404).json({ message: 'User not found' });
      }

      if ((user.balances[currency] || 0) < amount) {
        console.log('POST /api/investments - Insufficient funds');
        return res.status(400).json({ message: 'Insufficient funds' });
      }

      user.balances[currency] -= amount;
      user.investments.push({ name, amount, currency, type, date: new Date() });
      user.transactions.push({
        type: 'investment',
        amount,
        currency,
        date: new Date(),
      });

      await user.save();
      io.to(req.userId).emit('balanceUpdate', { currency, balance: user.balances[currency] });
      console.log('POST /api/investments - Success');
      res.json({ message: `Started investment ${name}` });
    } catch (err) {
      console.error('POST /api/investments - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/redeem', authMiddleware, async (req, res) => {
    const { points } = req.body;
    console.log('POST /api/redeem - Request:', { points, userId: req.userId });

    if (!points || points <= 0) {
      console.log('POST /api/redeem - Invalid points');
      return res.status(400).json({ message: 'Invalid points' });
    }

    try {
      const user = await User.findById(req.userId);
      if (!user) {
        console.log('POST /api/redeem - User not found:', req.userId);
        return res.status(404).json({ message: 'User not found' });
      }

      if ((user.stardustPoints || 0) < points) {
        console.log('POST /api/redeem - Insufficient points');
        return res.status(400).json({ message: 'Insufficient points' });
      }

      user.stardustPoints -= points;
      user.transactions.push({
        type: 'redeem',
        points,
        date: new Date(),
      });

      await user.save();
      io.to(req.userId).emit('pointsUpdate', { stardustPoints: user.stardustPoints });
      console.log('POST /api/redeem - Success:', { points });
      res.json({ message: `Redeemed ${points} Stardust Points` });
    } catch (err) {
      console.error('POST /api/redeem - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.get('/verify-wallet', authMiddleware, async (req, res) => {
    const { walletId } = req.query;
    console.log('GET /api/verify-wallet - Request:', { walletId, userId: req.userId });

    if (!walletId) {
      console.log('GET /api/verify-wallet - Missing walletId');
      return res.status(400).json({ message: 'Wallet ID required' });
    }

    try {
      const recipient = await User.findOne({ walletId }).select('username selfiePath');
      if (!recipient) {
        console.log('GET /api/verify-wallet - Recipient not found:', walletId);
        return res.status(404).json({ message: 'Recipient not found' });
      }

      console.log('GET /api/verify-wallet - Success:', { username: recipient.username });
      res.json({ username: recipient.username, selfiePath: recipient.selfiePath });
    } catch (err) {
      console.error('GET /api/verify-wallet - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/send', authMiddleware, async (req, res) => {
    const { amount, currency, recipientWalletId, transferType, isInternational } = req.body;
    console.log('POST /api/send - Request:', { amount, currency, recipientWalletId, transferType, isInternational, userId: req.userId });

    if (!amount || amount <= 0 || !['USD', 'EUR', 'GBP'].includes(currency) || !recipientWalletId || !['cosmicvault', 'mobile_money', 'bank', 'exness', 'binance'].includes(transferType)) {
      console.log('POST /api/send - Invalid input');
      return res.status(400).json({ message: 'Invalid transfer details' });
    }

    try {
      const sender = await User.findById(req.userId);
      if (!sender) {
        console.log('POST /api/send - Sender not found:', req.userId);
        return res.status(404).json({ message: 'Sender not found' });
      }

      if ((sender.balances[currency] || 0) < amount) {
        console.log('POST /api/send - Insufficient funds');
        return res.status(400).json({ message: 'Insufficient funds' });
      }

      const recipient = await User.findOne({ walletId: recipientWalletId });
      if (!recipient && transferType === 'cosmicvault') {
        console.log('POST /api/send - Recipient not found:', recipientWalletId);
        return res.status(404).json({ message: 'Recipient not found' });
      }

      sender.balances[currency] -= amount;
      sender.transactions.push({
        type: 'send',
        amount,
        currency,
        recipientWalletId,
        transferType,
        isInternational,
        date: new Date(),
      });

      if (recipient && transferType === 'cosmicvault') {
        recipient.balances[currency] = (recipient.balances[currency] || 0) + amount;
        recipient.transactions.push({
          type: 'receive',
          amount,
          currency,
          senderId: req.userId,
          date: new Date(),
        });
        await recipient.save();
        io.to(recipient._id.toString()).emit('balanceUpdate', { currency, balance: recipient.balances[currency] });
      }

      await sender.save();
      io.to(req.userId).emit('balanceUpdate', { currency, balance: sender.balances[currency] });
      console.log('POST /api/send - Success');
      res.json({ message: `Sent ${amount} ${currency} to ${recipientWalletId}` });
    } catch (err) {
      console.error('POST /api/send - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};