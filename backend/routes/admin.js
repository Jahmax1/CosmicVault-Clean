const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Admin middleware (basic role check, can be enhanced later)
const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isAdmin) { // Assumes User schema has isAdmin field
      console.log('[Admin] Unauthorized access:', req.userId);
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error('[Admin] Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all pending user withdrawals
router.get('/withdrawals', authMiddleware, adminMiddleware, async (req, res) => {
  console.log('[Admin] GET /api/admin/withdrawals - Request:', { userId: req.userId });
  try {
    const users = await User.find({ 'transactions.type': 'withdraw', 'transactions.status': 'pending' })
      .select('username transactions')
      .lean();
    
    const withdrawals = users.flatMap(user =>
      user.transactions
        .filter(tx => tx.type === 'withdraw' && tx.status === 'pending')
        .map(tx => ({
          _id: tx._id,
          userId: user._id,
          username: user.username,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          createdAt: tx.date,
        }))
    );
    
    console.log('[Admin] GET /api/admin/withdrawals - Success:', { count: withdrawals.length });
    res.json(withdrawals);
  } catch (err) {
    console.error('[Admin] GET /api/admin/withdrawals - Error:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve user withdrawal
router.post('/withdrawals/approve/:withdrawalId', authMiddleware, adminMiddleware, async (req, res) => {
  const { withdrawalId } = req.params;
  const { userId } = req.body;
  console.log('[Admin] POST /api/admin/withdrawals/approve - Request:', { withdrawalId, userId });

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log('[Admin] POST /api/admin/withdrawals/approve - User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    const withdrawal = user.transactions.id(withdrawalId);
    if (!withdrawal || withdrawal.type !== 'withdraw' || withdrawal.status !== 'pending') {
      console.log('[Admin] POST /api/admin/withdrawals/approve - Invalid withdrawal:', withdrawalId);
      return res.status(400).json({ message: 'Invalid or non-pending withdrawal' });
    }

    withdrawal.status = 'approved';
    await user.save();

    req.io.to(userId).emit('notification', {
      message: `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} has been approved`,
    });
    console.log('[Admin] POST /api/admin/withdrawals/approve - Success:', { withdrawalId });
    res.json({ message: 'Withdrawal approved' });
  } catch (err) {
    console.error('[Admin] POST /api/admin/withdrawals/approve - Error:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject user withdrawal
router.post('/withdrawals/reject/:withdrawalId', authMiddleware, adminMiddleware, async (req, res) => {
  const { withdrawalId } = req.params;
  const { userId } = req.body;
  console.log('[Admin] POST /api/admin/withdrawals/reject - Request:', { withdrawalId, userId });

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log('[Admin] POST /api/admin/withdrawals/reject - User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    const withdrawal = user.transactions.id(withdrawalId);
    if (!withdrawal || withdrawal.type !== 'withdraw' || withdrawal.status !== 'pending') {
      console.log('[Admin] POST /api/admin/withdrawals/reject - Invalid withdrawal:', withdrawalId);
      return res.status(400).json({ message: 'Invalid or non-pending withdrawal' });
    }

    withdrawal.status = 'rejected';
    user.balances[withdrawal.currency] += withdrawal.amount; // Refund
    await user.save();

    req.io.to(userId).emit('notification', {
      message: `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} has been rejected`,
    });
    req.io.to(userId).emit('balanceUpdate', {
      currency: withdrawal.currency,
      balance: user.balances[withdrawal.currency],
    });
    console.log('[Admin] POST /api/admin/withdrawals/reject - Success:', { withdrawalId });
    res.json({ message: 'Withdrawal rejected' });
  } catch (err) {
    console.error('[Admin] POST /api/admin/withdrawals/reject - Error:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;