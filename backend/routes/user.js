// C:\Users\HP\CosmicVault-New\backend\routes\user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { io } = require('../server');

router.get('/user', authMiddleware, async (req, res) => {
  console.log('GET /api/user - User ID:', req.user.id);
  try {
    const user = await User.findById(req.user.id).select('-password -twoFactorSecret');
    if (!user) {
      console.log('GET /api/user - User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('GET /api/user - User fetched:', user.email);
    res.json(user);
  } catch (err) {
    console.error('GET /api/user - Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/verify-wallet', authMiddleware, async (req, res) => {
  console.log('[VerifyWallet] Route hit: GET /api/verify-wallet');
  console.log('[VerifyWallet] Query:', req.query);
  try {
    const { walletId } = req.query;
    if (!walletId) {
      console.log('[VerifyWallet] Wallet ID not provided');
      return res.status(400).json({ message: 'Wallet ID is required' });
    }
    const recipient = await User.findOne({ walletId }).select('username walletId selfiePath');
    if (!recipient) {
      console.log('[VerifyWallet] Recipient not found:', walletId);
      return res.status(404).json({ message: `Recipient not found: ${walletId}` });
    }
    console.log(`[VerifyWallet] Recipient found: ${recipient.username}`);
    res.json({ username: recipient.username, walletId: recipient.walletId, selfiePath: recipient.selfiePath });
  } catch (err) {
    console.error('[VerifyWallet] Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/deposit', authMiddleware, async (req, res) => {
  console.log('[Deposit] Route hit: POST /api/deposit');
  console.log('[Deposit] Request body:', req.body);
  try {
    const { amount, currency } = req.body;
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !currency) {
      console.log('[Deposit] Invalid input:', { amount, currency });
      return res.status(400).json({ message: 'Amount must be a positive number and currency is required' });
    }
    if (!['USD', 'EUR', 'GBP'].includes(currency)) {
      console.log('[Deposit] Invalid currency:', currency);
      return res.status(400).json({ message: 'Invalid currency. Must be USD, EUR, or GBP' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('[Deposit] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    user.balances = user.balances || new Map();
    user.balances.set(currency, (user.balances.get(currency) || 0) + parsedAmount);
    user.transactions = user.transactions || [];
    user.transactions.push({
      type: 'deposit',
      amount: parsedAmount,
      currency,
      date: new Date(),
    });
    user.markModified('balances');
    user.markModified('transactions');
    await user.save();
    console.log(`[Deposit] Deposit successful for user: ${user.email} Amount: ${parsedAmount} ${currency}`);
    io.to(req.user.id).emit('balanceUpdate', { currency, balance: user.balances.get(currency) });
    res.json({ message: `Deposited ${parsedAmount} ${currency}`, balance: user.balances.get(currency) });
  } catch (err) {
    console.error('[Deposit] Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/withdraw', authMiddleware, async (req, res) => {
  console.log('[Withdraw] Route hit: POST /api/withdraw');
  console.log('[Withdraw] Request body:', req.body);
  try {
    const { amount, currency } = req.body;
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !currency) {
      console.log('[Withdraw] Invalid input:', { amount, currency });
      return res.status(400).json({ message: 'Amount must be a positive number and currency is required' });
    }
    if (!['USD', 'EUR', 'GBP'].includes(currency)) {
      console.log('[Withdraw] Invalid currency:', currency);
      return res.status(400).json({ message: 'Invalid currency. Must be USD, EUR, or GBP' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('[Withdraw] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    user.balances = user.balances || new Map();
    const currentBalance = user.balances.get(currency) || 0;
    if (currentBalance < parsedAmount) {
      console.log(`[Withdraw] Insufficient balance: ${currentBalance} Requested: ${parsedAmount}`);
      return res.status(400).json({ message: `Insufficient balance: ${currentBalance} ${currency}` });
    }
    user.balances.set(currency, currentBalance - parsedAmount);
    user.transactions = user.transactions || [];
    user.transactions.push({
      type: 'withdraw',
      amount: parsedAmount,
      currency,
      date: new Date(),
    });
    user.markModified('balances');
    user.markModified('transactions');
    await user.save();
    console.log(`[Withdraw] Withdraw successful for user: ${user.email} Amount: ${parsedAmount} ${currency}`);
    io.to(req.user.id).emit('balanceUpdate', { currency, balance: user.balances.get(currency) });
    res.json({ message: `Withdrew ${parsedAmount} ${currency}`, balance: user.balances.get(currency) });
  } catch (err) {
    console.error('[Withdraw] Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/send', authMiddleware, async (req, res) => {
  console.log('[Send] Route hit: POST /api/send');
  console.log('[Send] Request body:', req.body);
  try {
    const { amount, currency, recipientWalletId, walletId, transferType = 'cosmicvault', isInternational = false } = req.body;
    const parsedAmount = parseFloat(amount);
    const finalRecipientWalletId = recipientWalletId || walletId;
    if (!parsedAmount || parsedAmount <= 0 || !currency || !finalRecipientWalletId) {
      console.log('[Send] Missing required fields:', { amount, currency, recipientWalletId, walletId });
      return res.status(400).json({ message: 'Amount must be a positive number, currency and recipient wallet ID are required' });
    }
    if (!['USD', 'EUR', 'GBP'].includes(currency)) {
      console.log('[Send] Invalid currency:', currency);
      return res.status(400).json({ message: 'Invalid currency. Must be USD, EUR, or GBP' });
    }
    if (!['cosmicvault', 'mobile_money', 'bank', 'exness', 'binance'].includes(transferType)) {
      console.log('[Send] Invalid transfer type:', transferType);
      return res.status(400).json({ message: 'Invalid transfer type' });
    }
    const sender = await User.findById(req.user.id);
    if (!sender) {
      console.log('[Send] Sender not found:', req.user.id);
      return res.status(404).json({ message: 'Sender not found' });
    }
    sender.balances = sender.balances || new Map();
    const currentBalance = sender.balances.get(currency) || 0;
    if (currentBalance < parsedAmount) {
      console.log(`[Send] Insufficient balance: ${currentBalance} Requested: ${parsedAmount}`);
      return res.status(400).json({ message: `Insufficient balance: ${currentBalance} ${currency}` });
    }
    if (transferType === 'cosmicvault') {
      const recipient = await User.findOne({ walletId: finalRecipientWalletId });
      if (!recipient) {
        console.log('[Send] Recipient not found:', finalRecipientWalletId);
        return res.status(404).json({ message: `Recipient not found: ${finalRecipientWalletId}` });
      }
      sender.balances.set(currency, currentBalance - parsedAmount);
      recipient.balances = recipient.balances || new Map();
      recipient.balances.set(currency, (recipient.balances.get(currency) || 0) + parsedAmount);
      sender.transactions = sender.transactions || [];
      sender.transactions.push({
        type: 'send',
        amount: parsedAmount,
        currency,
        recipientWalletId: finalRecipientWalletId,
        transferType,
        isInternational,
        date: new Date(),
      });
      recipient.transactions = recipient.transactions || [];
      recipient.transactions.push({
        type: 'receive',
        amount: parsedAmount,
        currency,
        senderWalletId: sender.walletId,
        transferType,
        isInternational,
        date: new Date(),
      });
      sender.markModified('balances');
      sender.markModified('transactions');
      recipient.markModified('balances');
      recipient.markModified('transactions');
      await Promise.all([sender.save(), recipient.save()]);
      console.log(`[Send] Transfer successful from: ${sender.email} to: ${recipient.email} Amount: ${parsedAmount} ${currency}`);
      io.to(req.user.id).emit('balanceUpdate', { currency, balance: sender.balances.get(currency) });
      io.to(recipient._id.toString()).emit('balanceUpdate', { currency, balance: recipient.balances.get(currency) });
      res.json({ message: `Sent ${parsedAmount} ${currency} to ${recipient.email}`, balance: sender.balances.get(currency) });
    } else {
      sender.balances.set(currency, currentBalance - parsedAmount);
      sender.transactions = sender.transactions || [];
      sender.transactions.push({
        type: 'send',
        amount: parsedAmount,
        currency,
        recipientWalletId: finalRecipientWalletId,
        transferType,
        isInternational,
        date: new Date(),
      });
      sender.markModified('balances');
      sender.markModified('transactions');
      await sender.save();
      console.log(`[Send] External transfer to ${transferType} successful for user: ${sender.email} Amount: ${parsedAmount} ${currency}`);
      io.to(req.user.id).emit('balanceUpdate', { currency, balance: sender.balances.get(currency) });
      res.json({ message: `Transfer to ${transferType} initiated`, balance: sender.balances.get(currency) });
    }
  } catch (err) {
    console.error('[Send] Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/savings', authMiddleware, async (req, res) => {
  console.log('[Savings] Route hit: POST /api/savings');
  console.log('[Savings] Request body:', req.body);
  try {
    const { name, amount, currency, type } = req.body;
    const parsedAmount = parseFloat(amount);
    if (!name || !parsedAmount || parsedAmount <= 0 || !currency || !type) {
      console.log('[Savings] Invalid input:', { name, amount, currency, type });
      return res.status(400).json({ message: 'Name, amount (positive number), currency, and type are required' });
    }
    if (!['USD', 'EUR', 'GBP'].includes(currency)) {
      console.log('[Savings] Invalid currency:', currency);
      return res.status(400).json({ message: 'Invalid currency. Must be USD, EUR, or GBP' });
    }
    if (!['accessible', 'fixed'].includes(type)) {
      console.log('[Savings] Invalid savings type:', type);
      return res.status(400).json({ message: 'Invalid savings type. Must be accessible or fixed' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('[Savings] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    user.balances = user.balances || new Map();
    const currentBalance = user.balances.get(currency) || 0;
    if (currentBalance < parsedAmount) {
      console.log(`[Savings] Insufficient balance: ${currentBalance} Requested: ${parsedAmount}`);
      return res.status(400).json({ message: `Insufficient balance: ${currentBalance} ${currency}` });
    }
    user.balances.set(currency, currentBalance - parsedAmount);
    user.savings = user.savings || [];
    user.savings.push({
      name,
      amount: parsedAmount,
      currency,
      type,
      date: new Date(),
    });
    user.transactions = user.transactions || [];
    user.transactions.push({
      type: 'savings',
      amount: parsedAmount,
      currency,
      savingsName: name,
      date: new Date(),
    });
    user.markModified('balances');
    user.markModified('savings');
    user.markModified('transactions');
    await user.save();
    console.log(`[Savings] Savings created for user: ${user.email} Name: ${name} Amount: ${parsedAmount} ${currency}`);
    io.to(req.user.id).emit('balanceUpdate', { currency, balance: user.balances.get(currency) });
    res.json({ message: `Savings goal ${name} created with ${parsedAmount} ${currency}`, savings: user.savings });
  } catch (err) {
    console.error('[Savings] Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/investments', authMiddleware, async (req, res) => {
  console.log('[Investments] Route hit: POST /api/investments');
  console.log('[Investments] Request body:', req.body);
  try {
    const { name, amount, currency, type } = req.body;
    const parsedAmount = parseFloat(amount);
    if (!name || !parsedAmount || parsedAmount <= 0 || !currency || !type) {
      console.log('[Investments] Invalid input:', { name, amount, currency, type });
      return res.status(400).json({ message: 'Name, amount (positive number), currency, and type are required' });
    }
    if (!['USD', 'EUR', 'GBP'].includes(currency)) {
      console.log('[Investments] Invalid currency:', currency);
      return res.status(400).json({ message: 'Invalid currency. Must be USD, EUR, or GBP' });
    }
    if (!['basic', 'gold', 'platinum'].includes(type)) {
      console.log('[Investments] Invalid investment type:', type);
      return res.status(400).json({ message: 'Invalid investment type. Must be basic, gold, or platinum' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('[Investments] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    user.balances = user.balances || new Map();
    const currentBalance = user.balances.get(currency) || 0;
    if (currentBalance < parsedAmount) {
      console.log(`[Investments] Insufficient balance: ${currentBalance} Requested: ${parsedAmount}`);
      return res.status(400).json({ message: `Insufficient balance: ${currentBalance} ${currency}` });
    }
    user.balances.set(currency, currentBalance - parsedAmount);
    user.investments = user.investments || [];
    user.investments.push({
      name,
      amount: parsedAmount,
      currency,
      type,
      date: new Date(),
    });
    user.transactions = user.transactions || [];
    user.transactions.push({
      type: 'investment',
      amount: parsedAmount,
      currency,
      investmentName: name,
      date: new Date(),
    });
    user.markModified('balances');
    user.markModified('investments');
    user.markModified('transactions');
    await user.save();
    console.log(`[Investments] Investment created for user: ${user.email} Name: ${name} Amount: ${parsedAmount} ${currency}`);
    io.to(req.user.id).emit('balanceUpdate', { currency, balance: user.balances.get(currency) });
    res.json({ message: `Investment ${name} created with ${parsedAmount} ${currency}`, investments: user.investments });
  } catch (err) {
    console.error('[Investments] Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/redeem', authMiddleware, async (req, res) => {
  console.log('[Redeem] Route hit: POST /api/redeem');
  console.log('[Redeem] Request body:', req.body);
  try {
    const { points } = req.body;
    const parsedPoints = parseFloat(points);
    if (!parsedPoints || parsedPoints <= 0) {
      console.log('[Redeem] Invalid points:', points);
      return res.status(400).json({ message: 'Points must be a positive number' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('[Redeem] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    user.stardustPoints = user.stardustPoints || 0;
    if (user.stardustPoints < parsedPoints) {
      console.log(`[Redeem] Insufficient points: ${user.stardustPoints} Requested: ${parsedPoints}`);
      return res.status(400).json({ message: `Insufficient points: You have ${user.stardustPoints} Stardust Points` });
    }
    user.stardustPoints -= parsedPoints;
    user.transactions = user.transactions || [];
    user.transactions.push({
      type: 'redeem',
      points: parsedPoints,
      date: new Date(),
    });
    user.markModified('transactions');
    await user.save();
    console.log(`[Redeem] Points redeemed for user: ${user.email} Points: ${parsedPoints}`);
    io.to(req.user.id).emit('pointsUpdate', { stardustPoints: user.stardustPoints });
    res.json({ message: `Redeemed ${parsedPoints} Stardust Points`, stardustPoints: user.stardustPoints });
  } catch (err) {
    console.error('[Redeem] Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;