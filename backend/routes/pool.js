const express = require('express');
const router = express.Router();
const Pool = require('../models/Pool');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

module.exports = (io) => {
  // List all pools
  router.get('/list', authMiddleware, async (req, res) => {
    console.log('[Pool] GET /api/pools/list - User ID:', req.userId);
    try {
      const pools = await Pool.find({ status: { $ne: 'deleted' } })
        .populate('creator', 'username walletId')
        .populate('signatories.user', 'username walletId')
        .lean();
      console.log('[Pool] GET /api/pools/list - Pools fetched:', {
        count: pools.length,
        statuses: pools.map(p => p.status),
        poolIds: pools.map(p => p._id)
      });
      res.json(pools);
    } catch (err) {
      console.error('[Pool] GET /api/pools/list - Error:', {
        message: err.message,
        stack: err.stack
      });
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Create a pool
  router.post('/create', authMiddleware, async (req, res) => {
    const { name, description, goalAmount, currency, deadline, signatoryWalletIds } = req.body;
    console.log('[Pool] POST /api/pools/create - Request:', {
      name,
      goalAmount,
      currency,
      userId: req.userId,
      signatoryWalletIds,
    });

    if (
      !name ||
      !goalAmount ||
      goalAmount <= 0 ||
      !['USD', 'EUR', 'GBP'].includes(currency) ||
      !deadline ||
      !signatoryWalletIds ||
      signatoryWalletIds.length !== 2
    ) {
      console.log('[Pool] POST /api/pools/create - Invalid input');
      return res.status(400).json({ message: 'Invalid pool details or exactly two additional signatories required' });
    }

    try {
      const creator = await User.findById(req.userId);
      if (!creator) {
        console.log('[Pool] POST /api/pools/create - Creator not found:', req.userId);
        return res.status(404).json({ message: 'Creator not found' });
      }

      const signatories = [
        { user: req.userId, role: 'creator' },
      ];

      for (const walletId of signatoryWalletIds) {
        const user = await User.findOne({ walletId });
        if (!user) {
          console.log('[Pool] POST /api/pools/create - Signatory not found:', walletId);
          return res.status(404).json({ message: `Signatory with wallet ID ${walletId} not found` });
        }
        if (user._id.toString() === req.userId) {
          console.log('[Pool] POST /api/pools/create - Duplicate signatory');
          return res.status(400).json({ message: 'Creator cannot be added as an additional signatory' });
        }
        signatories.push({ user: user._id, role: 'signatory' });
      }

      const pool = new Pool({
        name,
        description,
        goalAmount,
        currency,
        deadline,
        creator: req.userId,
        signatories,
        status: 'active', // Explicitly set to active
      });

      await pool.save();
      io.to(req.userId).emit('poolUpdate', {
        poolId: pool._id,
        currentAmount: pool.currentAmount,
        status: pool.status,
      });
      signatories.forEach((s) => {
        io.to(s.user.toString()).emit('notification', {
          message: `You have been added as a signatory to pool "${name}"`,
        });
      });
      console.log('[Pool] POST /api/pools/create - Success:', { poolId: pool._id });
      res.json({ message: 'Pool created successfully', pool });
    } catch (err) {
      console.error('[Pool] POST /api/pools/create - Error:', {
        message: err.message,
        stack: err.stack
      });
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Contribute to a pool
  router.post('/contribute', authMiddleware, async (req, res) => {
    const { poolId, amount, currency } = req.body;
    console.log('[Pool] POST /api/pools/contribute - Request:', { poolId, amount, currency, userId: req.userId });

    if (!poolId || !amount || amount < 1 || !['USD', 'EUR', 'GBP'].includes(currency)) {
      console.log('[Pool] POST /api/pools/contribute - Invalid input');
      return res.status(400).json({ message: 'Invalid contribution details' });
    }

    try {
      const pool = await Pool.findById(poolId);
      if (!pool) {
        console.log('[Pool] POST /api/pools/contribute - Pool not found:', poolId);
        return res.status(404).json({ message: 'Pool not found' });
      }

      if (pool.status !== 'active') {
        console.log('[Pool] POST /api/pools/contribute - Pool not active:', pool.status);
        return res.status(400).json({ message: 'Pool is not active' });
      }

      if (pool.currency !== currency) {
        console.log('[Pool] POST /api/pools/contribute - Currency mismatch:', {
          poolCurrency: pool.currency,
          inputCurrency: currency,
        });
        return res.status(400).json({ message: 'Currency does not match pool' });
      }

      const user = await User.findById(req.userId);
      if (!user) {
        console.log('[Pool] POST /api/pools/contribute - User not found:', req.userId);
        return res.status(404).json({ message: 'User not found' });
      }

      if ((user.balances[currency] || 0) < amount) {
        console.log('[Pool] POST /api/pools/contribute - Insufficient funds');
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
      pool.contributors.push({ user: req.userId, amount, date: new Date() });
      pool.transactions.push({
        type: 'contribution',
        amount,
        currency,
        user: req.userId,
        date: new Date(),
      });

      if (pool.currentAmount >= pool.goalAmount) {
        pool.status = 'completed';
        console.log('[Pool] POST /api/pools/contribute - Pool completed:', poolId);
      }

      await user.save();
      await pool.save();

      io.to(req.userId).emit('balanceUpdate', { currency, balance: user.balances[currency] });
      io.to(poolId).emit('poolUpdate', {
        poolId: pool._id,
        currentAmount: pool.currentAmount,
        status: pool.status,
      });
      pool.signatories.forEach((s) => {
        io.to(s.user.toString()).emit('notification', {
          message: `New contribution of ${amount} ${currency} to pool "${pool.name}"`,
        });
      });
      console.log('[Pool] POST /api/pools/contribute - Success:', { poolId, amount });
      res.json({ message: `Contributed ${amount} ${currency} to pool`, pool });
    } catch (err) {
      console.error('[Pool] POST /api/pools/contribute - Error:', {
        message: err.message,
        stack: err.stack
      });
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get pool transaction history (paginated)
  router.get('/transactions/:poolId', authMiddleware, async (req, res) => {
    const { poolId } = req.params;
    const { page = 1, limit = 5, viewAll = 'false' } = req.query;
    console.log('[Pool] GET /api/pools/transactions - Request:', { poolId, page, limit, viewAll, userId: req.userId });

    try {
      const pool = await Pool.findById(poolId).populate('transactions.user', 'username');
      if (!pool) {
        console.log('[Pool] GET /api/pools/transactions - Pool not found:', poolId);
        return res.status(404).json({ message: 'Pool not found' });
      }

      let transactions = pool.transactions;
      const total = transactions.length;

      if (viewAll !== 'true') {
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        transactions = transactions.slice(startIndex, endIndex);
      }

      const totalPages = viewAll === 'true' ? 1 : Math.ceil(total / limit);

      console.log('[Pool] GET /api/pools/transactions - Success:', { poolId, total, page, totalPages });
      res.json({ transactions, total, totalPages });
    } catch (err) {
      console.error('[Pool] GET /api/pools/transactions - Error:', {
        message: err.message,
        stack: err.stack
      });
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get pool leaderboard
  router.get('/leaderboard/:poolId', authMiddleware, async (req, res) => {
    const { poolId } = req.params;
    console.log('[Pool] GET /api/pools/leaderboard - Request:', { poolId, userId: req.userId });

    try {
      const pool = await Pool.findById(poolId).populate('contributors.user', 'username');
      if (!pool) {
        console.log('[Pool] GET /api/pools/leaderboard - Pool not found:', poolId);
        return res.status(404).json({ message: 'Pool not found' });
      }

      const leaderboard = pool.contributors.reduce((acc, { user, amount }) => {
        const existing = acc.find((entry) => entry.userId === user._id.toString());
        if (existing) {
          existing.amount += amount;
        } else {
          acc.push({
            userId: user._id.toString(),
            username: user.username,
            amount,
          });
        }
        return acc;
      }, []);

      leaderboard.sort((a, b) => b.amount - a.amount);
      console.log('[Pool] GET /api/pools/leaderboard - Success:', { poolId, leaderboardLength: leaderboard.length });
      res.json(leaderboard);
    } catch (err) {
      console.error('[Pool] GET /api/pools/leaderboard - Error:', {
        message: err.message,
        stack: err.stack
      });
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get pool details
  router.get('/:poolId', authMiddleware, async (req, res) => {
    const { poolId } = req.params;
    console.log('[Pool] GET /api/pools/:poolId - Request:', { poolId, userId: req.userId });

    try {
      const pool = await Pool.findById(poolId)
        .populate('creator', 'username walletId')
        .populate('signatories.user', 'username walletId')
        .lean();
      if (!pool) {
        console.log('[Pool] GET /api/pools/:poolId - Pool not found:', poolId);
        return res.status(404).json({ message: 'Pool not found' });
      }
      console.log('[Pool] GET /api/pools/:poolId - Success:', { poolId });
      res.json(pool);
    } catch (err) {
      console.error('[Pool] GET /api/pools/:poolId - Error:', {
        message: err.message,
        stack: err.stack
      });
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Release pool funds (creator only)
  router.post('/release/:poolId', authMiddleware, async (req, res) => {
    const { poolId } = req.params;
    console.log('[Pool] POST /api/pools/release - Request:', { poolId, userId: req.userId });

    try {
      const pool = await Pool.findById(poolId);
      if (!pool) {
        console.log('[Pool] POST /api/pools/release - Pool not found:', poolId);
        return res.status(404).json({ message: 'Pool not found' });
      }

      if (pool.creator.toString() !== req.userId) {
        console.log('[Pool] POST /api/pools/release - Unauthorized:', { userId: req.userId });
        return res.status(403).json({ message: 'Only the pool creator can release funds' });
      }

      if (pool.status !== 'completed') {
        console.log('[Pool] POST /api/pools/release - Pool not completed:', pool.status);
        return res.status(400).json({ message: 'Pool must be completed to release funds' });
      }

      pool.status = 'released';
      await pool.save();

      io.to(poolId).emit('poolUpdate', {
        poolId: pool._id,
        currentAmount: pool.currentAmount,
        status: pool.status,
      });
      pool.signatories.forEach((s) => {
        io.to(s.user.toString()).emit('notification', {
          message: `Funds for pool "${pool.name}" have been released`,
        });
      });
      console.log('[Pool] POST /api/pools/release - Success:', { poolId });
      res.json({ message: 'Pool funds released successfully', pool });
    } catch (err) {
      console.error('[Pool] POST /api/pools/release - Error:', {
        message: err.message,
        stack: err.stack
      });
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Initiate pool withdrawal (signatories only)
  router.post('/withdraw/:poolId', authMiddleware, async (req, res) => {
    const { poolId } = req.params;
    const { amount, currency, recipientWalletId } = req.body;
    console.log('[Pool] POST /api/pools/withdraw - Request:', {
      poolId,
      amount,
      currency,
      recipientWalletId,
      userId: req.userId,
    });

    if (!amount || amount <= 0 || !currency || !recipientWalletId) {
      console.log('[Pool] POST /api/pools/withdraw - Invalid input');
      return res.status(400).json({ message: 'Invalid withdrawal details' });
    }

    try {
      const pool = await Pool.findById(poolId).populate('signatories.user', 'username walletId');
      if (!pool) {
        console.log('[Pool] POST /api/pools/withdraw - Pool not found:', poolId);
        return res.status(404).json({ message: 'Pool not found' });
      }

      const isSignatory = pool.signatories.some(
        (s) => s.user._id.toString() === req.userId
      );
      if (!isSignatory) {
        console.log('[Pool] POST /api/pools/withdraw - Unauthorized:', { userId: req.userId });
        return res.status(403).json({ message: 'Only signatories can initiate withdrawals' });
      }

      if (pool.currency !== currency) {
        console.log('[Pool] POST /api/pools/withdraw - Currency mismatch:', {
          poolCurrency: pool.currency,
          inputCurrency: currency,
        });
        return res.status(400).json({ message: 'Currency does not match pool' });
      }

      if (pool.currentAmount < amount) {
        console.log('[Pool] POST /api/pools/withdraw - Insufficient funds:', {
          currentAmount: pool.currentAmount,
          requestedAmount: amount,
        });
        return res.status(400).json({ message: 'Insufficient funds in pool' });
      }

      const recipient = await User.findOne({ walletId: recipientWalletId });
      if (!recipient) {
        console.log('[Pool] POST /api/pools/withdraw - Recipient not found:', recipientWalletId);
        return res.status(404).json({ message: 'Recipient wallet not found' });
      }

      const withdrawalRequest = {
        initiator: req.userId,
        poolId,
        amount,
        currency,
        recipientWalletId,
        status: 'pending',
        createdAt: new Date(),
        approvals: [],
      };

      pool.withdrawalRequests.push(withdrawalRequest);
      await pool.save();

      pool.signatories.forEach((s) => {
        if (s.user._id.toString() !== req.userId) {
          io.to(s.user._id.toString()).emit('notification', {
            message: `New withdrawal request of ${amount} ${currency} for pool "${pool.name}"`,
          });
        }
      });
      io.to(poolId).emit('poolUpdate', {
        poolId: pool._id,
        currentAmount: pool.currentAmount,
        status: pool.status,
      });
      console.log('[Pool] POST /api/pools/withdraw - Success:', { poolId, amount });
      res.json({ message: 'Withdrawal request submitted successfully' });
    } catch (err) {
      console.error('[Pool] POST /api/pools/withdraw - Error:', {
        message: err.message,
        stack: err.stack
      });
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Approve or reject pool withdrawal (signatories only)
  router.post('/withdraw/approve/:poolId/:requestId', authMiddleware, async (req, res) => {
    const { poolId, requestId } = req.params;
    const { approve } = req.body;
    console.log('[Pool] POST /api/pools/withdraw/approve - Request:', {
      poolId,
      requestId,
      approve,
      userId: req.userId,
    });

    try {
      const pool = await Pool.findById(poolId).populate('signatories.user', 'username walletId');
      if (!pool) {
        console.log('[Pool] POST /api/pools/withdraw/approve - Pool not found:', poolId);
        return res.status(404).json({ message: 'Pool not found' });
      }

      const isSignatory = pool.signatories.some(
        (s) => s.user._id.toString() === req.userId
      );
      if (!isSignatory) {
        console.log('[Pool] POST /api/pools/withdraw/approve - Unauthorized:', { userId: req.userId });
        return res.status(403).json({ message: 'Only signatories can approve withdrawals' });
      }

      const withdrawalRequest = pool.withdrawalRequests.id(requestId);
      if (!withdrawalRequest) {
        console.log('[Pool] POST /api/pools/withdraw/approve - Request not found:', requestId);
        return res.status(404).json({ message: 'Withdrawal request not found' });
      }

      if (withdrawalRequest.status !== 'pending') {
        console.log('[Pool] POST /api/pools/withdraw/approve - Request not pending:', withdrawalRequest.status);
        return res.status(400).json({ message: 'Withdrawal request is not pending' });
      }

      if (withdrawalRequest.initiator.toString() === req.userId) {
        console.log('[Pool] POST /api/pools/withdraw/approve - Initiator cannot approve');
        return res.status(400).json({ message: 'Initiator cannot approve their own request' });
      }

      const existingApproval = withdrawalRequest.approvals.find(
        (a) => a.user.toString() === req.userId
      );
      if (existingApproval) {
        console.log('[Pool] POST /api/pools/withdraw/approve - Already voted:', { userId: req.userId });
        return res.status(400).json({ message: 'You have already voted on this request' });
      }

      withdrawalRequest.approvals.push({ user: req.userId, approved: approve });

      const totalApprovals = withdrawalRequest.approvals.filter((a) => a.approved).length;
      const totalSignatories = pool.signatories.length;
      const requiredApprovals = Math.ceil(totalSignatories / 2); // Majority (e.g., 2/3)

      if (approve && totalApprovals >= requiredApprovals) {
        withdrawalRequest.status = 'approved';

        pool.currentAmount -= withdrawalRequest.amount;
        pool.transactions.push({
          type: 'withdrawal',
          amount: withdrawalRequest.amount,
          currency: withdrawalRequest.currency,
          user: withdrawalRequest.initiator,
          recipientWalletId: withdrawalRequest.recipientWalletId,
          date: new Date(),
        });

        const recipient = await User.findOne({ walletId: withdrawalRequest.recipientWalletId });
        if (recipient) {
          recipient.balances[withdrawalRequest.currency] =
            (recipient.balances[withdrawalRequest.currency] || 0) + withdrawalRequest.amount;
          recipient.transactions.push({
            type: 'pool_withdrawal_received',
            amount: withdrawalRequest.amount,
            currency: withdrawalRequest.currency,
            poolId,
            date: new Date(),
          });
          await recipient.save();
          io.to(recipient._id.toString()).emit('balanceUpdate', {
            currency: withdrawalRequest.currency,
            balance: recipient.balances[withdrawalRequest.currency],
          });
        }
      } else if (!approve) {
        withdrawalRequest.status = 'rejected';
      }

      await pool.save();

      pool.signatories.forEach((s) => {
        io.to(s.user._id.toString()).emit('notification', {
          message: `Withdrawal request for pool "${pool.name}" has been ${withdrawalRequest.status}`,
        });
      });
      io.to(poolId).emit('poolUpdate', {
        poolId: pool._id,
        currentAmount: pool.currentAmount,
        status: pool.status,
      });
      console.log('[Pool] POST /api/pools/withdraw/approve - Success:', {
        poolId,
        requestId,
        status: withdrawalRequest.status,
      });
      res.json({ message: `Withdrawal request ${withdrawalRequest.status}` });
    } catch (err) {
      console.error('[Pool] POST /api/pools/withdraw/approve - Error:', {
        message: err.message,
        stack: err.stack
      });
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get all pool withdrawal requests (for admin panel)
  router.get('/withdraw/requests/all', authMiddleware, async (req, res) => {
    console.log('[Pool] GET /api/pools/withdraw/requests/all - Request:', { userId: req.userId });

    try {
      const pools = await Pool.find({
        'signatories.user': req.userId,
      })
        .populate('creator', 'username walletId')
        .populate('signatories.user', 'username walletId')
        .populate('withdrawalRequests.initiator', 'username walletId')
        .lean();

      const withdrawalRequests = pools
        .flatMap((pool) =>
          pool.withdrawalRequests.map((request) => ({
            ...request,
            pool: { _id: pool._id, name: pool.name },
            poolId: pool._id,
          }))
        )
        .filter((request) => request.status === 'pending');

      console.log('[Pool] GET /api/pools/withdraw/requests/all - Success:', {
        totalRequests: withdrawalRequests.length,
      });
      res.json(withdrawalRequests);
    } catch (err) {
      console.error('[Pool] GET /api/pools/withdraw/requests/all - Error:', {
        message: err.message,
        stack: err.stack
      });
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};