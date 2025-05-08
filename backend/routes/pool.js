// C:\Users\HP\CosmicVault-New\backend\routes\pool.js
const express = require('express');
const router = express.Router();
const Pool = require('../models/Pool');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

module.exports = (io) => {
  router.get('/list', authMiddleware, async (req, res) => {
    console.log('GET /api/pools/list - User ID:', req.userId);
    try {
      const pools = await Pool.find({ status: { $ne: 'deleted' } })
        .populate('creator', 'username')
        .lean();
      console.log('GET /api/pools/list - Pools fetched:', pools.length);
      res.json(pools);
    } catch (err) {
      console.error('GET /api/pools/list - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/create', authMiddleware, async (req, res) => {
    const { name, description, goalAmount, currency, deadline } = req.body;
    console.log('POST /api/pools/create - Request:', { name, goalAmount, currency, userId: req.userId });

    if (!name || !goalAmount || goalAmount <= 0 || !['USD', 'EUR', 'GBP'].includes(currency) || !deadline) {
      console.log('POST /api/pools/create - Invalid input');
      return res.status(400).json({ message: 'Invalid pool details' });
    }

    try {
      const pool = new Pool({
        name,
        description,
        goalAmount,
        currency,
        deadline,
        creator: req.userId,
      });

      await pool.save();
      io.to(req.userId).emit('poolUpdate', {
        poolId: pool._id,
        currentAmount: pool.currentAmount,
        status: pool.status,
      });
      console.log('POST /api/pools/create - Success:', { poolId: pool._id });
      res.json({ message: 'Pool created successfully', pool });
    } catch (err) {
      console.error('POST /api/pools/create - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/contribute', authMiddleware, async (req, res) => {
    const { poolId, amount, currency } = req.body;
    console.log('POST /api/pools/contribute - Request:', { poolId, amount, currency, userId: req.userId });

    if (!poolId || !amount || amount < 1 || !['USD', 'EUR', 'GBP'].includes(currency)) {
      console.log('POST /api/pools/contribute - Invalid input');
      return res.status(400).json({ message: 'Invalid contribution details' });
    }

    try {
      const pool = await Pool.findById(poolId);
      if (!pool) {
        console.log('POST /api/pools/contribute - Pool not found:', poolId);
        return res.status(404).json({ message: 'Pool not found' });
      }

      if (pool.status !== 'active') {
        console.log('POST /api/pools/contribute - Pool not active:', pool.status);
        return res.status(400).json({ message: 'Pool is not active' });
      }

      if (pool.currency !== currency) {
        console.log('POST /api/pools/contribute - Currency mismatch:', { poolCurrency: pool.currency, inputCurrency: currency });
        return res.status(400).json({ message: 'Currency does not match pool' });
      }

      const user = await User.findById(req.userId);
      if (!user) {
        console.log('POST /api/pools/contribute - User not found:', req.userId);
        return res.status(404).json({ message: 'User not found' });
      }

      if ((user.balances[currency] || 0) < amount) {
        console.log('POST /api/pools/contribute - Insufficient funds');
        return res.status(400).json({ message: 'Insufficient funds' });
      }

      user.balances[currency] -= amount;
      user.transactions.push({
        type: 'pool_contribution',
        amount,
        currency,
        poolId,
        date: new Date(),
      });

      pool.currentAmount += amount;
      pool.contributors.push({ user: req.userId, amount });
      if (pool.currentAmount >= pool.goalAmount) {
        pool.status = 'completed';
      }

      await user.save();
      await pool.save();

      io.to(req.userId).emit('balanceUpdate', { currency, balance: user.balances[currency] });
      io.to(poolId).emit('poolUpdate', {
        poolId: pool._id,
        currentAmount: pool.currentAmount,
        status: pool.status,
      });
      console.log('POST /api/pools/contribute - Success:', { poolId, amount });
      res.json({ message: `Contributed ${amount} ${currency} to pool` });
    } catch (err) {
      console.error('POST /api/pools/contribute - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.get('/leaderboard/:poolId', authMiddleware, async (req, res) => {
    const { poolId } = req.params;
    console.log('GET /api/pools/leaderboard - Request:', { poolId, userId: req.userId });

    try {
      const pool = await Pool.findById(poolId).populate('contributors.user', 'username');
      if (!pool) {
        console.log('GET /api/pools/leaderboard - Pool not found:', poolId);
        return res.status(404).json({ message: 'Pool not found' });
      }

      const leaderboard = pool.contributors.map((c) => ({
        username: c.user?.username || 'Unknown',
        amount: c.amount,
      }));

      console.log('GET /api/pools/leaderboard - Success:', leaderboard.length);
      res.json(leaderboard);
    } catch (err) {
      console.error('GET /api/pools/leaderboard - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/release/:poolId', authMiddleware, async (req, res) => {
    const { poolId } = req.params;
    console.log('POST /api/pools/release - Request:', { poolId, userId: req.userId });

    try {
      const pool = await Pool.findById(poolId);
      if (!pool) {
        console.log('POST /api/pools/release - Pool not found:', poolId);
        return res.status(404).json({ message: 'Pool not found' });
      }

      if (pool.creator.toString() !== req.userId) {
        console.log('POST /api/pools/release - Unauthorized');
        return res.status(403).json({ message: 'Only the creator can release funds' });
      }

      if (pool.status !== 'completed') {
        console.log('POST /api/pools/release - Pool not completed:', pool.status);
        return res.status(400).json({ message: 'Pool is not completed' });
      }

      pool.status = 'released';
      await pool.save();

      io.to(poolId).emit('poolUpdate', {
        poolId: pool._id,
        currentAmount: pool.currentAmount,
        status: pool.status,
      });
      console.log('POST /api/pools/release - Success:', { poolId });
      res.json({ message: 'Pool funds released' });
    } catch (err) {
      console.error('POST /api/pools/release - Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};