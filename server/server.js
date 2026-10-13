const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

// Enable CORS for React Frontend
app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Clear any restricted Content Security Policy headers
app.use((req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  next();
});

// ==========================================
// MONGOOSE SCHEMAS & MODELS
// ==========================================

// User Schema (Owner & Staff)
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['owner', 'staff'],
      default: 'owner',
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Points to owner's ObjectId if role is 'staff'
    },
    trialStartDate: { type: Date, default: null },
    isSubscribed: { type: Boolean, default: false },
    subscriptionDate: { type: Date, default: null },
    paystackReference: { type: String, default: null },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Stock Schema
const stockSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productName: { type: String, required: true, trim: true },
    category: { type: String, default: 'General' },
    packs: { type: Number, default: 0 },
    piecesPerPack: { type: Number, default: 1 },
    loosePieces: { type: Number, default: 0 },
    quantity: { type: Number, required: true, default: 0 },
    costPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, required: true },
    lowStockThreshold: { type: Number, default: 5 },
  },
  { timestamps: true }
);

const Stock = mongoose.models.Stock || mongoose.model('Stock', stockSchema);

// Sale Schema
const saleItemSchema = new mongoose.Schema({
  stockId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', default: null },
  productName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  itemTotal: { type: Number, required: true },
  isCustomItem: { type: Boolean, default: false },
});

const saleSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    soldBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      fullName: { type: String, required: true },
      role: { type: String, enum: ['owner', 'staff'], required: true },
    },
    items: [saleItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'Transfer', 'POS'], default: 'Cash' },
    saleDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);

// Supply Schema
const supplySchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', default: null },
    supplierName: { type: String, required: true, trim: true },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    costPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Paid' },
    supplyDate: { type: Date, default: Date.now },
    addedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      fullName: { type: String, required: true },
    },
  },
  { timestamps: true }
);

const Supply = mongoose.models.Supply || mongoose.model('Supply', supplySchema);

// Account / Virtual Bank Schema
const userAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    phoneNumber: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String, default: 'Wema Bank' },
    customerCode: { type: String },
    transferPin: { type: String, required: true },
    balance: { type: Number, default: 0 },
    isPhoneVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const UserAccount = mongoose.models.UserAccount || mongoose.model('UserAccount', userAccountSchema);

// In-memory OTP store
const otpStore = new Map();

// Housekeeping for expired OTPs every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (value.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}, 600000);

// ==========================================
// JWT AUTHENTICATION MIDDLEWARE
// ==========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your_fallback_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// ==========================================
// DATABASE CONNECTION
// ==========================================
const MONGO_URI = process.env.MONGO_URI || 'YOUR_MONGODB_CONNECTION_STRING_HERE';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Owner Registration
app.post(['/api/register', '/api/users/register'], async (req, res) => {
  const { fullName, email, phone, password } = req.body;

  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullName,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role: 'owner',
      shopId: null,
    });

    await newUser.save();

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, role: newUser.role, shopId: newUser._id },
      process.env.JWT_SECRET || 'your_fallback_secret_key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        shopId: newUser._id,
      },
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// User Login (Owner & Staff)
app.post(['/api/login', '/api/users/login'], async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    const activeShopId = user.role === 'staff' ? user.shopId : user._id;

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, shopId: activeShopId },
      process.env.JWT_SECRET || 'your_fallback_secret_key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        shopId: activeShopId,
      },
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Get Current User Profile
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId, '-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const activeShopId = user.role === 'staff' ? user.shopId : user._id;

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        shopId: activeShopId,
        isSubscribed: user.isSubscribed,
        trialStartDate: user.trialStartDate,
      },
    });
  } catch (err) {
    console.error('Get Profile Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

// ==========================================
// STAFF MANAGEMENT ENDPOINTS
// ==========================================

app.post('/api/staff/create', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.userId || req.user.id;
    const owner = await User.findById(ownerId);

    if (!owner || owner.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Access denied. Only shop owners can create staff accounts.' });
    }

    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = new User({
      fullName,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role: 'staff',
      shopId: owner._id,
    });

    await newStaff.save();

    res.status(201).json({
      success: true,
      message: 'Staff account created successfully!',
      staff: {
        id: newStaff._id,
        fullName: newStaff.fullName,
        email: newStaff.email,
        phone: newStaff.phone,
        role: newStaff.role,
      },
    });
  } catch (err) {
    console.error('Create Staff Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create staff account.' });
  }
});

app.get('/api/staff/list', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.shopId || req.user.userId || req.user.id;
    const staffMembers = await User.find(
      { shopId: ownerId, role: 'staff' },
      '-password'
    ).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: staffMembers.length, staff: staffMembers });
  } catch (err) {
    console.error('Fetch Staff Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch staff members.' });
  }
});

app.get('/api/staff/:id', authenticateToken, async (req, res) => {
  try {
    const staffId = req.params.id;
    const staffMember = await User.findById(staffId, '-password');

    if (!staffMember) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    res.status(200).json({ success: true, staff: staffMember });
  } catch (err) {
    console.error('Get Staff Details Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch staff details.' });
  }
});

app.put('/api/staff/:id', authenticateToken, async (req, res) => {
  try {
    const staffId = req.params.id;
    const { fullName, phone, password } = req.body;

    const staffMember = await User.findById(staffId);

    if (!staffMember) {
      return res.status(404).json({ success: false, message: 'Staff member not found or access denied.' });
    }

    if (fullName) staffMember.fullName = fullName;
    if (phone) staffMember.phone = phone;
    if (password && password.trim() !== '') {
      staffMember.password = await bcrypt.hash(password, 10);
    }

    await staffMember.save();

    res.status(200).json({
      success: true,
      message: 'Staff details updated successfully!',
      staff: {
        id: staffMember._id,
        fullName: staffMember.fullName,
        email: staffMember.email,
        phone: staffMember.phone,
        role: staffMember.role,
      },
    });
  } catch (err) {
    console.error('Update Staff Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update staff member.' });
  }
});

app.delete('/api/staff/:id', authenticateToken, async (req, res) => {
  try {
    const staffId = req.params.id;

    const deletedStaff = await User.findByIdAndDelete(staffId);

    if (!deletedStaff) {
      return res.status(404).json({ success: false, message: 'Staff member not found or already removed.' });
    }

    res.status(200).json({
      success: true,
      message: 'Staff account removed successfully.',
    });
  } catch (err) {
    console.error('Delete Staff Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete staff member.' });
  }
});

// ==========================================
// TRIAL & SUBSCRIPTION ENDPOINTS
// ==========================================

app.get('/api/user-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      isSubscribed: user.isSubscribed,
      trialStartDate: user.trialStartDate,
    });
  } catch (err) {
    console.error('Fetch User Status Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user status.' });
  }
});

app.post('/api/start-trial', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.trialStartDate) {
      user.trialStartDate = new Date();
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Trial started successfully.',
      trialStartDate: user.trialStartDate,
    });
  } catch (err) {
    console.error('Start Trial Error:', err);
    res.status(500).json({ success: false, message: 'Failed to initialize trial.' });
  }
});

app.post('/api/verify-payment', authenticateToken, async (req, res) => {
  const { reference } = req.body;
  const userId = req.user.userId || req.user.id;

  if (!reference) {
    return res.status(400).json({ success: false, message: 'Payment reference is required.' });
  }

  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    const paystackRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      }
    );

    const transaction = paystackRes.data.data;

    if (transaction.status === 'success' && transaction.amount >= 300000) {
      await User.findByIdAndUpdate(userId, {
        isSubscribed: true,
        subscriptionDate: new Date(),
        paystackReference: reference,
      });

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully! Full subscription activated.',
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed or invalid amount paid.',
      });
    }
  } catch (err) {
    console.error('Verify Payment Error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment with Paystack server.',
    });
  }
});

// ==========================================
// STOCK ENDPOINTS
// ==========================================

// Get All Stock
app.get('/api/stock', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const stockItems = await Stock.find({ userId: activeShopId }).sort({ createdAt: -1 });
    const totalUnits = stockItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

    res.status(200).json({
      success: true,
      count: stockItems.length,
      totalUnits: totalUnits,
      totalStock: totalUnits,
      totalQuantity: totalUnits,
      stock: stockItems,
    });
  } catch (err) {
    console.error('Fetch Stock Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory stock.' });
  }
});

// Add New Stock Item
app.post('/api/stock/add', authenticateToken, async (req, res) => {
  const { productName, category, packs, piecesPerPack, loosePieces, costPrice, sellingPrice, lowStockThreshold } = req.body;

  if (!productName || sellingPrice === undefined) {
    return res.status(400).json({ success: false, message: 'Product name and selling price are required.' });
  }

  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const packCount = Number(packs) || 0;
    const perPack = Number(piecesPerPack) || 1;
    const loose = Number(loosePieces) || 0;
    const totalQuantity = packCount * perPack + loose;

    const newStock = new Stock({
      userId: activeShopId,
      productName,
      category: category || 'General',
      packs: packCount,
      piecesPerPack: perPack,
      loosePieces: loose,
      quantity: totalQuantity,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice),
      lowStockThreshold: Number(lowStockThreshold) || 5,
    });

    await newStock.save();

    res.status(201).json({
      success: true,
      message: 'Item added to stock successfully!',
      stockItem: newStock,
    });
  } catch (err) {
    console.error('Add Stock Error:', err);
    res.status(500).json({ success: false, message: 'Failed to add item to stock.' });
  }
});

// UPDATE STOCK ITEM (PUT /api/stock/:id)
app.put('/api/stock/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const { productName, category, packs, piecesPerPack, loosePieces, costPrice, sellingPrice, lowStockThreshold } = req.body;

    const packCount = Number(packs) || 0;
    const perPack = Number(piecesPerPack) || 1;
    const loose = Number(loosePieces) || 0;
    const totalQuantity = packCount * perPack + loose;

    const updatedStock = await Stock.findOneAndUpdate(
      { _id: req.params.id, userId: activeShopId },
      {
        productName,
        category,
        packs: packCount,
        piecesPerPack: perPack,
        loosePieces: loose,
        quantity: totalQuantity,
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice),
        lowStockThreshold: Number(lowStockThreshold) || 5,
      },
      { new: true }
    );

    if (!updatedStock) {
      return res.status(404).json({ success: false, message: 'Stock item not found or unauthorized.' });
    }

    res.status(200).json({
      success: true,
      message: 'Stock item updated successfully!',
      stockItem: updatedStock,
    });
  } catch (err) {
    console.error('Update Stock Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update stock item.' });
  }
});

// DELETE STOCK ITEM (DELETE /api/stock/:id)
app.delete('/api/stock/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const deletedStock = await Stock.findOneAndDelete({ _id: req.params.id, userId: activeShopId });

    if (!deletedStock) {
      return res.status(404).json({ success: false, message: 'Stock item not found or unauthorized.' });
    }

    res.status(200).json({
      success: true,
      message: 'Stock item deleted successfully!',
    });
  } catch (err) {
    console.error('Delete Stock Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete stock item.' });
  }
});

// ==========================================
// SALES ENDPOINTS
// ==========================================

app.post(['/api/sales', '/api/sales/add'], authenticateToken, async (req, res) => {
  const { items, discount, paymentMethod, saleDate } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one product item is required.' });
  }

  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    let calculatedSubtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice ?? item.itemPrice ?? item.price ?? item.sellingPrice) || 0;
      const itemTotal = qty * price;
      calculatedSubtotal += itemTotal;

      let isCustom = item.isCustomItem ?? true;

      if (item.stockId && item.stockId !== 'custom') {
        const stockItem = await Stock.findOne({ _id: item.stockId, userId: activeShopId });

        if (stockItem) {
          isCustom = false;
          stockItem.quantity = Math.max(0, stockItem.quantity - qty);

          if (stockItem.piecesPerPack > 0) {
            stockItem.packs = Math.floor(stockItem.quantity / stockItem.piecesPerPack);
            stockItem.loosePieces = stockItem.quantity % stockItem.piecesPerPack;
          }

          await stockItem.save();
        }
      }

      processedItems.push({
        stockId: isCustom ? null : item.stockId,
        productName: item.productName || item.name || 'Unknown Product',
        quantity: qty,
        unitPrice: price,
        itemTotal: itemTotal,
        isCustomItem: Boolean(isCustom),
      });
    }

    const disc = Number(discount) || 0;
    const safeSubtotal = Number(calculatedSubtotal) || 0;
    const totalAmount = Math.max(0, safeSubtotal - disc);

    const newSale = new Sale({
      shopId: activeShopId,
      soldBy: {
        userId: currentUser._id,
        fullName: currentUser.fullName,
        role: currentUser.role,
      },
      items: processedItems,
      subtotal: safeSubtotal,
      discount: disc,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod || 'Cash',
      saleDate: saleDate ? new Date(saleDate) : new Date(),
    });

    await newSale.save();

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully!',
      sale: newSale,
    });
  } catch (err) {
    console.error('Record Sale Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to process sale transaction.' });
  }
});

app.get('/api/sales', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const { startDate, endDate } = req.query;
    let queryFilter = { shopId: activeShopId };

    if (startDate || endDate) {
      queryFilter.saleDate = {};
      if (startDate) queryFilter.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queryFilter.saleDate.$lte = end;
      }
    }

    const sales = await Sale.find(queryFilter).sort({ saleDate: -1, createdAt: -1 });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaySales = sales.filter((s) => {
      const date = new Date(s.saleDate || s.createdAt);
      return date >= startOfToday && date <= endOfToday;
    });

    let todayTotalRevenue = 0;
    let transferTotal = 0;
    let cashTotal = 0;
    let posTotal = 0;

    todaySales.forEach((sale) => {
      const amount = Number(sale.totalAmount) || 0;
      todayTotalRevenue += amount;

      const method = (sale.paymentMethod || '').trim().toLowerCase();
      if (method === 'transfer') {
        transferTotal += amount;
      } else if (method === 'cash') {
        cashTotal += amount;
      } else if (method === 'pos') {
        posTotal += amount;
      }
    });

    const totalRevenue = sales.reduce((acc, sale) => acc + (Number(sale.totalAmount) || 0), 0);

    res.status(200).json({
      success: true,
      count: sales.length,
      totalRevenue,
      todayRevenue: todayTotalRevenue,
      todaySales: todayTotalRevenue,
      todayTransactionsCount: todaySales.length,
      todayTransactions: todaySales.length,
      transferTotal,
      cashTotal,
      posTotal,
      sales,
    });
  } catch (err) {
    console.error('Fetch Sales Error:', err);
    res.status(500).json({ success: false, message: 'Failed to load sales history.' });
  }
});

// Get Sales for Specific Staff Member
app.get('/api/sales/staff/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;
    const { userId } = req.params;

    const targetUserId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const staffSales = await Sale.find({
      shopId: activeShopId,
      $or: [
        { 'soldBy.userId': targetUserId },
        { 'soldBy.userId': userId }
      ]
    }).sort({ saleDate: -1, createdAt: -1 });

    const totalSales = staffSales.reduce((acc, sale) => acc + (Number(sale.totalAmount) || 0), 0);

    res.status(200).json({
      success: true,
      totalSales,
      count: staffSales.length,
      sales: staffSales,
    });
  } catch (err) {
    console.error('Fetch Staff Sales Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch staff sales.' });
  }
});

// ==========================================
// SUPPLY & EXPENSE ENDPOINTS
// ==========================================

app.get(['/api/supply', '/api/supplies'], authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const { startDate, endDate } = req.query;
    let filter = { shopId: activeShopId };

    if (startDate || endDate) {
      filter.supplyDate = {};
      if (startDate) filter.supplyDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.supplyDate.$lte = end;
      }
    }

    const supplies = await Supply.find(filter).sort({ supplyDate: -1, createdAt: -1 });
    const totalExpenditure = supplies.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);

    res.status(200).json({
      success: true,
      count: supplies.length,
      totalExpenditure,
      supplies,
    });
  } catch (err) {
    console.error('Fetch Supply Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch supply records.' });
  }
});

app.post(['/api/supply', '/api/supply/add'], authenticateToken, async (req, res) => {
  const { supplierName, itemName, stockId, quantity, costPrice, paymentStatus, supplyDate } = req.body;

  if (!supplierName || !itemName || quantity === undefined || costPrice === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Supplier name, item name, quantity, and cost price are required.',
    });
  }

  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const parsedQty = Number(quantity) || 0;
    const parsedPrice = Number(costPrice) || 0;
    const totalAmount = parsedQty * parsedPrice;

    if (stockId && stockId !== 'custom') {
      const existingStock = await Stock.findOne({ _id: stockId, userId: activeShopId });
      if (existingStock) {
        existingStock.quantity += parsedQty;

        if (existingStock.piecesPerPack > 0) {
          existingStock.packs = Math.floor(existingStock.quantity / existingStock.piecesPerPack);
          existingStock.loosePieces = existingStock.quantity % existingStock.piecesPerPack;
        }

        await existingStock.save();
      }
    }

    const newSupply = new Supply({
      shopId: activeShopId,
      stockId: stockId || null,
      supplierName: supplierName.trim(),
      itemName: itemName.trim(),
      quantity: parsedQty,
      costPrice: parsedPrice,
      totalAmount,
      paymentStatus: paymentStatus || 'Paid',
      supplyDate: supplyDate ? new Date(supplyDate) : new Date(),
      addedBy: {
        userId: currentUser._id,
        fullName: currentUser.fullName,
      },
    });

    await newSupply.save();

    res.status(201).json({
      success: true,
      message: 'Supply record added successfully!',
      supply: newSupply,
    });
  } catch (err) {
    console.error('Add Supply Error:', err);
    res.status(500).json({ success: false, message: 'Failed to record supply shipment.' });
  }
});

app.delete('/api/supply/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const deletedSupply = await Supply.findOneAndDelete({ _id: req.params.id, shopId: activeShopId });

    if (!deletedSupply) {
      return res.status(404).json({ success: false, message: 'Supply record not found or unauthorized.' });
    }

    res.status(200).json({
      success: true,
      message: 'Supply record removed successfully.',
    });
  } catch (err) {
    console.error('Delete Supply Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete supply record.' });
  }
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});