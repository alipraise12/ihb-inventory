const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware to capture Raw Body for Paystack HMAC SHA-512 Webhook Verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Enable CORS for React Frontend
app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Clear restricted Content Security Policy headers
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
      default: null,
    },
    trialStartDate: { type: Date, default: Date.now },
    isSubscribed: { type: Boolean, default: false },
    subscriptionDate: { type: Date, default: null },
    paystackReference: { type: String, default: null },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Stock Schema
// Stock Schema
const stockSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  productName: String,
  category: String,
  quantity: Number,
  unit: String,
  costPrice: Number,
  sellingPrice: Number,
  lowStockThreshold: Number,
  isVerified: { type: Boolean, default: false } // 👈 CRITICAL: Add this to your schema!
}, { timestamps: true });

const Stock = mongoose.model('Stock', stockSchema);



// Audit History Schema
const auditLogSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['DELETE', 'EDIT', 'ADD'], required: true },
    productName: { type: String, required: true },
    description: { type: String, default: '' },
    auditedBy: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

// Sale Schema
const saleItemSchema = new mongoose.Schema({
  stockId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', default: null },
  productName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
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

// Account / Virtual Bank Schema
const userAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    accountName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String, default: 'Wema Bank' },
    customerCode: { type: String },
    transferPin: { type: String, required: true },
    balance: { type: Number, default: 0 },
    isPhoneVerified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const UserAccount = mongoose.models.UserAccount || mongoose.model('UserAccount', userAccountSchema);

// Transaction History Schema
// Transaction History Schema
const transactionSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    category: { type: String, default: 'Direct Payment' },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: 'Successful' },
    senderName: { type: String, default: 'IHB Business Account' },
    recipientName: { type: String, default: '' },
    recipientAccount: { type: String, default: '' },
    bankName: { type: String, default: '' },
    transferType: { type: String, enum: ['stock', 'ordinary', 'internal_ihb', 'cash_pos_other'], default: 'ordinary' }, // 👈 Added internal_ihb and cash_pos_other here
    remark: { type: String, default: 'Business Settlement' },
    transactionNo: { type: String, required: true },
    sessionId: { type: String, required: true },
    paystackReference: { type: String, default: '' },
    stockItems: [
      {
        productName: String,
        quantity: Number,
        costPrice: Number,
      },
    ],
  },
  { timestamps: true }
);

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// In-memory OTP store
const otpStore = new Map();

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
// PAYSTACK WEBHOOK LISTENER
// ==========================================
app.post('/api/paystack/webhook', async (req, res) => {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      console.error('Webhook Error: PAYSTACK_SECRET_KEY missing in .env');
      return res.status(500).send('Secret key missing');
    }

    const signature = req.headers['x-paystack-signature'];
    const calculatedSignature = crypto
      .createHmac('sha512', paystackSecret)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest('hex');

    if (signature !== calculatedSignature) {
      console.warn('⚠️ Invalid Paystack Webhook Signature Received');
      return res.status(400).send('Invalid signature');
    }

    res.sendStatus(200);

    const event = req.body;
    console.log(`🔔 Paystack Event Received: ${event.event}`);

    if (
      event.event === 'charge.success' || 
      event.event === 'customerdedicatedaccount.success' || 
      event.event === 'dedicatedaccount.assign.success'
    ) {
      const data = event.data;
      const customerCode = data.customer?.customer_code;
      const amountInNaira = (data.amount || 0) / 100;

      if (customerCode) {
        const userAccount = await UserAccount.findOne({ customerCode });
        if (userAccount) {
          const existingTx = await Transaction.findOne({ paystackReference: data.reference });
          if (!existingTx) {
            userAccount.balance += amountInNaira;
            await userAccount.save();

            const generatedTxNo = `26${Date.now().toString().slice(-12)}${Math.floor(1000 + Math.random() * 9000)}`;
            const generatedSessionId = `10000426${Date.now().toString().slice(-10)}${Math.floor(100000 + Math.random() * 900000)}`;

            await Transaction.create({
              shopId: userAccount.userId,
              type: 'credit',
              category: 'Bank Deposit',
              title: `Bank Deposit from ${data.authorization?.sender_name || 'External Sender'}`,
              amount: amountInNaira,
              status: 'Successful',
              senderName: data.authorization?.sender_name || 'External Sender',
              recipientName: userAccount.accountName,
              recipientAccount: userAccount.accountNumber,
              bankName: userAccount.bankName,
              transferType: 'ordinary',
              remark: 'Inbound DVA Deposit',
              transactionNo: generatedTxNo,
              sessionId: generatedSessionId,
              paystackReference: data.reference,
            });

            console.log(`✅ Balance successfully credited: +₦${amountInNaira} for ${userAccount.accountName}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Paystack Webhook Processing Error:', err.message);
  }
});

// ==========================================
// AUTHENTICATION & OTP ENDPOINTS
// ==========================================

app.post('/api/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

  try {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email.toLowerCase(), { code: verificationCode, expiresAt: Date.now() + 600000 });

    try {
      await resend.emails.send({
        from: 'onboarding@pjcreativehouse.com',
        to: [email.toLowerCase()],
        subject: 'Your Verification Code - IHB Inventory',
        html: `<h3>Your code is: <b>${verificationCode}</b></h3>`,
      });
    } catch (e) {
      console.warn('Resend mail error:', e.message);
    }

    res.status(200).json({ success: true, message: 'Verification code sent successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.post('/api/verify-code', (req, res) => {
  const { email, code } = req.body;
  const stored = otpStore.get(email?.toLowerCase());
  if (!stored || stored.code !== code?.trim()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
  }
  otpStore.delete(email.toLowerCase());
  res.status(200).json({ success: true, message: 'Email verified successfully!' });
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_fallback_secret_key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        shopId: user.shopId,
      },
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});


// ==========================================
// REGISTRATION ENDPOINT
// ==========================================
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, role, shopId } = req.body;

    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role: role || 'owner',
      shopId: shopId || null,
    });

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, role: newUser.role },
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
        phone: newUser.phone,
        role: newUser.role,
        shopId: newUser.shopId,
      },
    });
  } catch (err) {
    console.error('Registration Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});
// FORGOT PASSWORD ENDPOINT
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ success: true, message: 'If this email exists, a password reset code has been sent.' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    otpStore.set(`reset_${email.toLowerCase()}`, { code: verificationCode, expiresAt: Date.now() + 900000 });

    try {
      await resend.emails.send({
        from: 'onboarding@pjcreativehouse.com',
        to: [email.toLowerCase()],
        subject: 'Password Reset Code - IHB Inventory',
        html: `<h3>Your password reset code is: <b>${verificationCode}</b></h3>`,
      });
    } catch (e) {
      console.warn('Resend mail error:', e.message);
    }

    res.status(200).json({ success: true, message: 'Password reset code sent successfully!' });
  } catch (err) {
    console.error('Forgot Password Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error processing password reset.' });
  }
});

// RESET PASSWORD ENDPOINT
app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, code, and new password are required.' });
  }

  try {
    const stored = otpStore.get(`reset_${email.toLowerCase()}`);
    if (!stored || stored.code !== code.trim() || stored.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    otpStore.delete(`reset_${email.toLowerCase()}`);

    res.status(200).json({ success: true, message: 'Password reset successfully!' });
  } catch (err) {
    console.error('Reset Password Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error updating password.' });
  }
});

// ==========================================
// BANK LIST & LIVE ACCOUNT RESOLUTION ENDPOINTS
// ==========================================

app.get('/api/banks', authenticateToken, async (req, res) => {
  try {
    let banks = [
      { name: 'Access Bank', code: '044' },
      { name: 'Guaranty Trust Bank (GTB)', code: '058' },
      { name: 'First Bank of Nigeria', code: '011' },
      { name: 'Zenith Bank', code: '057' },
      { name: 'United Bank for Africa (UBA)', code: '033' },
      { name: 'OPay Digital Services Limited', code: '999992' },
      { name: 'Moniepoint MFB', code: '50515' },
      { name: 'Kuda Bank', code: '50211' },
      { name: 'Wema Bank', code: '035' },
    ];

    if (process.env.PAYSTACK_SECRET_KEY) {
      try {
        const response = await axios.get('https://api.paystack.co/bank', {
          headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        });
        if (response.data && response.data.data) {
          banks = response.data.data.map(b => ({ name: b.name, code: b.code }));
        }
      } catch (paystackErr) {
        console.warn('Paystack live bank fetch fallback used:', paystackErr.message);
      }
    }

    res.status(200).json({ success: true, banks });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch banks.' });
  }
});

app.post('/api/resolve-account', authenticateToken, async (req, res) => {
  const { accountNumber, bankCode } = req.body;

  if (!accountNumber || !bankCode || accountNumber.length !== 10) {
    return res.status(400).json({ success: false, message: 'Valid 10-digit account number and bank code required.' });
  }

  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return res.status(500).json({ success: false, message: 'Paystack Secret Key is missing.' });
    }

    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      { headers: { Authorization: `Bearer ${paystackSecret}` } }
    );

    if (response.data && response.data.status && response.data.data) {
      return res.status(200).json({
        success: true,
        accountName: response.data.data.account_name,
      });
    }

    res.status(400).json({ success: false, message: 'Could not resolve account name.' });
  } catch (err) {
    console.error('Resolution Error:', err.response?.data || err.message);
    res.status(400).json({ success: false, message: err.response?.data?.message || 'Invalid account details.' });
  }
});

// ==========================================
// VIRTUAL ACCOUNT & TRANSFER ENDPOINTS
// ==========================================

app.get('/api/account/details', authenticateToken, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  try {
    const account = await UserAccount.findOne({ userId });
    if (!account) {
      return res.status(200).json({ success: true, hasAccount: false });
    }
    res.status(200).json({ success: true, hasAccount: true, account });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch account details.' });
  }
});

app.post('/api/account/create', authenticateToken, async (req, res) => {
  const { accountName, phoneNumber, transferPin } = req.body;
  const userId = req.user.userId || req.user.id;

  if (!accountName || !phoneNumber || !transferPin) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let existingAccount = await UserAccount.findOne({ userId });
    if (existingAccount) {
      return res.status(400).json({ success: false, message: 'Business account already generated.' });
    }

    const nameParts = accountName.trim().split(' ');
    const firstName = nameParts[0] || 'Business';
    const lastName = nameParts.slice(1).join(' ') || 'Owner';

    // Format phone number to international format required by Paystack
    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+234' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+234' + formattedPhone;
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return res.status(500).json({ success: false, message: 'Paystack Secret Key is missing in .env.' });
    }

    const preferredBank = paystackSecret.startsWith('sk_test_') ? 'test-bank' : 'wema-bank';

    // STEP 1: Create or fetch the customer profile on Paystack first to get a valid customer_code
    const customerRes = await axios.post(
      'https://api.paystack.co/customer',
      {
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        phone: formattedPhone,
      },
      {
        headers: { Authorization: `Bearer ${paystackSecret}` },
      }
    );

    const customerCode = customerRes.data?.data?.customer_code;
    if (!customerCode) {
      return res.status(400).json({ success: false, message: 'Failed to generate customer profile with Paystack.' });
    }

    // STEP 2: Provision Dedicated Virtual Account using the valid customer_code
    const dvaRes = await axios.post(
      'https://api.paystack.co/dedicated_account',
      {
        customer: customerCode, // 👈 Paystack live API expects the customer code here
        preferred_bank: preferredBank,
        country: 'NG',
      },
      {
        headers: { Authorization: `Bearer ${paystackSecret}` },
      }
    );

    const paystackAccountNumber = dvaRes.data.data.account_number;
    const bankName = dvaRes.data.data.bank.name;

    const hashedPin = await bcrypt.hash(transferPin.trim(), 10);

    const newAccount = new UserAccount({
      userId,
      accountName: accountName.trim(),
      phoneNumber: phoneNumber.trim(),
      accountNumber: paystackAccountNumber,
      bankName: bankName,
      customerCode: customerCode,
      transferPin: hashedPin,
      balance: 0,
      isPhoneVerified: true,
    });

    await newAccount.save();

    res.status(201).json({
      success: true,
      message: 'Business account generated successfully!',
      account: {
        accountNumber: paystackAccountNumber,
        bankName: bankName,
      },
    });
  } catch (err) {
    console.error('Create Account Paystack Error:', err.response?.data || err.message);
    const errorMsg = err.response?.data?.message || 'Failed to generate real virtual account with Paystack.';
    res.status(400).json({ success: false, message: errorMsg });
  }
});



app.post('/api/transfer', authenticateToken, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const { amount, pin, transferType, stockItems, recipientAccount, bankCode, remarks } = req.body;

  const isManualOffline = transferType === 'cash_pos_other';

  if (!amount || (!isManualOffline && (!pin || !recipientAccount || !bankCode))) {
    return res.status(400).json({ success: false, message: 'Amount, PIN, Account Number, and Bank Code are required.' });
  }

  try {
    const userAccount = await UserAccount.findOne({ userId });
    if (!userAccount) return res.status(404).json({ success: false, message: 'Account not found.' });

    const transferAmount = Number(amount) || 0;

    // Skip PIN and balance checks for manual offline cash/pos/other bank transactions
    if (!isManualOffline) {
      const isPinValid = await bcrypt.compare(pin.trim(), userAccount.transferPin);
      if (!isPinValid) {
        return res.status(400).json({ success: false, message: 'Invalid Transaction PIN.' });
      }

      if (userAccount.balance < transferAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance! Available: ₦${userAccount.balance.toLocaleString()}, Required: ₦${transferAmount.toLocaleString()}`,
        });
      }
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    let paystackReference = isManualOffline ? `manual_${Date.now()}` : `trf_${Date.now()}`;
    let resolvedBeneficiaryName = isManualOffline ? 'Cash / POS / Other Bank' : 'Beneficiary';

    if (paystackSecret && !isManualOffline) {
      try {
        const resolveRes = await axios.get(
          `https://api.paystack.co/bank/resolve?account_number=${recipientAccount}&bank_code=${bankCode}`,
          { headers: { Authorization: `Bearer ${paystackSecret}` } }
        );
        if (resolveRes.data?.data?.account_name) {
          resolvedBeneficiaryName = resolveRes.data.data.account_name;
        }

        const recipientRes = await axios.post(
          'https://api.paystack.co/transferrecipient',
          {
            type: 'nuban',
            name: resolvedBeneficiaryName,
            account_number: recipientAccount,
            bank_code: bankCode,
            currency: 'NGN',
          },
          { headers: { Authorization: `Bearer ${paystackSecret}` } }
        );

        const recipientCode = recipientRes.data.data.recipient_code;
        const amountInKobo = transferAmount * 100;

        const transferRes = await axios.post(
          'https://api.paystack.co/transfer',
          {
            source: 'balance',
            amount: amountInKobo,
            recipient: recipientCode,
            reason: transferType === 'stock' ? 'Stock Purchase Settlement' : (remarks || 'Direct Transfer'),
            reference: paystackReference,
          },
          { headers: { Authorization: `Bearer ${paystackSecret}` } }
        );

        if (transferRes.data && transferRes.data.data) {
          paystackReference = transferRes.data.data.reference || paystackReference;
        }
      } catch (paystackTransferErr) {
        console.warn('Paystack Transfer API Notice:', paystackTransferErr.response?.data?.message || paystackTransferErr.message);
      }
    }

    // Only deduct balance if it's an automated digital transfer
    if (!isManualOffline) {
      userAccount.balance -= transferAmount;
      await userAccount.save();
    }

    const currentUser = await User.findById(userId);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

if ((transferType === 'stock' || transferType === 'cash_pos_other') && stockItems && Array.isArray(stockItems)) {
  for (const item of stockItems) {
    if (item.productName && item.productName.trim() !== '') {
      await Stock.create({
        userId: activeShopId,
        productName: item.productName.trim(),
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'units',
        costPrice: Number(item.costPrice) || 0,
        sellingPrice: 0,         // Set to 0 so you determine it in pending stock
        category: 'Supplies',
        isVerified: false,       // 👈 Forces it into Pending Supply / Incoming
      });
    }
  }
}

    const generatedTxNo = `26${Date.now().toString().slice(-12)}${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedSessionId = `10000426${Date.now().toString().slice(-10)}${Math.floor(100000 + Math.random() * 900000)}`;

    await Transaction.create({
      shopId: activeShopId,
      type: isManualOffline ? 'credit' : 'debit',
      category: transferType === 'stock' ? 'Stock Purchase' : (transferType === 'cash_pos_other' ? 'Cash / POS / Other Bank Purchase' : 'Direct Payment'),
      title: transferType === 'stock' ? `Stock Purchase (${stockItems?.length || 1} items)` : (transferType === 'cash_pos_other' ? `Manual Stock Purchase (${stockItems?.length || 1} items)` : `Transfer to ${resolvedBeneficiaryName}`),
      amount: transferAmount,
      status: 'Successful',
      senderName: userAccount.accountName,
      recipientName: resolvedBeneficiaryName,
      recipientAccount: recipientAccount || 'CASH_POS_OTHER',
      bankName: bankCode || 'Manual Cash/POS',
      transferType: transferType,
      remark: remarks || (transferType === 'stock' ? 'Inventory Stock Restock' : (transferType === 'cash_pos_other' ? 'Cash / POS / Other Bank Restock' : 'Direct Business Transfer')),
      transactionNo: generatedTxNo,
      sessionId: generatedSessionId,
      paystackReference: paystackReference,
      stockItems: (transferType === 'stock' || transferType === 'cash_pos_other') ? stockItems : [],
    });

    res.status(200).json({ 
      success: true, 
      message: isManualOffline ? 'Stock added successfully & receipt generated!' : 'Transfer completed successfully!', 
      newBalance: userAccount.balance 
    });
  } catch (err) {
    console.error('Transfer Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error processing transfer.' });
  }
});


app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const transactions = await Transaction.find({ shopId: activeShopId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch transaction history.' });
  }
});

// ==========================================
// STOCK & SALES ENDPOINTS
// ==========================================

app.get('/api/stock', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    // $ne: false grabs items that are verified OR old items without the flag yet
    const stockItems = await Stock.find({ userId: activeShopId, isVerified: { $ne: false } }).sort({ createdAt: -1 });
    const totalUnits = stockItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

    res.status(200).json({ success: true, count: stockItems.length, totalUnits, stock: stockItems });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stock.' });
  }
});


app.post('/api/stock/add', authenticateToken, async (req, res) => {
  try {
    const { productName, category, quantity, unit, costPrice, sellingPrice, lowStockThreshold } = req.body;
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const newItem = new Stock({
      userId: activeShopId,
      productName,
      category: category || 'General',
      quantity: Number(quantity) || 0,
      unit: unit || 'units',
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 5,
      isVerified: true // 👈 DIRECT ADD: Goes straight to the warehouse!
    });

    await newItem.save();
    res.status(200).json({ success: true, message: 'Product added to stock successfully!', stockItem: newItem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add product.' });
  }
});

app.put('/api/stock/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;
    const { productName, category, costPrice, sellingPrice, quantity, unit } = req.body;

    const updatedItem = await Stock.findOneAndUpdate(
      { _id: req.params.id, userId: activeShopId },
      {
        productName,
        category: category || 'General',
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        quantity: Number(quantity) || 0,
        unit: unit || 'units',
      },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Stock item not found.' });
    }

    await AuditLog.create({
      shopId: activeShopId,
      action: 'EDIT',
      productName: productName || updatedItem.productName,
      description: `Updated stock details`,
      auditedBy: currentUser.fullName,
    });

    res.status(200).json({ success: true, message: 'Stock updated successfully!', stockItem: updatedItem });
  } catch (err) {
    console.error('Stock Update Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update stock.' });
  }
});

app.delete('/api/stock/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const deletedItem = await Stock.findOneAndDelete({
      _id: req.params.id,
      userId: activeShopId,
    });

    if (!deletedItem) {
      return res.status(404).json({ success: false, message: 'Stock item not found.' });
    }

    await AuditLog.create({
      shopId: activeShopId,
      action: 'DELETE',
      productName: deletedItem.productName,
      description: `Deleted product from stock`,
      auditedBy: currentUser.fullName,
    });

    res.status(200).json({ success: true, message: 'Stock item deleted successfully!' });
  } catch (err) {
    console.error('Stock Delete Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete stock item.' });
  }
});

app.get('/api/sales', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const sales = await Sale.find({ shopId: activeShopId }).sort({ createdAt: -1 });
    const totalSalesAmount = sales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);

    // Calculate today's metrics
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaySalesList = sales.filter(s => new Date(s.saleDate || s.createdAt) >= startOfDay);
    const todayRevenue = todaySalesList.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
    const todayTransactions = todaySalesList.length;

    res.status(200).json({ 
      success: true, 
      count: sales.length, 
      totalSalesAmount, 
      todayRevenue,
      todayTransactions,
      sales 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch sales.' });
  }
});

app.post(['/api/sales/add', '/api/sales'], authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;
    const { items, subtotal, discount, totalAmount, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in sale.' });
    }

    for (const item of items) {
      if (item.stockId) {
        await Stock.findOneAndUpdate(
          { _id: item.stockId, userId: activeShopId },
          { $inc: { quantity: -Number(item.quantity) } }
        );
      }
    }

    const newSale = await Sale.create({
      shopId: activeShopId,
      soldBy: {
        userId: currentUser._id,
        fullName: currentUser.fullName,
        role: currentUser.role,
      },
      items,
      subtotal: Number(subtotal) || 0,
      discount: Number(discount) || 0,
      totalAmount: Number(totalAmount) || 0,
      paymentMethod: paymentMethod || 'Cash',
    });

    res.status(201).json({ success: true, message: 'Sale recorded successfully!', sale: newSale });
  } catch (err) {
    console.error('Sales Processing Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error while processing sale transaction.' });
  }
});

app.get(['/api/audit-history', '/api/stock/audit'], authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const logs = await AuditLog.find({ shopId: activeShopId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit history.' });
  }
});

// ==========================================
// STAFF MANAGEMENT ENDPOINTS
// ==========================================

app.get(['/api/staff/list', '/api/staff'], authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const shopOwnerId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const staffMembers = await User.find({ shopId: shopOwnerId, role: 'staff' }, '-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: staffMembers.length,
      staff: staffMembers,
      staffMembers: staffMembers,
    });
  } catch (err) {
    console.error('Fetch Staff Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch staff members.' });
  }
});

app.post(['/api/staff/create', '/api/staff/add', '/api/staff'], authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    if (currentUser.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only shop owners can register staff accounts.' });
    }

    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = await User.create({
      fullName,
      email: email.toLowerCase(),
      phone: phone || '',
      password: hashedPassword,
      role: 'staff',
      shopId: currentUser._id,
    });

    res.status(201).json({ success: true, message: 'Staff member created successfully!', staff: newStaff });
  } catch (err) {
    console.error('Create Staff Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create staff member.' });
  }
});

// EDIT STAFF MEMBER
app.put('/api/staff/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    if (currentUser.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only shop owners can update staff accounts.' });
    }

    const { fullName, phone, password } = req.body;
    const updateData = { fullName, phone };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedStaff = await User.findOneAndUpdate(
      { _id: req.params.id, shopId: currentUser._id, role: 'staff' },
      updateData,
      { new: true, select: '-password' }
    );

    if (!updatedStaff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    res.status(200).json({ success: true, message: 'Staff member updated successfully!', staff: updatedStaff });
  } catch (err) {
    console.error('Update Staff Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update staff member.' });
  }
});

// DELETE STAFF MEMBER
app.delete('/api/staff/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    if (currentUser.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only shop owners can delete staff accounts.' });
    }

    const deletedStaff = await User.findOneAndDelete({
      _id: req.params.id,
      shopId: currentUser._id,
      role: 'staff',
    });

    if (!deletedStaff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    res.status(200).json({ success: true, message: 'Staff member deleted successfully!' });
  } catch (err) {
    console.error('Delete Staff Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete staff member.' });
  }
});

app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user.id, '-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



// 1. Get Pending Stock (Incoming from Supply)
app.get('/api/stock/pending', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId || req.user.id);
    const activeShopId = currentUser.role === 'staff' ? currentUser.shopId : currentUser._id;

    const pendingItems = await Stock.find({ userId: activeShopId, isVerified: false }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, pendingItems });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending stock.' });
  }
});

// 2. Verify Single Stock Item (Move to Active Warehouse)
app.put('/api/stock/verify/:id', authenticateToken, async (req, res) => {
  try {
    const { sellingPrice } = req.body;
    const updateData = { isVerified: true };
    if (sellingPrice !== undefined) updateData.sellingPrice = Number(sellingPrice);

    const updatedItem = await Stock.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.status(200).json({ success: true, message: 'Stock verified successfully!', item: updatedItem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to verify stock item.' });
  }
});

// 3. Verify Multiple / Bulk Stock Items
app.post('/api/stock/verify-bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body; // Array of stock IDs
    if (!ids || !ids.length) {
      return res.status(400).json({ success: false, message: 'No items selected for verification.' });
    }

    await Stock.updateMany({ _id: { $in: ids } }, { $set: { isVerified: true } });
    res.status(200).json({ success: true, message: 'Selected items verified successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to bulk verify stock items.' });
  }
});