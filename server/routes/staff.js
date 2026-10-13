const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth'); // Adjust path if auth middleware is located elsewhere

// ==========================================
// GET /api/staff/list - Fetch all staff members for the shop
// ==========================================
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.userId || req.user.id;

    // Fetch staff assigned to this shop OR users registered with role 'staff' under this owner
    const staffMembers = await User.find(
      {
        $or: [{ shopId: ownerId }, { role: 'staff', _id: ownerId }],
        role: 'staff',
      },
      '-password'
    ).sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      count: staffMembers.length, 
      staff: staffMembers 
    });
  } catch (err) {
    console.error('Fetch Staff Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch staff members.' });
  }
});

// Optional fallback route if your frontend calls /api/staff directly
router.get('/', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.userId || req.user.id;

    const staffMembers = await User.find(
      {
        $or: [{ shopId: ownerId }, { role: 'staff', _id: ownerId }],
        role: 'staff',
      },
      '-password'
    ).sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      count: staffMembers.length, 
      staff: staffMembers 
    });
  } catch (err) {
    console.error('Fetch Staff Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch staff members.' });
  }
});

module.exports = router;