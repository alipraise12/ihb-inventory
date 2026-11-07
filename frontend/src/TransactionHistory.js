import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState('');
  
  const receiptRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/api/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchTransactions();
  }, [token, navigate, fetchTransactions]);

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Professional WhatsApp Share: Automatically copies text summary & opens WhatsApp Web directly
  const handleShareWhatsApp = (tx) => {
    const sender = tx.senderName || user.fullName || 'Grace Ali';
    let text = `*IHB INVENTORY INVOICE / RECEIPT* \n` +
      `--------------------------------\n` +
      `*Amount:* ₦${tx.amount.toLocaleString()}\n` +
      `*Status:* ${tx.status} ✅\n` +
      `*Sender:* ${sender}\n` +
      `*Recipient:* ${tx.recipientName || 'Beneficiary'} (${tx.bankName} | ${tx.recipientAccount})\n` +
      `*Remark:* ${tx.remark}\n` +
      `*Transaction No:* ${tx.transactionNo}\n` +
      `*Session ID:* ${tx.sessionId}\n` +
      `*Date:* ${new Date(tx.createdAt).toLocaleString()}\n`;

    if (tx.stockItems && tx.stockItems.length > 0) {
      text += `--------------------------------\n*Items Purchased:*\n`;
      tx.stockItems.forEach((item, index) => {
        text += `${index + 1}. ${item.productName} - Qty: ${item.quantity} ${item.unit || 'units'} (@ ₦${(item.costPrice || 0).toLocaleString()})\n`;
      });
    }

    text += `--------------------------------\n` +
      `🔒 Verified Secure Transaction - IHB Gateway`;

    navigator.clipboard.writeText(text);
    alert('Invoice/Receipt text copied to clipboard! You can now paste it directly into your WhatsApp chat.');
    window.open('https://web.whatsapp.com/', '_blank');
  };

  // Secure Non-Editable Receipt Image Download (.png)
  const handleDownloadSecureReceiptImage = async (tx) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 700;
      canvas.height = 1100;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(40, 40, 620, 1020);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('IHB BUSINESS GATEWAY', 70, 95);
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('VERIFIED DIGITAL INVOICE 🔒', 420, 95);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(70, 120);
      ctx.lineTo(630, 120);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(70, 145, 560, 110);
      ctx.fillStyle = '#64748b';
      ctx.font = '13px sans-serif';
      ctx.fillText((tx.transferType === 'cash_pos_other' || tx.category?.includes('Stock') ? 'RESTOCK INVOICE / RECEIPT' : tx.title).toUpperCase(), 95, 175);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(`₦${tx.amount.toLocaleString()}`, 95, 225);
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('● SUCCESSFUL', 500, 220);

      let y = 300;
      const drawSecureRow = (label, value) => {
        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.fillText(label, 70, y);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(value, 260, y);
        y += 42;
      };

      drawSecureRow('Sender Name:', tx.senderName || user.fullName || 'Grace Ali');
      drawSecureRow('Recipient Name:', tx.recipientName || 'Beneficiary');
      drawSecureRow('Bank & Account:', `${tx.bankName} (${tx.recipientAccount})`);
      drawSecureRow('Remark / Purpose:', tx.remark);
      drawSecureRow('Transaction No:', tx.transactionNo);
      drawSecureRow('Session ID:', tx.sessionId);
      drawSecureRow('Payment Method:', tx.bankName || 'Wallet Balance');
      drawSecureRow('Transaction Date:', new Date(tx.createdAt).toLocaleString());

      // Draw itemized list if available
      if (tx.stockItems && tx.stockItems.length > 0) {
        y += 10;
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('Items Purchased (Invoice Breakdown):', 70, y);
        y += 25;

        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(70, y, 560, 30);
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('Item Name', 85, y + 20);
        ctx.fillText('Qty', 380, y + 20);
        ctx.fillText('Price', 500, y + 20);
        y += 35;

        tx.stockItems.forEach((item) => {
          ctx.fillStyle = '#1e293b';
          ctx.font = '13px sans-serif';
          ctx.fillText(item.productName, 85, y);
          ctx.fillText(`${item.quantity} ${item.unit || 'units'}`, 380, y);
          ctx.fillText(`₦${(item.costPrice || 0).toLocaleString()}`, 500, y);
          y += 30;
        });
      }

      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(70, 980);
      ctx.lineTo(630, 980);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 12px sans-serif';
      ctx.fillText('This is an electronically generated secure invoice & receipt. No signature required.', 70, 1010);

      const imageURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageURL;
      link.download = `Secure_Invoice_${tx.transactionNo}.png`;
      link.click();
    } catch (err) {
      console.error('Error rendering secure receipt image:', err);
    }
  };

  return (
    <div className="inventory-layout" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <nav className="inventory-nav">
        <div className="nav-brand">
          IHB <span className="highlight-text">Inventory</span>
        </div>
        <div className="nav-links">
          <Link to="/dashboard" className="nav-item">Dashboard</Link>
          <Link to="/stock" className="nav-item">Stock</Link>
          <Link to="/sales" className="nav-item">Sales</Link>
          <Link to="/supply" className="nav-item active">Account/Supply</Link>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: '850px', paddingTop: '30px', paddingBottom: '40px', width: '92%', margin: '0 auto' }}>
        
        {/* Header with Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 5px' }}>Transaction History</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>View all financial settlements and direct payments</p>
          </div>
          <Link to="/supply" style={{ background: '#e0e7ff', color: '#4f46e5', padding: '10px 18px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
            ← Back to Gateway
          </Link>
        </div>

        {/* Transactions Feed Card */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>All Transactions</h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{transactions.length} record(s)</span>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>Loading transaction history...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <div
                    key={tx._id}
                    onClick={() => setSelectedTransaction(tx)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', cursor: 'pointer', background: '#fafafa', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: tx.type === 'credit' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: tx.type === 'credit' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                        {tx.type === 'credit' ? '↓' : '↑'}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 3px', fontSize: '0.95rem', color: '#1e293b', fontWeight: 600 }}>{tx.title}</h4>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                          {new Date(tx.createdAt).toLocaleString()} | <span style={{ color: '#4f46e5', fontWeight: 500 }}>{tx.transferType === 'stock' || tx.transferType === 'cash_pos_other' ? 'Stock Restock / Invoice' : 'Direct Payment'}</span>
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1rem', color: tx.type === 'credit' ? '#16a34a' : '#1e293b' }}>
                        {tx.type === 'credit' ? `+₦${tx.amount.toLocaleString()}` : `-₦${tx.amount.toLocaleString()}`}
                      </span>
                      <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#16a34a', fontWeight: 500 }}>{tx.status}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>No transactions recorded yet.</p>
              )}
            </div>
          )}
        </div>

        {/* ================= DETAILED RECEIPT / INVOICE MODAL ================= */}
        {selectedTransaction && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '15px' }}>
            <div ref={receiptRef} style={{ background: '#fff', width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px', padding: '25px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>
                  {selectedTransaction.transferType === 'cash_pos_other' || selectedTransaction.category?.includes('Stock') ? 'Restock Invoice / Receipt' : 'Transaction Receipt'}
                </h3>
                <button onClick={() => setSelectedTransaction(null)} style={{ background: '#e2e8f0', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {/* Amount & Status Header */}
              <div style={{ textAlign: 'center', marginBottom: '20px', background: '#f8fafc', padding: '20px', borderRadius: '14px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{selectedTransaction.title}</p>
                <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px', letterSpacing: '-1px' }}>
                  ₦{selectedTransaction.amount.toLocaleString()}
                </div>
                <span style={{ color: '#16a34a', fontSize: '0.9rem', fontWeight: 'bold' }}>Successful</span>

                {/* Timeline Progress */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', padding: '0 10px', position: 'relative' }}>
                  <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#16a34a', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>✓</div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Payment successful</span>
                  </div>
                  <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#16a34a', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>✓</div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Processing by bank</span>
                  </div>
                  <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#16a34a', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>✓</div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Received by bank</span>
                  </div>
                </div>
              </div>

              {/* Transaction Info Grid Card */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>Transaction Details</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Sender Name:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedTransaction.senderName || user.fullName || 'Grace Ali'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Recipient Details:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                    {selectedTransaction.recipientName || 'Beneficiary'} <br />
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedTransaction.bankName} | {selectedTransaction.recipientAccount}</span>
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Remark:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedTransaction.remark}</span>
                </div>

                {/* Transaction No with Copy */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Transaction No.:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8rem' }}>{selectedTransaction.transactionNo}</span>
                    <button 
                      onClick={() => copyToClipboard(selectedTransaction.transactionNo, 'txNo')}
                      style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                    >
                      {copiedField === 'txNo' ? 'Copied!' : '📋'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Payment Method:</span>
                  <span style={{ fontWeight: 600, color: '#4f46e5' }}>{selectedTransaction.bankName || 'Wallet Balance'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Transaction Date:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
                </div>

                {/* Session ID with Copy */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Session ID:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.75rem' }}>{selectedTransaction.sessionId}</span>
                    <button 
                      onClick={() => copyToClipboard(selectedTransaction.sessionId, 'sessionId')}
                      style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                    >
                      {copiedField === 'sessionId' ? 'Copied!' : '📋'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Itemized List Section for Stock Purchases / Restocks */}
              {selectedTransaction.stockItems && selectedTransaction.stockItems.length > 0 && (
                <div className="invoice-items-section" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#0f172a' }}>Items Purchased (Invoice Breakdown)</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', fontSize: '0.78rem', color: '#475569' }}>
                        <th style={{ paddingBottom: '6px' }}>Item</th>
                        <th style={{ paddingBottom: '6px' }}>Qty</th>
                        <th style={{ paddingBottom: '6px', textAlign: 'right' }}>Cost Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTransaction.stockItems.map((prod, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem', color: '#1e293b' }}>
                          <td style={{ padding: '8px 0', fontWeight: 600 }}>{prod.productName}</td>
                          <td style={{ padding: '8px 0' }}>{prod.quantity} {prod.unit || 'units'}</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', color: '#4f46e5' }}>₦{(prod.costPrice || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Professional Secure Action Bar */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '15px' }}>
                <button
                  onClick={() => handleDownloadSecureReceiptImage(selectedTransaction)}
                  title="Download Secure Image Receipt (.png)"
                  style={{ flex: 1, background: '#f8fafc', color: '#4f46e5', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                >
                  📥 <span style={{ fontSize: '0.9rem' }}>Save Image</span>
                </button>
                <button
                  onClick={() => handleShareWhatsApp(selectedTransaction)}
                  title="Share to WhatsApp"
                  style={{ flex: 1, background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bbf7d0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dcfce7'}
                >
                  💬 <span style={{ fontSize: '0.9rem' }}>WhatsApp</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TransactionHistory;