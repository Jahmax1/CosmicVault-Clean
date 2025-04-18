// backend/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  balance: [
    {
      currency: { type: String, default: 'USD' },
      amount: { type: Number, default: 0 },
    },
  ],
  stardustPoints: { type: Number, default: 0 },
  bankAccounts: [{ type: String }],
  cryptoWallets: [{ type: String }],
  savings: [
    {
      name: String,
      target: Number,
      current: Number,
      currency: { type: String, default: 'USD' },
      type: { type: String, enum: ['accessible', 'fixed'] },
      fixedAmount: Number,
      lockEndDate: Date,
      accruedInterest: Number,
      lastInterestUpdate: Date,
    },
  ],
  investments: [
    {
      name: String,
      amount: Number,
      currency: { type: String, default: 'USD' },
      type: { type: String, enum: ['basic', 'gold', 'platinum'] },
      accruedDividends: Number,
    },
  ],
  transactions: [
    {
      type: { type: String, enum: ['deposit', 'send', 'receive', 'withdraw'] },
      transferType: String,
      amount: Number,
      currency: { type: String, default: 'USD' },
      recipient: {
        identifier: String,
        provider: String,
        countryCode: String,
      },
      isInternational: Boolean,
      date: Date,
      category: { type: String, default: 'General' },
    },
  ],
  twoFactorSecret: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  referralCode: { type: String, unique: true },
}, { versionKey: '__v' });

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'transactions.date': -1 });

module.exports = mongoose.model('User', userSchema);