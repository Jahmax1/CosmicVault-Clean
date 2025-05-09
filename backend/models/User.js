const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'deposit',
      'withdraw',
      'send',
      'receive',
      'pool_contribution',
      'pool_withdrawal_received',
      'savings',
      'investment',
      'redeem',
    ],
    required: true,
  },
  amount: { type: Number },
  currency: { type: String, enum: ['USD', 'EUR', 'GBP'] },
  recipientWalletId: { type: String },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  poolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pool' },
  transferType: { type: String, enum: ['cosmicvault', 'mobile_money', 'bank', 'exness', 'binance'] },
  isInternational: { type: Boolean },
  points: { type: Number },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, // Added
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  walletId: { type: String, required: true, unique: true },
  selfiePath: { type: String },
  balances: {
    USD: { type: Number, default: 0 },
    EUR: { type: Number, default: 0 },
    GBP: { type: Number, default: 0 },
  },
  stardustPoints: { type: Number, default: 0 },
  savings: [
    {
      name: { type: String, required: true },
      amount: { type: Number, required: true },
      currency: { type: String, enum: ['USD', 'EUR', 'GBP'], required: true },
      type: { type: String, enum: ['accessible', 'fixed'], required: true },
      date: { type: Date, default: Date.now },
    },
  ],
  investments: [
    {
      name: { type: String, required: true },
      amount: { type: Number, required: true },
      currency: { type: String, enum: ['USD', 'EUR', 'GBP'], required: true },
      type: { type: String, enum: ['basic', 'gold', 'platinum'], required: true },
      date: { type: Date, default: Date.now },
    },
  ],
  transactions: [transactionSchema],
  isAdmin: { type: Boolean, default: false }, // Added
});

module.exports = mongoose.model('User', userSchema);