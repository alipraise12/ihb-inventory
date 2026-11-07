const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // Links the stock item to the shop owner (Praise Ali)
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    addedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      fullName: String,
      role: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Stock', stockSchema);