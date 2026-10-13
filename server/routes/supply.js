const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Assuming you have an authentication/authorization middleware
// If your auth middleware file path is different, update this require statement
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Supply / Account Schema & Model (in-file schema definition for quick setup)
const SupplySchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Partial'],
      default: 'Paid',
    },
    supplyDate: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const Supply = mongoose.models.Supply || mongoose.model('Supply', SupplySchema);

/**
 * @route   GET /api/supply
 * @desc    Get all supply/account records with optional date filtering
 * @access  Private (Admin Only)
 */
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};

    if (startDate || endDate) {
      query.supplyDate = {};
      if (startDate) query.supplyDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.supplyDate.$lte = end;
      }
    }

    const supplies = await Supply.find(query)
      .populate('addedBy', 'fullName email')
      .sort({ supplyDate: -1 });

    const totalExpenditure = supplies.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

    res.status(200).json({
      success: true,
      supplies,
      totalExpenditure,
    });
  } catch (error) {
    console.error('Error fetching supply records:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching supply records.' });
  }
});

/**
 * @route   POST /api/supply/add
 * @desc    Record a new supply shipment / expense
 * @access  Private (Admin Only)
 */
router.post('/add', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { supplierName, itemName, quantity, costPrice, paymentStatus, supplyDate } = req.body;

    if (!supplierName || !itemName || !quantity || !costPrice) {
      return res.status(400).json({
        success: false,
        message: 'Please provide supplier name, item name, quantity, and cost price.',
      });
    }

    const parsedQty = Number(quantity);
    const parsedPrice = Number(costPrice);
    const totalAmount = parsedQty * parsedPrice;

    const newSupply = new Supply({
      supplierName: supplierName.trim(),
      itemName: itemName.trim(),
      quantity: parsedQty,
      costPrice: parsedPrice,
      totalAmount,
      paymentStatus: paymentStatus || 'Paid',
      supplyDate: supplyDate ? new Date(supplyDate) : Date.now(),
      addedBy: req.user?._id || req.user?.id,
    });

    await newSupply.save();

    res.status(201).json({
      success: true,
      message: 'Supply record added successfully!',
      supply: newSupply,
    });
  } catch (error) {
    console.error('Error adding supply record:', error);
    res.status(500).json({ success: false, message: 'Server error while saving supply record.' });
  }
});

/**
 * @route   DELETE /api/supply/:id
 * @desc    Delete a supply record
 * @access  Private (Admin Only)
 */
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deletedSupply = await Supply.findByIdAndDelete(req.params.id);

    if (!deletedSupply) {
      return res.status(404).json({ success: false, message: 'Supply record not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Supply record deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting supply record:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting supply record.' });
  }
});

module.exports = router;