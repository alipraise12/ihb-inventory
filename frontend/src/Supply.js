import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';

// Helper function to format numbers with commas
const formatNumberWithCommas = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const cleanNum = String(value).replace(/,/g, '');
  if (isNaN(cleanNum)) return value;
  const parts = cleanNum.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const parseFormattedNumber = (value) => {
  if (!value) return '';
  return String(value).replace(/,/g, '');
};

// Custom Searchable / Clean Dropdown for Payment Purpose
const CustomPaymentPurposeSelect = ({ transferType, setTransferType, setAmount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 'stock', label: 'Payment for Stock Purchase (Auto-add)' },
    { value: 'ordinary', label: 'Ordinary Payment / Direct Transfer' },
    { value: 'cash_pos_other', label: 'Cash / Transfer from Other Bank / POS' }
  ];

  const selectedOption = options.find(o => o.value === transferType) || options[0];

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          border: '1px solid #cbd5e1',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          padding: '10px 12px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold',
          color: '#0f172a',
          fontSize: '0.85rem'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
          {selectedOption.label}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#64748b', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '105%',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            zIndex: 1200,
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                setTransferType(opt.value);
                if (opt.value === 'ordinary') setAmount('');
                setIsOpen(false);
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: transferType === opt.value ? '700' : '500',
                color: transferType === opt.value ? '#4f46e5' : '#1e293b',
                backgroundColor: transferType === opt.value ? 'rgba(99, 102, 241, 0.1)' : 'transparent'
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Supply = () => {
  const [userAccount, setUserAccount] = useState(null);
  const [showBalance, setShowBalance] = useState(true);
  const [userData, setUserData] = useState(null);
  
  // Transfer & History States
  const [transferModalMode, setTransferModalMode] = useState(null);
  const [showBankListModal, setShowBankListModal] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');

  // Transfer Form Fields & Bank List
  const [banksList, setBanksList] = useState([]);
  const [recipientBankCode, setRecipientBankCode] = useState('');
  const [recipientBankName, setRecipientBankName] = useState('Select Bank');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [resolvedAccountName, setResolvedAccountName] = useState('');
  const [detectedBankName, setDetectedBankName] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentPinInput, setPaymentPinInput] = useState('');
  const [transferType, setTransferType] = useState('stock');

  // Dynamic Stock Items List for Stock Purchases (Updated with unit & customUnit)
  const [stockItems, setStockItems] = useState([
    { productName: '', quantity: 1, unit: 'units', customUnit: '', costPrice: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const showAlert = (message, type = 'error') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: '' });
    }, 4000);
  };

  const fetchAccountDetails = useCallback(async () => {
    try {
      const [accountRes, userRes] = await Promise.all([
        fetch('http://localhost:5000/api/account/details', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5000/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      const data = await accountRes.json();
      const userDataJson = await userRes.json();

      if (userDataJson.success) {
        setUserData(userDataJson.user);
      }

      if (data.success && data.hasAccount) {
        setUserAccount(data.account);
      } else {
        navigate('/create-account');
      }
    } catch (err) {
      console.error('Error loading account details:', err);
    }
  }, [token, navigate]);

  const fetchBanks = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/api/banks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBanksList(data.banks);
      }
    } catch (err) {
      console.error('Error loading banks:', err);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAccountDetails();
    fetchBanks();
  }, [token, navigate, fetchAccountDetails, fetchBanks]);

  // Live NIBSS Account Resolution
  useEffect(() => {
    const resolveAccount = async () => {
      if (transferModalMode === 'ihb' || transferType === 'cash_pos_other') return;

      if (recipientAccount.length === 10 && recipientBankCode) {
        setIsResolving(true);
        setResolvedAccountName('');
        
        try {
          const res = await fetch('http://localhost:5000/api/resolve-account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ accountNumber: recipientAccount, bankCode: recipientBankCode }),
          });
          const data = await res.json();
          if (data.success) {
            setResolvedAccountName(data.accountName);
            const matchedBank = banksList.find(b => b.code === recipientBankCode);
            if (matchedBank) setDetectedBankName(matchedBank.name);
          } else {
            showAlert(data.message || 'Could not verify account name.');
          }
        } catch (err) {
          showAlert('Network error resolving account.');
        } finally {
          setIsResolving(false);
        }
      } else {
        setResolvedAccountName('');
        setDetectedBankName('');
      }
    };

    resolveAccount();
  }, [recipientAccount, recipientBankCode, banksList, token, transferModalMode, transferType]);

  // Automatic calculation for stock items
  useEffect(() => {
    if (transferType === 'stock' || transferType === 'cash_pos_other') {
      const total = stockItems.reduce((acc, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(parseFormattedNumber(item.costPrice)) || 0;
        return acc + (qty * price);
      }, 0);
      setAmount(total > 0 ? total : '');
    }
  }, [stockItems, transferType]);

  const handleAddStockRow = () => {
    setStockItems([...stockItems, { productName: '', quantity: 1, unit: 'units', customUnit: '', costPrice: '' }]);
  };

  const handleRemoveStockRow = (index) => {
    const updated = stockItems.filter((_, i) => i !== index);
    setStockItems(updated.length ? updated : [{ productName: '', quantity: 1, unit: 'units', customUnit: '', costPrice: '' }]);
  };

  const handleStockItemChange = (index, field, value) => {
    const updated = [...stockItems];
    if (field === 'costPrice') {
      const rawVal = parseFormattedNumber(value);
      updated[index][field] = rawVal === '' ? '' : formatNumberWithCommas(rawVal);
    } else {
      updated[index][field] = value;
    }
    setStockItems(updated);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isManualOffline = transferType === 'cash_pos_other' && transferModalMode !== 'ihb';
      
      const payload = {
        amount: Number(parseFormattedNumber(amount)),
        pin: isManualOffline ? '0000' : paymentPinInput,
        recipientAccount: isManualOffline ? 'CASH_POS_OTHER' : recipientAccount,
        bankCode: transferModalMode === 'ihb' ? 'IHB_INTERNAL' : (isManualOffline ? 'MANUAL_CASH_POS' : recipientBankCode),
        transferType: transferModalMode === 'ihb' ? 'internal_ihb' : transferType,
        remarks,
        stockItems: (transferType === 'stock' || transferType === 'cash_pos_other') && transferModalMode !== 'ihb' ? stockItems.map(item => ({
          ...item,
          quantity: Number(parseFormattedNumber(item.quantity)),
          unit: item.unit === 'other' ? (item.customUnit.trim() || 'units') : item.unit,
          costPrice: Number(parseFormattedNumber(item.costPrice))
        })) : [],
      };

      const response = await fetch('http://localhost:5000/api/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        showAlert(data.message || 'Transfer/Transaction failed.', 'error');
        setLoading(false);
        return;
      }

      showAlert(
        (transferType === 'stock' || transferType === 'cash_pos_other') && transferModalMode !== 'ihb'
          ? 'Saved successfully, stock items added to inventory, & receipt generated!'
          : 'Transfer completed successfully!',
        'success'
      );

      fetchAccountDetails();
      setTransferModalMode(null);
      setAmount('');
      setRemarks('');
      setRecipientAccount('');
      setRecipientBankCode('');
      setRecipientBankName('Select Bank');
      setResolvedAccountName('');
      setDetectedBankName('');
      setPaymentPinInput('');
      setStockItems([{ productName: '', quantity: 1, unit: 'units', customUnit: '', costPrice: '' }]);
    } catch (err) {
      showAlert('Network error completing transaction.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showAlert('Account number copied to clipboard!', 'success');
  };

  const filteredBanks = banksList.filter(b => 
    b.name.toLowerCase().includes(bankSearchQuery.toLowerCase())
  );

  const inputBorderStyle = {
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    outline: 'none',
  };

  if (!userAccount) return null;

  return (
    <div className="inventory-layout" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Unified Responsive Navigation Bar with Hamburger Toggle */}
      <Navbar userData={userData} />

      <div className="container" style={{ maxWidth: '850px', paddingTop: '24px', paddingBottom: '40px', width: '94%', margin: '0 auto' }}>
        {alert.show && (
          <div className={`custom-alert ${alert.type === 'success' ? 'success' : ''}`}>
            {alert.message}
          </div>
        )}

        {/* Balance Card */}
        <div style={{ background: 'linear-gradient(135deg, #312e81, #4f46e5)', borderRadius: '16px', padding: '24px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.3)', marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.95rem', opacity: 0.9, fontWeight: 500 }}>Available Balance</span>
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
            >
              {showBalance ? 'Hide Balance' : 'Show Balance'}
            </button>
          </div>
          <h1 style={{ fontSize: '2.5rem', margin: '12px 0 8px', fontWeight: 'bold', letterSpacing: '-1px' }}>
            {showBalance ? `₦${(userAccount.balance || 0).toLocaleString()}` : '••••••••'}
          </h1>
          <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>
            Settlement Account: <strong style={{ color: '#fff' }}>{userAccount.accountName}</strong>
          </div>
        </div>

        {/* Action Quick Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '25px' }}>
          <div
            onClick={() => {
              setTransferModalMode('ihb');
              setRecipientBankCode('IHB_INTERNAL');
              setRecipientBankName('IHB Inventory Internal');
            }}
            style={{ background: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
          >
            <div style={{ background: '#e0e7ff', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', color: '#4f46e5', flexShrink: 0 }}>
              🏢
            </div>
            <div>
              <h4 style={{ margin: '0 0 2px', color: '#0f172a', fontSize: '0.95rem' }}>To IHB Business</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>Internal transfer</p>
            </div>
          </div>

          <div
            onClick={() => {
              setTransferModalMode('other');
              setRecipientBankCode('');
              setRecipientBankName('Select Bank');
            }}
            style={{ background: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
          >
            <div style={{ background: '#ede9fe', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', color: '#7c3aed', flexShrink: 0 }}>
              🏦
            </div>
            <div>
              <h4 style={{ margin: '0 0 2px', color: '#0f172a', fontSize: '0.95rem' }}>To Bank</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>Send to any bank</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/transactions')}
            style={{ background: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
          >
            <div style={{ background: '#fef3c7', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', color: '#d97706', flexShrink: 0 }}>
              📄
            </div>
            <div>
              <h4 style={{ margin: '0 0 2px', color: '#0f172a', fontSize: '0.95rem' }}>History</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>View transactions</p>
            </div>
          </div>
        </div>

        {/* Settlement Account Card */}
        <div className="auth-container" style={{ maxWidth: '100%', background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', marginBottom: '25px', margin: 0 }}>
          <h3 style={{ marginBottom: '16px', color: '#0f172a', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💳</span> Dedicated Settlement Account
          </h3>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Account Name</label>
            <input type="text" className="form-input" value={userAccount.accountName || ''} disabled style={{ backgroundColor: '#f8fafc', fontWeight: 600, padding: '10px 14px' }} />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Bank Name</label>
            <input type="text" className="form-input" value={userAccount.bankName} disabled style={{ backgroundColor: '#f8fafc', fontWeight: 600, padding: '10px 14px' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Account Number</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input type="text" className="form-input" value={userAccount.accountNumber} disabled style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '1.05rem', backgroundColor: '#f8fafc', flex: 1, minWidth: '180px', padding: '10px 14px' }} />
              <button
                type="button"
                onClick={() => copyToClipboard(userAccount.accountNumber)}
                className="submit-btn"
                style={{ width: 'auto', padding: '0 20px', background: '#4f46e5', borderRadius: '8px' }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* ================= TRANSFER MODAL ================= */}
        {transferModalMode && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' }}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', position: 'sticky', top: 0, zIndex: 10 }}>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 2px' }}>
                    {transferModalMode === 'ihb' ? 'IHB Business Transfer' : 'Bank Transfer'}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>Secure financial settlement gateway</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setTransferModalMode(null)} 
                  style={{ background: '#e2e8f0', border: 'none', width: '26px', height: '26px', borderRadius: '50%', fontSize: '0.85rem', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '16px' }}>
                <form onSubmit={handleTransferSubmit}>
                  
                  {/* Custom Payment Purpose Dropdown (Only for regular bank transfers) */}
                  {transferModalMode !== 'ihb' && (
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px', display: 'block' }}>Payment Purpose</label>
                      <CustomPaymentPurposeSelect
                        transferType={transferType}
                        setTransferType={setTransferType}
                        setAmount={setAmount}
                      />
                    </div>
                  )}

                  {/* Recipient Account Field (Hidden if Cash / POS / Other Bank selected) */}
                  {!(transferType === 'cash_pos_other' && transferModalMode !== 'ihb') && (
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px', display: 'block' }}>
                        {transferModalMode === 'ihb' ? 'IHB Created Account Number' : 'Recipient Account Number'} <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter 10-digit account number"
                        maxLength="10"
                        value={recipientAccount}
                        onChange={(e) => setRecipientAccount(e.target.value)}
                        style={{ ...inputBorderStyle, padding: '9px 10px', fontSize: '0.85rem' }}
                        required={transferModalMode === 'ihb' || transferType !== 'cash_pos_other'}
                      />
                    </div>
                  )}

                  {/* Recipient Bank Field (Hidden if Cash / POS / Other Bank selected) */}
                  {!(transferType === 'cash_pos_other' && transferModalMode !== 'ihb') && (
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px', display: 'block' }}>Recipient Bank <span style={{ color: '#ef4444' }}>*</span></label>
                      <div
                        onClick={() => {
                          if (transferModalMode !== 'ihb') {
                            setShowBankListModal(true);
                          }
                        }}
                        style={{ 
                          border: '1px solid #cbd5e1', 
                          borderRadius: '8px', 
                          padding: '9px 10px', 
                          background: transferModalMode === 'ihb' ? '#f1f5f9' : '#fff', 
                          cursor: transferModalMode === 'ihb' ? 'not-allowed' : 'pointer', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center' 
                        }}
                      >
                        <span style={{ fontWeight: 'bold', color: transferModalMode === 'ihb' ? '#4f46e5' : (recipientBankName === 'Select Bank' ? '#94a3b8' : '#0f172a'), fontSize: '0.85rem' }}>
                          {transferModalMode === 'ihb' ? 'IHB Inventory Internal' : recipientBankName}
                        </span>
                        {transferModalMode !== 'ihb' && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>▼</span>}
                      </div>
                    </div>
                  )}

                  {isResolving && <p style={{ fontSize: '0.78rem', color: '#4f46e5', marginBottom: '10px', fontWeight: 500 }}>Verifying account details with NIBSS...</p>}
                  {resolvedAccountName && (
                    <div className="form-group" style={{ background: '#e0e7ff', padding: '10px', borderRadius: '8px', border: '1px solid #c7d2fe', marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#312e81', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Verified Receiver Name</label>
                      <p style={{ fontWeight: 'bold', color: '#3730a3', margin: '2px 0', fontSize: '0.92rem' }}>{resolvedAccountName}</p>
                      {detectedBankName && <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: 0 }}>Bank: {detectedBankName}</p>}
                    </div>
                  )}

                  {/* Dynamic Stock Purchase Form with Unit Category */}
                  {(transferType === 'stock' || transferType === 'cash_pos_other') && transferModalMode !== 'ihb' && (
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                      <h4 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 600 }}>Stock Items Details</h4>
                      {stockItems.map((item, idx) => (
                        <div key={idx} style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '10px' }}>
                          <div className="form-group" style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Product Name <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. Rice (50kg)"
                              value={item.productName}
                              onChange={(e) => handleStockItemChange(idx, 'productName', e.target.value)}
                              style={{ ...inputBorderStyle, borderRadius: '6px', padding: '7px', fontSize: '0.8rem' }}
                              required
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Quantity <span style={{ color: '#ef4444' }}>*</span></label>
                              <input
                                type="text"
                                className="form-input"
                                value={formatNumberWithCommas(item.quantity)}
                                onChange={(e) => handleStockItemChange(idx, 'quantity', parseFormattedNumber(e.target.value))}
                                style={{ ...inputBorderStyle, borderRadius: '6px', padding: '7px', fontSize: '0.8rem' }}
                                required
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Unit <span style={{ color: '#ef4444' }}>*</span></label>
                              {item.unit === 'other' ? (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Type custom..."
                                    value={item.customUnit}
                                    onChange={(e) => handleStockItemChange(idx, 'customUnit', e.target.value)}
                                    style={{ ...inputBorderStyle, borderRadius: '6px', padding: '7px', fontSize: '0.8rem', flex: 1 }}
                                    required
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...stockItems];
                                      updated[idx].unit = 'units';
                                      updated[idx].customUnit = '';
                                      setStockItems(updated);
                                    }}
                                    style={{ padding: '0 6px', background: 'none', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                                    title="Back to dropdown"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <select
                                  className="form-input"
                                  value={item.unit}
                                  onChange={(e) => handleStockItemChange(idx, 'unit', e.target.value)}
                                  style={{ ...inputBorderStyle, borderRadius: '6px', padding: '7px', fontSize: '0.8rem' }}
                                >
                                  <option value="units">Units</option>
                                  <option value="bags">Bags</option>
                                  <option value="cartons">Cartons</option>
                                  <option value="pieces">Pieces</option>
                                  <option value="bottles">Bottles</option>
                                  <option value="other">Other (Type custom)</option>
                                </select>
                              )}
                            </div>
                          </div>

                          <div className="form-group" style={{ marginBottom: '4px' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Cost Price (₦) <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="0.00"
                              value={item.costPrice}
                              onChange={(e) => handleStockItemChange(idx, 'costPrice', e.target.value)}
                              style={{ ...inputBorderStyle, borderRadius: '6px', padding: '7px', fontSize: '0.8rem' }}
                              required
                            />
                          </div>

                          {stockItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStockRow(idx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', marginTop: '4px', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                            >
                              Remove Item
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={handleAddStockRow}
                        style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, width: '100%' }}
                      >
                        + Add Another Product
                      </button>
                    </div>
                  )}

                  {/* Total Amount Field */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px', display: 'block' }}>Total Amount (₦)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="0.00"
                      value={formatNumberWithCommas(amount)}
                      onChange={(e) => {
                        if (transferType === 'ordinary' || transferModalMode === 'ihb') {
                          setAmount(parseFormattedNumber(e.target.value));
                        }
                      }}
                      readOnly={transferType === 'stock' || (transferType === 'cash_pos_other' && transferModalMode !== 'ihb')}
                      style={(transferType === 'stock' || (transferType === 'cash_pos_other' && transferModalMode !== 'ihb')) ? { ...inputBorderStyle, backgroundColor: '#f1f5f9', fontWeight: 'bold', padding: '9px 10px', fontSize: '0.85rem' } : { ...inputBorderStyle, padding: '9px 10px', fontSize: '0.85rem' }}
                      required
                    />
                  </div>

                  {/* Remarks Field */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px', display: 'block' }}>Remarks (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Monthly stock replenishment"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      style={{ ...inputBorderStyle, padding: '9px 10px', fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* PIN Field (Hidden if Cash / POS / Other Bank selected) */}
                  {!(transferType === 'cash_pos_other' && transferModalMode !== 'ihb') && (
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px', display: 'block' }}>4-Digit Payment PIN</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="••••"
                        maxLength="4"
                        value={paymentPinInput}
                        onChange={(e) => setPaymentPinInput(e.target.value)}
                        style={{ ...inputBorderStyle, padding: '8px', letterSpacing: '4px', textAlign: 'center', fontSize: '1rem' }}
                        required={transferModalMode === 'ihb' || transferType !== 'cash_pos_other'}
                      />
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="submit-btn" 
                    disabled={loading} 
                    style={{ background: '#4f46e5', borderRadius: '8px', padding: '10px', fontWeight: 'bold', fontSize: '0.88rem', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)', width: '100%' }}
                  >
                    {loading ? 'Processing...' : ((transferType === 'cash_pos_other' && transferModalMode !== 'ihb') ? 'Save & Generate Receipt' : 'Confirm & Complete Transfer')}
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* ================= BANK LIST MODAL ================= */}
        {showBankListModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '12px' }}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '360px', maxHeight: '70vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
              
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px', fontSize: '0.98rem', fontWeight: 'bold', color: '#0f172a' }}>Select Recipient Bank</h3>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b' }}>Network stability status: optimal</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowBankListModal(false)} 
                    style={{ background: '#e2e8f0', border: 'none', width: '24px', height: '24px', borderRadius: '50%', fontSize: '0.78rem', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="🔍 Search bank name..."
                  value={bankSearchQuery}
                  onChange={(e) => setBankSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#fff' }}
                />
              </div>

              <div style={{ overflowY: 'auto', padding: '8px', flex: 1 }}>
                {filteredBanks.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.82rem', padding: '20px' }}>No banks found.</p>
                ) : (
                  filteredBanks.map((bank) => (
                    <div
                      key={bank.code}
                      onClick={() => {
                        setRecipientBankCode(bank.code);
                        setRecipientBankName(bank.name);
                        setShowBankListModal(false);
                        setBankSearchQuery('');
                      }}
                      style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: recipientBankCode === bank.code ? 'bold' : 'normal', color: recipientBankCode === bank.code ? '#4f46e5' : '#1e293b', background: recipientBankCode === bank.code ? '#e0e7ff' : 'transparent', borderBottom: '1px solid #f8fafc' }}
                    >
                      {bank.name}
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Supply;