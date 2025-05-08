// C:\Users\HP\CosmicVault-New\backend\models\User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true },
  walletId: { type: String, required: true, unique: true },
  selfiePath: { type: String },
  balances: {
    USD: { type: Number, default: 0 },
    EUR: { type: Number, default: 0 },
    GBP: { type: Number, default: 0 },
  },
  stardustPoints: { type: Number, default: 0 },
  savings: [{
    name: String,
    amount: Number,
    currency: String,
    type: { type: String, enum: ['accessible', 'fixed'] },
    date: { type: Date, default: Date.now },
  }],
  investments: [{
    name: String,
    amount: Number,
    currency: String,
    type: { type: String, enum: ['basic', 'gold', 'platinum'] },
    date: { type: Date, default: Date.now },
  }],
  transactions: [{
    type: { type: String, enum: ['deposit', 'withdraw', 'savings', 'investment', 'redeem', 'send', 'receive', 'pool_contribution'] },
    amount: Number,
    currency: String,
    points: Number,
    recipientWalletId: String,
    senderId: String,
    poolId: String,
    transferType: String,
    isInternational: Boolean,
    date: { type: Date, default: Date.now },
  }],
});

module.exports = mongoose.model('User', userSchema);