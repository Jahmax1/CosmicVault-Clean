const mongoose = require('mongoose');

const poolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  goalAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  currency: { type: String, required: true, enum: ['USD', 'EUR', 'GBP'] },
  deadline: { type: Date, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  signatories: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, enum: ['creator', 'signatory'], default: 'signatory' },
    },
  ],
  contributors: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      amount: Number,
      date: { type: Date, default: Date.now },
    },
  ],
  transactions: [
    {
      type: { type: String, enum: ['contribution', 'withdrawal'], required: true },
      amount: { type: Number, required: true },
      currency: { type: String, required: true },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now },
    },
  ],
  withdrawalRequests: [
    {
      amount: { type: Number, required: true },
      currency: { type: String, required: true },
      recipientWalletId: { type: String, required: true },
      initiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      approvals: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          approved: { type: Boolean, default: false },
          date: { type: Date, default: Date.now },
        },
      ],
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  status: {
    type: String,
    enum: ['active', 'completed', 'released', 'deleted'],
    default: 'active',
  },
});

module.exports = mongoose.model('Pool', poolSchema);