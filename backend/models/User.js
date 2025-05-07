// C:\Users\HP\CosmicVault-New\backend\models\User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  walletId: { type: String, required: true, unique: true },
  balances: {
    type: Map,
    of: Number,
    default: { USD: 0, EUR: 0, GBP: 0 },
  },
  transactions: [{
    type: {
      type: String,
      enum: ['deposit', 'withdraw', 'send', 'receive', 'savings', 'investment', 'redeem'],
      required: true,
    },
    amount: { type: Number },
    currency: { type: String },
    recipientWalletId: { type: String },
    senderWalletId: { type: String },
    transferType: { type: String, enum: ['cosmicvault', 'mobile_money', 'bank', 'exness', 'binance'] },
    isInternational: { type: Boolean },
    savingsName: { type: String },
    investmentName: { type: String },
    points: { type: Number },
    date: { type: Date, default: Date.now },
  }],
  savings: [{
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    type: { type: String, enum: ['accessible', 'fixed'], required: true },
    date: { type: Date, default: Date.now },
  }],
  investments: [{
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    type: { type: String, enum: ['basic', 'gold', 'platinum'], required: true },
    date: { type: Date, default: Date.now },
  }],
  stardustPoints: { type: Number, default: 0 },
  idType: { type: String },
  idNumber: { type: String },
  selfiePath: { type: String },
  twoFactorSecret: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);