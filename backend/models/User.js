// C:\Users\HP\CosmicVault\backend\models\User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String },
  password: { type: String, required: true },
  balances: {
    USD: { type: Number, default: 0 },
    EUR: { type: Number, default: 0 },
    GBP: { type: Number, default: 0 },
  },
  walletId: { type: String, unique: true },
  referralCode: { type: String, unique: true },
  stardustPoints: { type: Number, default: 0 },
  twoFactorSecret: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  transactions: [{
    type: { type: String, enum: ['deposit', 'withdraw', 'send', 'receive'] },
    amount: Number,
    currency: { type: String, enum: ['USD', 'EUR', 'GBP'] },
    date: { type: Date, default: Date.now },
  }],
  savings: [{
    name: String,
    amount: Number,
    currency: { type: String, enum: ['USD', 'EUR', 'GBP'] },
    type: { type: String, enum: ['accessible', 'fixed'] },
    createdAt: { type: Date, default: Date.now },
  }],
  investments: [{
    name: String,
    amount: Number,
    currency: { type: String, enum: ['USD', 'EUR', 'GBP'] },
    type: { type: String, enum: ['basic', 'gold', 'platinum'] },
    createdAt: { type: Date, default: Date.now },
  }],
});

module.exports = mongoose.model('User', userSchema);