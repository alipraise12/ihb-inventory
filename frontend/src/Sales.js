import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Custom Searchable Dropdown Component
const SearchableProductSelect = ({ idx, stockId, stockList, onSelectChange, inputBorderStyle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const selectedItem = stockList.find((s) => s._id === stockId);
  const selectedLabel = stockId === 'custom'
    ? '⚡ Custom / Unlisted Item'
    : selectedItem
      ? `${selectedItem.productName} (Stock: ${selectedItem.quantity})`
      : 'Select Product...';

  const filteredStock = useMemo(() => {
    return stockList.filter((s) =>
      s.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stockList, searchTerm]);

  const handleSelect = (val) => {
    onSelectChange(idx, 'stockId', val);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...inputBorderStyle,
          padding: '10px 12px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          fontWeight: stockId === 'custom' ? '700' : '600',
          color: stockId === 'custom' ? 'var(--primary)' : 'var(--text-main)',
          fontSize: '0.88rem'
        }}
      >
        <span>{selectedLabel}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
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
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            zIndex: 1000,
            padding: '8px',
            maxHeight: '230px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <input
            type="text"
            placeholder="🔍 Search product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.82rem',
              outline: 'none',
              backgroundColor: '#f8fafc'
            }}
            autoFocus
          />

          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div
              onClick={() => handleSelect('custom')}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '700',
                color: 'var(--primary)',
                fontSize: '0.85rem',
                backgroundColor: stockId === 'custom' ? 'rgba(99, 102, 241, 0.1)' : 'transparent'
              }}
            >
              ⚡ Custom / Unlisted Item
            </div>

            {filteredStock.length === 0 ? (
              <div style={{ padding: '8px 10px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No matching products found
              </div>
            ) : (
              filteredStock.map((s) => (
                <div
                  key={s._id}
                  onClick={() => handleSelect(s._id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    fontWeight: '600',
                    backgroundColor: stockId === s._id ? 'rgba(99, 102, 241, 0.1)' : 'transparent'
                  }}
                >
                  {s.productName} <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>(Stock: {s.quantity})</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Sales = () => {
  const [stockList, setStockList] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [salesSearch, setSalesSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal States
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const receiptRef = useRef(null);

  // Multi-product Form State
  const [cartItems, setCartItems] = useState([
    { stockId: 'custom', productName: '', quantity: 1, unitPrice: '' }
  ]);
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [alert, setAlert] = useState({ message: '', type: '' });
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin' || user.role === 'owner' || !user.role;

  const showAlert = useCallback((message, type = 'error') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: '', type: '' }), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    try {
      let queryUrl = 'http://localhost:5000/api/sales';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) queryUrl += `?${params.toString()}`;

      const [stockRes, salesRes] = await Promise.all([
        fetch('http://localhost:5000/api/stock', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(queryUrl, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const stockData = await stockRes.json();
      const salesData = await salesRes.json();

      if (stockData.success) setStockList(stockData.stockItems || stockData.stock || []);
      if (salesData.success) setSalesHistory(salesData.sales || []);
    } catch (err) {
      showAlert('Error loading data from server.', 'error');
    } finally {
      setLoading(false);
    }
  }, [navigate, showAlert, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setCartItems([{ stockId: 'custom', productName: '', quantity: 1, unitPrice: '' }]);
    setDiscount('');
    setPaymentMethod('Cash');
  };

  const handleCloseModal = () => {
    resetForm();
    setShowSaleModal(false);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...cartItems];

    if (field === 'calculatedPrice') {
      const qty = Number(updated[index].quantity) || 1;
      const totalVal = Number(value) || 0;
      updated[index].unitPrice = qty > 0 ? totalVal / qty : totalVal;
    } else if (field === 'quantity') {
      const newQty = Number(value) || 1;
      const currentUnitPrice = Number(updated[index].unitPrice) || 0;
      updated[index].quantity = newQty;
      updated[index].unitPrice = currentUnitPrice; 
    } else {
      updated[index][field] = value;
    }

    if (field === 'stockId') {
      if (value === 'custom') {
        updated[index].productName = '';
        updated[index].unitPrice = '';
      } else {
        const item = stockList.find((s) => s._id === value);
        if (item) {
          updated[index].productName = item.productName;
          updated[index].unitPrice = item.price || item.sellingPrice || 0;
        }
      }
    }
    setCartItems(updated);
  };

  const addCartRow = () => {
    setCartItems([...cartItems, { stockId: 'custom', productName: '', quantity: 1, unitPrice: '' }]);
  };

  const removeCartRow = (index) => {
    if (cartItems.length === 1) return;
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      return acc + (qty * price);
    }, 0);
  }, [cartItems]);

  const finalAmount = Math.max(0, subtotal - (Number(discount) || 0));

  const handleProcessSale = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const preparedItems = cartItems.map((item) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      return {
        stockId: item.stockId === 'custom' ? null : item.stockId,
        productName: item.productName.trim(),
        quantity: qty,
        unitPrice: price,
        itemTotal: qty * price,
        isCustomItem: item.stockId === 'custom'
      };
    });

    for (const item of preparedItems) {
      if (!item.productName || item.quantity <= 0 || item.unitPrice <= 0) {
        showAlert('Please fill in valid product names, quantities, and prices.', 'error');
        return;
      }
    }

    try {
      const res = await fetch('http://localhost:5000/api/sales/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: preparedItems,
          subtotal,
          discount: Number(discount) || 0,
          totalAmount: finalAmount,
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showAlert('Sale recorded successfully!', 'success');
        handleCloseModal();
        setActiveReceipt(data.sale);
        setShowReceiptModal(true);
        fetchData();
      } else {
        showAlert(data.message || 'Failed to record sale.', 'error');
      }
    } catch (err) {
      showAlert('Server error while processing sale transaction.', 'error');
    }
  };

  // Receipt Export & Download Functions
  const downloadReceiptImage = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Receipt_${activeReceipt?._id ? String(activeReceipt._id).slice(-6) : Date.now()}.png`;
      link.click();
    } catch (err) {
      showAlert('Failed to export receipt image.', 'error');
    }
  };

  const downloadReceiptPDF = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${activeReceipt?._id ? String(activeReceipt._id).slice(-6) : Date.now()}.pdf`);
    } catch (err) {
      showAlert('Failed to export receipt PDF.', 'error');
    }
  };

  const shareReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      
      // 1. Download image locally first
      const image = canvas.toDataURL('image/png');
      const fileName = `Receipt_${activeReceipt?._id ? String(activeReceipt._id).slice(-6) : Date.now()}.png`;
      
      const link = document.createElement('a');
      link.href = image;
      link.download = fileName;
      link.click();

      // 2. Open Web Share sheet or fallback
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], fileName, { type: 'image/png' });

        const receiptNo = activeReceipt?._id ? String(activeReceipt._id).slice(-6).toUpperCase() : '';
        const shareText = `Official Receipt #${receiptNo} from IHB Inventory. Total Paid: ₦${Number(activeReceipt?.totalAmount || 0).toLocaleString()}`;

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'IHB Inventory Receipt',
            text: shareText,
            files: [file],
          });
        } else {
          const encodedText = encodeURIComponent(shareText);
          window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
        }
      });
    } catch (err) {
      showAlert('Could not launch share window.', 'error');
    }
  };

  const filteredSales = useMemo(() => {
    if (!salesSearch.trim()) return salesHistory;
    const query = salesSearch.toLowerCase();
    return salesHistory.filter((sale) => {
      const itemNames = sale.items ? sale.items.map(i => i.productName).join(' ') : (sale.productName || '');
      const seller = sale.soldBy?.fullName || '';
      return itemNames.toLowerCase().includes(query) || seller.toLowerCase().includes(query);
    });
  }, [salesHistory, salesSearch]);

  const groupedSales = useMemo(() => {
    const groups = {};
    filteredSales.forEach((sale) => {
      const dateObj = new Date(sale.saleDate || sale.createdAt);
      const monthYear = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      if (!groups[monthYear]) {
        groups[monthYear] = { items: [], total: 0 };
      }
      groups[monthYear].items.push(sale);
      groups[monthYear].total += (sale.totalAmount || 0);
    });
    return groups;
  }, [filteredSales]);

  const inputBorderStyle = {
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    outline: 'none',
  };

  return (
    <div className="inventory-layout">
      {alert.message && (
        <div className={`custom-alert ${alert.type}`}>
          {alert.message}
        </div>
      )}

      <nav className="inventory-nav">
        <div className="nav-brand">IHB <span className="highlight-text">Inventory</span></div>
        <div className="nav-links">
          <Link to="/dashboard" className="nav-item">Dashboard</Link>
          <Link to="/stock" className="nav-item">Stock</Link>
          <Link to="/sales" className="nav-item active">Sales</Link>
          {isAdmin && (
            <Link to="/supply" className="nav-item">Account/Supply</Link>
          )}
        </div>
      </nav>

      <main className="dashboard-content" style={{ maxWidth: '750px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 className="dashboard-title" style={{ margin: 0, fontSize: '1.6rem' }}>Transactions</h1>
          <button 
            className="submit-btn" 
            onClick={() => setShowSaleModal(true)}
          >
            + New Sale
          </button>
        </div>

        <div className="board-card" style={{ padding: '16px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search transactions or staff..."
              value={salesSearch}
              onChange={(e) => setSalesSearch(e.target.value)}
              style={{ ...inputBorderStyle, flex: 1, minWidth: '160px' }}
            />
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ ...inputBorderStyle, width: '140px' }}
            />
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ ...inputBorderStyle, width: '140px' }}
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="info-row">Loading transactions...</p>
        ) : Object.keys(groupedSales).length === 0 ? (
          <p className="info-row">No transactions recorded.</p>
        ) : (
          Object.keys(groupedSales).map((monthYear) => (
            <div key={monthYear} className="board-card" style={{ marginBottom: '24px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '800', color: 'var(--text-main)' }}>{monthYear}</h2>
                  <div style={{ fontSize: '0.88rem', color: 'var(--primary)', marginTop: '3px', fontWeight: '700' }}>
                    Total Sales: ₦{groupedSales[monthYear].total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {groupedSales[monthYear].items.map((sale) => {
                  const saleDate = new Date(sale.saleDate || sale.createdAt);
                  const formattedDate = `${saleDate.toLocaleString('en-US', { month: 'short' })} ${saleDate.getDate()}th, ${saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
                  const sellerName = sale.soldBy?.fullName || 'Owner';

                  return (
                    <div 
                      key={sale._id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        paddingBottom: '14px', 
                        borderBottom: '1px solid #e2e8f0' 
                      }}
                    >
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%', 
                          backgroundColor: 'rgba(99, 102, 241, 0.12)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: 'var(--primary)',
                          fontWeight: '800',
                          fontSize: '1.1rem'
                        }}>
                          ↑
                        </div>

                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {sale.items && sale.items.length > 0
                              ? sale.items.map(i => i.productName).join(', ')
                              : sale.productName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {formattedDate} • <span>{sale.paymentMethod}</span>
                            <span style={{ color: 'var(--primary)', marginLeft: '8px', fontWeight: '600' }}>
                              • Sold by: {sellerName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--primary)' }}>
                          +₦{sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReceipt(sale);
                            setShowReceiptModal(true);
                          }}
                          style={{
                            marginTop: '4px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: 'var(--primary)',
                            padding: '3px 8px',
                            cursor: 'pointer'
                          }}
                        >
                          📄 Receipt
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      {/* RECORD SALE MODAL */}
      {showSaleModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div 
            className="modal-card" 
            style={{ maxWidth: '520px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Record Sale</h2>
              <button className="close-btn" type="button" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handleProcessSale} style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>Items</label>

                {cartItems.map((item, idx) => {
                  const qty = Number(item.quantity) || 0;
                  const unitP = Number(item.unitPrice) || 0;
                  const dynamicTotalPrice = qty * unitP;

                  return (
                    <div key={idx} style={{ padding: '14px', border: '1px solid #cbd5e1', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>Product #{idx + 1}</span>
                        {cartItems.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeCartRow(idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}
                          >
                            ✕ Remove
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gap: '10px' }}>
                        <SearchableProductSelect
                          idx={idx}
                          stockId={item.stockId}
                          stockList={stockList}
                          onSelectChange={handleItemChange}
                          inputBorderStyle={inputBorderStyle}
                        />

                        <input
                          type="text"
                          className="form-input"
                          placeholder="Item Name *"
                          value={item.productName}
                          onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                          style={inputBorderStyle}
                          required
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>Quantity</label>
                            <input
                              type="number"
                              min="1"
                              placeholder="Qty *"
                              className="form-input"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              style={inputBorderStyle}
                              required
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>Item Price (₦)</label>
                            <input
                              type="number"
                              placeholder="Total Price ₦ *"
                              className="form-input"
                              value={dynamicTotalPrice > 0 ? dynamicTotalPrice : ''}
                              onChange={(e) => handleItemChange(idx, 'calculatedPrice', e.target.value)}
                              style={{ ...inputBorderStyle, color: 'var(--primary)', fontWeight: '800' }}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addCartRow}
                  style={{
                    padding: '10px',
                    background: '#ffffff',
                    border: '1px dashed var(--primary)',
                    color: 'var(--primary)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: '700'
                  }}
                >
                  + Add Another Product
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem' }}>Discount (₦)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    style={inputBorderStyle}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem' }}>Payment Method</label>
                  <select 
                    className="form-input" 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={inputBorderStyle}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Transfer">Transfer</option>
                    <option value="POS">POS Card</option>
                  </select>
                </div>
              </div>

              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Subtotal: ₦{subtotal.toLocaleString()}</span>
                  <span>Discount: -₦{(Number(discount) || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '700' }}>Final Payable Sum:</span>
                  <strong style={{ color: 'var(--primary)', fontSize: '1.3rem', fontWeight: '800' }}>
                    ₦{finalAmount.toLocaleString()}
                  </strong>
                </div>
              </div>

              <button 
                type="submit" 
                className="submit-btn" 
                style={{ width: '100%', marginTop: '6px' }}
              >
                Complete Sale Transaction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW & EXPORT MODAL */}
      {showReceiptModal && activeReceipt && (
        <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="modal-card" style={{ maxWidth: '420px', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Official Sales Receipt</h2>
              <button className="close-btn" type="button" onClick={() => setShowReceiptModal(false)}>✕</button>
            </div>

            {/* Printable/Exportable Receipt Container */}
            <div
              ref={receiptRef}
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                fontFamily: 'monospace, sans-serif'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#4338ca', fontWeight: '900' }}>IHB INVENTORY</h3>
                <p style={{ margin: '2px 0', fontSize: '0.78rem', color: '#64748b' }}>Sales & Inventory Management</p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                  {new Date(activeReceipt.saleDate || activeReceipt.createdAt).toLocaleString()}
                </p>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '12px 0' }} />

              <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Receipt No:</span>
                  <strong>#{String(activeReceipt._id).slice(-6).toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sold By:</span>
                  <strong>{activeReceipt.soldBy?.fullName || 'Owner'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Payment Method:</span>
                  <strong>{activeReceipt.paymentMethod}</strong>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '12px 0' }} />

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeReceipt.items && activeReceipt.items.length > 0 ? (
                  activeReceipt.items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span>{it.quantity}x {it.productName}</span>
                      <span>₦{Number(it.itemTotal).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span>1x {activeReceipt.productName}</span>
                    <span>₦{Number(activeReceipt.totalAmount).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '12px 0' }} />

              {/* Summary */}
              <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>₦{Number(activeReceipt.subtotal || activeReceipt.totalAmount).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount:</span>
                  <span>-₦{Number(activeReceipt.discount || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', fontWeight: '800', marginTop: '6px', color: '#4338ca' }}>
                  <span>TOTAL PAID:</span>
                  <span>₦{Number(activeReceipt.totalAmount).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.72rem', color: '#64748b' }}>
                Thank you for your business!
              </div>
            </div>

            {/* Receipt Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={downloadReceiptImage}
                style={{
                  padding: '10px 8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                🖨 PNG
              </button>
              
              <button
                type="button"
                onClick={downloadReceiptPDF}
                style={{
                  padding: '10px 8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                📄 PDF
              </button>

              <button
                type="button"
                onClick={shareReceipt}
                style={{
                  padding: '10px 8px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;