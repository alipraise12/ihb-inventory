const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  stockId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    default: null,
  },
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  itemTotal: {
    type: Number,
    required: true,
  },
  isCustomItem: {
    type: Boolean,
    default: false,
  },
});

const saleSchema = new mongoose.Schema(
  {
    // The main shop owner's account ID (ensures sales belong to the shop)
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The specific user who logged this transaction (Owner or Sales Associate)
    soldBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      fullName: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        enum: ['owner', 'staff'],
        required: true,
      },
    },
    items: [saleItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Transfer', 'POS'],
      default: 'Cash',
    },
    saleDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Sale || mongoose.model('Sale', saleSchema);