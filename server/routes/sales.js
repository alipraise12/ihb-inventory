const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// GET /api/sales/staff/:userId - Get TODAY's sales breakdown for a specific user/staff
router.get('/staff/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const nameQuery = req.query.name;

    if (!userId || userId === 'undefined' || userId === 'null') {
      return res.status(200).json({ success: true, totalSales: 0, sales: [] });
    }

    // Set Date range strictly for TODAY (00:00:00 to 23:59:59)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Build conditions to find the seller by ID or Name
    const sellerConditions = [
      { 'soldBy.userId': userId },
      { 'soldBy._id': userId },
      { createdBy: userId },
      { userId: userId },
      { soldBy: userId }
    ];

    if (mongoose.Types.ObjectId.isValid(userId)) {
      const objId = new mongoose.Types.ObjectId(userId);
      sellerConditions.push(
        { 'soldBy.userId': objId },
        { 'soldBy._id': objId },
        { createdBy: objId },
        { userId: objId }
      );
    }

    // If a name string is provided (e.g. "Praise Ali" or "Blessing")
    if (nameQuery) {
      const nameRegex = new RegExp(nameQuery.trim(), 'i');
      sellerConditions.push(
        { soldBy: nameRegex },
        { 'soldBy.name': nameRegex },
        { 'soldBy.fullName': nameRegex },
        { 'soldBy.username': nameRegex },
        { staffName: nameRegex }
      );
    }

    // Fetch all sales created today
    const allTodaySales = await Sale.find({
      $or: [
        { createdAt: { $gte: startOfToday, $lte: endOfToday } },
        { date: { $gte: startOfToday, $lte: endOfToday } }
      ]
    });

    // Filter sales made today by matching seller ID or Name string
    const userSales = allTodaySales.filter((sale) => {
      const soldByVal = sale.soldBy;
      const createdByVal = sale.createdBy;

      // Check string matches in soldBy object/string
      if (typeof soldByVal === 'string') {
        if (nameQuery && soldByVal.toLowerCase().includes(nameQuery.toLowerCase())) return true;
        if (soldByVal === userId) return true;
      } else if (soldByVal && typeof soldByVal === 'object') {
        const sName = soldByVal.name || soldByVal.fullName || soldByVal.username || '';
        const sId = String(soldByVal.userId || soldByVal._id || '');
        if (nameQuery && sName.toLowerCase().includes(nameQuery.toLowerCase())) return true;
        if (sId === String(userId)) return true;
      }

      if (String(createdByVal) === String(userId)) return true;

      return false;
    });

    const totalSales = userSales.reduce(
      (acc, sale) => acc + (Number(sale.totalAmount || sale.amount) || 0),
      0
    );

    res.status(200).json({
      success: true,
      totalSales,
      count: userSales.length,
      sales: userSales,
    });
  } catch (err) {
    console.error('Error fetching today\'s user sales:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch sales for this user.' });
  }
});

module.exports = router;