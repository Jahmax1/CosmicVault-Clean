const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
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
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be a positive number'], // Validation
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP'],
      required: true,
    },
    recipientWalletId: { type: String },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    poolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pool' },
    transferType: {
      type: String,
      enum: ['cosmicvault', 'mobile_money', 'bank', 'exness', 'binance'],
    },
    isInternational: { type: Boolean, default: false }, // Added default
    points: { type: Number, default: 0 }, // Added default
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true } // Add createdAt and updatedAt
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true, // Remove whitespace
      lowercase: true, // Normalize email
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true, // Remove whitespace
    },
    password: { type: String, required: true },
    walletId: { type: String, required: true, unique: true },
    selfiePath: { type: String, trim: true }, // Optional, with trim
    balances: {
      USD: { type: Number, default: 0 },
      EUR: { type: Number, default: 0 },
      GBP: { type: Number, default: 0 },
    },
    stardustPoints: { type: Number, default: 0 },
    savings: [
      {
        name: { type: String, required: true, trim: true },
        amount: {
          type: Number,
          required: true,
          min: [0, 'Savings amount must be a positive number'],
        },
        currency: {
          type: String,
          enum: ['USD', 'EUR', 'GBP'],
          required: true,
        },
        type: {
          type: String,
          enum: ['accessible', 'fixed'],
          required: true,
        },
        date: { type: Date, default: Date.now },
      },
    ],
    investments: [
      {
        name: { type: String, required: true, trim: true },
        amount: {
          type: Number,
          required: true,
          min: [0, 'Investment amount must be a positive number'],
        },
        currency: {
          type: String,
          enum: ['USD', 'EUR', 'GBP'],
          required: true,
        },
        type: {
          type: String,
          enum: ['basic', 'gold', 'platinum'],
          required: true,
        },
        date: { type: Date, default: Date.now },
      },
    ],
    transactions: [transactionSchema],
    isAdmin: { type: Boolean, default: false },
    lastLogin: { type: Date }, // Added to track last login
  },
  {
    timestamps: true, // Add createdAt and updatedAt
    toJSON: { virtuals: true }, // Include virtuals in JSON output
    toObject: { virtuals: true }, // Include virtuals in object output
  }
);

// Ensure indexes are created for unique fields
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ walletId: 1 });

module.exports = mongoose.model('User', userSchema);