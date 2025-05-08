// C:\Users\HP\CosmicVault-New\backend\models\Pool.js
const mongoose = require('mongoose');

const poolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  goalAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  currency: { type: String, required: true, enum: ['USD', 'EUR', 'GBP'] },
  deadline: { type: Date, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contributors: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
  }],
  status: { type: String, enum: ['active', 'completed', 'released', 'deleted'], default: 'active' },
});

module.exports = mongoose.model('Pool', poolSchema);