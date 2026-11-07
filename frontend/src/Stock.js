import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from './config';

const Stock = () => {
  const [activeTab, setActiveTab] = useState('warehouse'); // 'warehouse' or 'pending'
  const [stockList, setStockList] = useState([]);
  const [pendingStock, setPendingStock] = useState([]);
  const [selectedPendingIds, setSelectedPendingIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Pending item inline edit states
  const [editingPendingId, setEditingPendingId] = useState(null);
  const [editPendingName, setEditPendingName] = useState('');
  const [editPendingQty, setEditPendingQty] = useState('');
  const [pendingSellingPrices, setPendingSellingPrices] = useState({});

  // Form States
  const initialFormState = {
    productName: '',
    category: 'General',
    quantity: '',
    unit: 'units',
    customUnit: '',
    costPrice: '',
    sellingPrice: '',
    lowStockThreshold: '5',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editFormData, setEditFormData] = useState(initialFormState);

  // Audit Log State (Fetched from Backend Database)
  const [auditLog, setAuditLog] = useState([]);

  const [alert, setAlert] = useState({ message: '', type: '' });
  const navigate = useNavigate();

  // Helper to format numbers with commas (e.g. 1,000)
  const formatWithCommas = (val) => {
    if (val === '' || val === null || val === undefined) return '';
    const cleanVal = String(val).replace(/,/g, '');
    if (isNaN(cleanVal)) return val;
    const parts = cleanVal.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // Helper to clean commas for database saving / calculation
  const parseNumberInput = (val) => {
    if (val === '' || val === null || val === undefined) return '';
    if (typeof val === 'number') return val;
    const cleanStr = String(val).replace(/,/g, '');
    const match = cleanStr.match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : '';
  };

  const showAlert = useCallback((message, type = 'error') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: '', type: '' }), 3500);
  }, []);

  // Fetch all stock items, pending stock & audit logs from Backend
  const fetchStockAndAudit = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    try {
      const [stockRes, pendingRes, auditRes] = await Promise.all([
        fetch(`${API_URL}/api/stock`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/stock/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/audit-history`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      const stockData = await stockRes.json();
      const pendingData = await pendingRes.json();
      const auditData = await auditRes.json();

      if (stockData.success) {
        setStockList(stockData.stockItems || stockData.stock || []);
      } else {
        showAlert(stockData.message || 'Failed to fetch stock list', 'error');
      }

      if (pendingData.success) {
        setPendingStock(pendingData.pendingItems || []);
      }

      if (auditData.success) {
        setAuditLog(auditData.logs || []);
      }
    } catch (err) {
      showAlert('Failed to connect to server', 'error');
    } finally {
      setLoading(false);
    }
  }, [navigate, showAlert]);

  useEffect(() => {
    fetchStockAndAudit();
  }, [fetchStockAndAudit]);

  // Filter stock items dynamically
  const filteredStock = useMemo(() => {
    return stockList.filter((s) => {
      const name = (s.productName || '').toLowerCase();
      const cat = (s.category || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      return name.includes(query) || cat.includes(query);
    });
  }, [stockList, searchTerm]);

  // Handlers for Pending Stock Verification & Management
  const handleVerifyItem = async (id) => {
    const token = localStorage.getItem('token');
    const sellingPriceVal = parseNumberInput(pendingSellingPrices[id]);

    if (!sellingPriceVal || sellingPriceVal <= 0) {
      showAlert('Please enter a valid selling price before verifying.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/stock/verify/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sellingPrice: sellingPriceVal }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Item verified and moved to warehouse stock!', 'success');
        fetchStockAndAudit();
      } else {
        showAlert(data.message || 'Failed to verify item', 'error');
      }
    } catch (err) {
      showAlert('Server error during verification', 'error');
    }
  };

  const handleVerifySelected = async () => {
    if (selectedPendingIds.length === 0) {
      showAlert('Please select at least one pending item to verify.', 'error');
      return;
    }

    // Check if selected items have selling prices set
    for (const id of selectedPendingIds) {
      const item = pendingStock.find(p => p._id === id);
      const price = parseNumberInput(pendingSellingPrices[id] !== undefined ? pendingSellingPrices[id] : item?.sellingPrice);
      if (!price || price <= 0) {
        showAlert(`Please set a valid selling price for "${item?.productName || 'selected item'}" before verifying.`, 'error');
        return;
      }
    }

    const token = localStorage.getItem('token');
    try {
      // Verify individually or in bulk with respective selling prices
      for (const id of selectedPendingIds) {
        const item = pendingStock.find(p => p._id === id);
        const sellingPriceVal = parseNumberInput(pendingSellingPrices[id] !== undefined ? pendingSellingPrices[id] : item?.sellingPrice);
        await fetch(`${API_URL}/api/stock/verify/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sellingPrice: sellingPriceVal }),
        });
      }

      showAlert('Selected items verified successfully!', 'success');
      setSelectedPendingIds([]);
      fetchStockAndAudit();
    } catch (err) {
      showAlert('Server error during bulk verification', 'error');
    }
  };

  const toggleSelectAll = () => {
    if (selectedPendingIds.length === pendingStock.length) {
      setSelectedPendingIds([]);
    } else {
      setSelectedPendingIds(pendingStock.map(item => item._id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedPendingIds.includes(id)) {
      setSelectedPendingIds(selectedPendingIds.filter(itemid => itemid !== id));
    } else {
      setSelectedPendingIds([...selectedPendingIds, id]);
    }
  };

  const handleSavePendingEdit = async (item) => {
    const token = localStorage.getItem('token');
    const id = item._id || item.id;
    try {
      const res = await fetch(`${API_URL}/api/stock/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productName: editPendingName || item.productName,
          quantity: parseNumberInput(editPendingQty !== '' ? editPendingQty : item.quantity),
          sellingPrice: parseNumberInput(pendingSellingPrices[id] || item.sellingPrice || 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Pending item updated successfully!', 'success');
        setEditingPendingId(null);
        fetchStockAndAudit();
      } else {
        showAlert(data.message || 'Failed to update pending item', 'error');
      }
    } catch (err) {
      showAlert('Failed to connect to server', 'error');
    }
  };

  const handleDeletePending = async (item) => {
    const productName = item.productName || 'Product';
    if (!window.confirm(`Are you sure you want to delete pending item "${productName}"?`)) return;

    const token = localStorage.getItem('token');
    const productId = item._id || item.id;

    try {
      const res = await fetch(`${API_URL}/api/stock/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert(`Pending item "${productName}" deleted!`, 'success');
        fetchStockAndAudit();
      } else {
        showAlert(data.message || 'Failed to delete item', 'error');
      }
    } catch (err) {
      showAlert('Failed to connect to server', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (['quantity', 'costPrice', 'sellingPrice', 'lowStockThreshold'].includes(name)) {
      const rawVal = value.replace(/,/g, '');
      if (rawVal === '' || !isNaN(rawVal)) {
        setFormData({ ...formData, [name]: formatWithCommas(rawVal) });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    if (['quantity', 'costPrice', 'sellingPrice', 'lowStockThreshold'].includes(name)) {
      const rawVal = value.replace(/,/g, '');
      if (rawVal === '' || !isNaN(rawVal)) {
        setEditFormData({ ...editFormData, [name]: formatWithCommas(rawVal) });
      }
    } else {
      setEditFormData({ ...editFormData, [name]: value });
    }
  };

  // OPEN PRODUCT DETAILS MODAL
  const handleOpenDetails = (item) => {
    setSelectedProduct(item);
    setShowDetailsModal(true);
  };

  // ADD NEW PRODUCT
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const finalUnit = formData.unit === 'other' ? (formData.customUnit.trim() || 'units') : formData.unit;

    const cleanedPayload = {
      productName: formData.productName,
      category: formData.category,
      quantity: parseNumberInput(formData.quantity),
      unit: finalUnit,
      costPrice: parseNumberInput(formData.costPrice),
      sellingPrice: parseNumberInput(formData.sellingPrice),
      lowStockThreshold: parseNumberInput(formData.lowStockThreshold),
    };

    try {
      const res = await fetch(`${API_URL}/api/stock/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cleanedPayload),
      });

      const data = await res.json();

      if (data.success) {
        showAlert('Product added to stock successfully!', 'success');
        setFormData(initialFormState);
        setShowAddModal(false);
        fetchStockAndAudit();
      } else {
        showAlert(data.message || 'Failed to add product', 'error');
      }
    } catch (err) {
      showAlert('Failed to connect to server', 'error');
    }
  };

  // OPEN EDIT MODAL
  const handleOpenEdit = (item) => {
    setSelectedProduct(item);
    const standardUnits = ['units', 'bags', 'cartons', 'pieces', 'bottles'];
    const itemUnit = item.unit || 'units';
    const isStandard = standardUnits.includes(itemUnit);

    setEditFormData({
      productName: item.productName || '',
      category: item.category || 'General',
      quantity: item.quantity !== undefined ? formatWithCommas(item.quantity) : '',
      unit: isStandard ? itemUnit : 'other',
      customUnit: isStandard ? '' : itemUnit,
      costPrice: item.costPrice !== undefined ? formatWithCommas(item.costPrice) : '',
      sellingPrice: item.sellingPrice !== undefined ? formatWithCommas(item.sellingPrice) : '',
      lowStockThreshold: item.lowStockThreshold !== undefined ? formatWithCommas(item.lowStockThreshold) : '5',
    });
    setShowEditModal(true);
  };

  // UPDATE PRODUCT
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isUpdating) return;
    setIsUpdating(true);

    const token = localStorage.getItem('token');
    const productId = selectedProduct?._id || selectedProduct?.id;

    if (!productId) {
      showAlert('Invalid Product ID', 'error');
      setIsUpdating(false);
      return;
    }

    const finalUnit = editFormData.unit === 'other' ? (editFormData.customUnit.trim() || 'units') : editFormData.unit;

    const cleanedEditPayload = {
      productName: editFormData.productName,
      category: editFormData.category,
      quantity: parseNumberInput(editFormData.quantity),
      unit: finalUnit,
      costPrice: parseNumberInput(editFormData.costPrice),
      sellingPrice: parseNumberInput(editFormData.sellingPrice),
      lowStockThreshold: parseNumberInput(editFormData.lowStockThreshold),
    };

    try {
      const res = await fetch(`${API_URL}/api/stock/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cleanedEditPayload),
      });

      const data = await res.json();

      if (data.success) {
        showAlert(`Product "${editFormData.productName}" updated!`, 'success');
        setShowEditModal(false);
        setSelectedProduct(null);
        fetchStockAndAudit();
      } else {
        showAlert(data.message || 'Failed to update product', 'error');
      }
    } catch (err) {
      showAlert('Failed to connect to server', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // DELETE PRODUCT
  const handleDelete = async (item) => {
    const productName = item.productName || 'Product';
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) return;

    const token = localStorage.getItem('token');
    const productId = item._id || item.id;

    if (!productId) {
      showAlert('Invalid Product ID', 'error');
      return;
    }

    try {
      const deleteUrl = `${API_URL}/api/stock/${productId}`;
      const res = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showAlert(`Product "${productName}" deleted!`, 'success');
        fetchStockAndAudit();
      } else {
        showAlert(data.message || 'Failed to delete product', 'error');
      }
    } catch (err) {
      showAlert('Failed to connect to server', 'error');
    }
  };

  const inputBorderStyle = {
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    outline: 'none',
    width: '100%',
    padding: '8px 12px',
    fontSize: '0.9rem'
  };

  return (
    <div className="inventory-layout">
      {alert.message && (
        <div className={`custom-alert ${alert.type}`}>{alert.message}</div>
      )}

      {/* Responsive Styles Injection */}
      <style>{`
        .desktop-table-view {
          display: block;
        }
        .mobile-card-view {
          display: none;
        }

        @media (max-width: 768px) {
          .desktop-table-view {
            display: none !important;
          }
          .mobile-card-view {
            display: flex !important;
            flex-direction: column;
            gap: 12px;
            margin-top: 12px;
          }
          .stock-mobile-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .stock-mobile-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .stock-mobile-actions {
            display: flex;
            gap: 6px;
            justify-content: flex-end;
            margin-top: 4px;
            flex-wrap: nowrap;
          }
          .top-action-buttons {
            gap: 6px !important;
          }
          .top-action-buttons .submit-btn {
            padding: 6px 10px !important;
            font-size: 0.75rem !important;
          }
          .stock-mobile-actions button {
            padding: 5px 8px !important;
            font-size: 0.72rem !important;
            border-radius: 6px !important;
          }
        }
      `}</style>

      {/* Navigation Bar */}
      <nav className="inventory-nav">
        <div className="nav-brand">IHB <span className="highlight-text">Inventory</span></div>
        <div className="nav-links">
          <Link to="/dashboard" className="nav-item">Dashboard</Link>
          <Link to="/stock" className="nav-item active">Stock</Link>
          <Link to="/sales" className="nav-item">Sales</Link>
          <Link to="/staff" className="nav-item">Staff</Link>
          <Link to="/supply" className="nav-item">Account/Supply</Link>
        </div>
      </nav>

      <main className="dashboard-content" style={{ maxWidth: '950px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 className="dashboard-title" style={{ margin: 0, fontSize: '1.6rem' }}>Stock & Warehouse Management</h1>
          
          <div className="top-action-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap' }}>
            <button 
              className="submit-btn" 
              style={{ background: '#ffffff', color: 'var(--text-main)', border: '1px solid #cbd5e1', boxShadow: 'none' }}
              onClick={() => setShowAuditModal(true)}
            >
              📜 Audit History ({auditLog.length})
            </button>
            <button 
              className="submit-btn" 
              onClick={() => setShowAddModal(true)}
            >
              + Add New Item
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('warehouse')}
            style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', background: activeTab === 'warehouse' ? '#4f46e5' : '#ffffff', color: activeTab === 'warehouse' ? '#fff' : '#475569', border: '1px solid #cbd5e1' }}
          >
            Current Warehouse Stock ({stockList.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            style={{ position: 'relative', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', background: activeTab === 'pending' ? '#4f46e5' : '#ffffff', color: activeTab === 'pending' ? '#fff' : '#475569', border: '1px solid #cbd5e1' }}
          >
            Pending Supply / Incoming Stock ({pendingStock.length})
            {pendingStock.length > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem' }}>
                {pendingStock.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'warehouse' ? (
          <div className="board-card" style={{ padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Current Warehouse Stock</h2>
              
              <div style={{ width: '100%', maxWidth: '300px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Search product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={inputBorderStyle}
                />
              </div>
            </div>

            {loading ? (
              <p className="info-row">Loading stock details...</p>
            ) : filteredStock.length === 0 ? (
              <p className="info-row">
                {searchTerm ? `No stock items matching "${searchTerm}"` : 'No products found in stock. Click "+ Add New Item" to add one.'}
              </p>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '14px 12px', width: '50px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>S/N</th>
                        <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Product Name</th>
                        <th style={{ padding: '14px 12px', textAlign: 'right', width: '180px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStock.map((item, index) => (
                        <tr key={item._id || item.id || index} style={{ borderBottom: '1px solid #e2e8f0' }} className="table-row-hover">
                          <td style={{ padding: '16px 12px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.95rem' }}>{index + 1}</td>
                          <td 
                            style={{ padding: '16px 12px', fontWeight: '700', color: 'var(--text-main)', fontSize: '1rem', cursor: 'pointer' }}
                            onClick={() => handleOpenDetails(item)}
                            title="Click to view full stock details"
                          >
                            <span style={{ borderBottom: '1px dashed var(--primary)', paddingBottom: '2px' }}>
                              {item.productName}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#6b7280', marginLeft: '10px', fontWeight: 'normal' }}>
                              ({Number(item.quantity || 0).toLocaleString()} {item.unit || 'units'})
                            </span>
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                            <button 
                              onClick={() => handleOpenEdit(item)}
                              style={{ 
                                background: '#f8fafc', 
                                border: '1px solid #cbd5e1', 
                                color: 'var(--primary)', 
                                padding: '6px 12px', 
                                borderRadius: '6px', 
                                fontWeight: '700',
                                fontSize: '0.82rem',
                                cursor: 'pointer', 
                                marginRight: '8px' 
                              }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(item)}
                              style={{ 
                                background: 'rgba(239, 68, 68, 0.08)', 
                                border: '1px solid var(--danger)', 
                                color: 'var(--danger)', 
                                padding: '6px 12px', 
                                borderRadius: '6px', 
                                fontWeight: '700',
                                fontSize: '0.82rem',
                                cursor: 'pointer' 
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View (No Horizontal Scroll) */}
                <div className="mobile-card-view">
                  {filteredStock.map((item, index) => (
                    <div key={item._id || item.id || index} className="stock-mobile-card">
                      <div className="stock-mobile-header">
                        <strong onClick={() => handleOpenDetails(item)} style={{ color: 'var(--text-main)', fontSize: '0.95rem', cursor: 'pointer' }}>
                          {index + 1}. {item.productName}
                        </strong>
                        <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: '700' }}>
                          {Number(item.quantity || 0).toLocaleString()} {item.unit || 'units'}
                        </span>
                      </div>
                      <div className="stock-mobile-actions">
                        <button 
                          onClick={() => handleOpenEdit(item)}
                          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: 'var(--primary)', padding: '5px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(item)}
                          style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '5px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          /* PENDING / INCOMING STOCK SESSION */
          <div className="board-card" style={{ padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: '0 0 5px', fontSize: '1.2rem', fontWeight: '800' }}>Pending Supply & Incoming Stock</h2>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>Determine selling prices and verify incoming stock items before moving them to warehouse inventory.</p>
              </div>
              {pendingStock.length > 0 && (
                <button
                  onClick={handleVerifySelected}
                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.88rem' }}
                >
                  ✓ Verify Selected ({selectedPendingIds.length})
                </button>
              )}
            </div>

            {loading ? (
              <p className="info-row">Loading pending stock...</p>
            ) : pendingStock.length === 0 ? (
              <p className="info-row">No pending stock awaiting verification.</p>
            ) : (
              <>
                {/* Desktop Pending Table View */}
                <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '14px 8px', width: '40px' }}>
                          <input type="checkbox" onChange={toggleSelectAll} checked={selectedPendingIds.length === pendingStock.length && pendingStock.length > 0} />
                        </th>
                        <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Product Name</th>
                        <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Quantity</th>
                        <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cost Price</th>
                        <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Selling Price (₦) *</th>
                        <th style={{ padding: '14px 12px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingStock.map((item) => {
                        const id = item._id || item.id;
                        const isSelected = selectedPendingIds.includes(id);
                        const isEditing = editingPendingId === id;

                        return (
                          <tr key={id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '14px 8px' }}>
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelectOne(id)} />
                            </td>
                            <td style={{ padding: '14px 12px', fontWeight: '700', color: 'var(--text-main)' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="form-input"
                                  value={editPendingName}
                                  onChange={(e) => setEditPendingName(e.target.value)}
                                  style={{ ...inputBorderStyle, padding: '6px 10px' }}
                                />
                              ) : item.productName}
                            </td>
                            <td style={{ padding: '14px 12px' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="form-input"
                                  value={editPendingQty}
                                  onChange={(e) => setEditPendingQty(e.target.value)}
                                  style={{ ...inputBorderStyle, padding: '6px 10px', width: '80px' }}
                                />
                              ) : `${Number(item.quantity || 0).toLocaleString()} ${item.unit || 'units'}`}
                            </td>
                            <td style={{ padding: '14px 12px', color: '#64748b' }}>₦{Number(item.costPrice || 0).toLocaleString()}</td>
                            <td style={{ padding: '14px 12px' }}>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Enter Selling Price"
                                value={pendingSellingPrices[id] !== undefined ? pendingSellingPrices[id] : (item.sellingPrice ? formatWithCommas(item.sellingPrice) : '')}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/,/g, '');
                                  if (val === '' || !isNaN(val)) {
                                    setPendingSellingPrices({ ...pendingSellingPrices, [id]: formatWithCommas(val) });
                                  }
                                }}
                                style={{ ...inputBorderStyle, padding: '6px 10px', width: '130px', fontWeight: '800', color: 'var(--primary)' }}
                              />
                            </td>
                            <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                {isEditing ? (
                                  <button
                                    onClick={() => handleSavePendingEdit(item)}
                                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}
                                  >
                                    Save
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingPendingId(id);
                                      setEditPendingName(item.productName);
                                      setEditPendingQty(item.quantity);
                                    }}
                                    style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeletePending(item)}
                                  style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => handleVerifyItem(id)}
                                  style={{ background: '#dcfce7', color: '#16a34a', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}
                                >
                                  ✓ Verify
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card Pending View */}
                <div className="mobile-card-view">
                  {pendingStock.map((item) => {
                    const id = item._id || item.id;
                    const isSelected = selectedPendingIds.includes(id);
                    const isEditing = editingPendingId === id;

                    return (
                      <div key={id} className="stock-mobile-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '0.92rem' }}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelectOne(id)} />
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-input"
                                value={editPendingName}
                                onChange={(e) => setEditPendingName(e.target.value)}
                                style={{ ...inputBorderStyle, padding: '4px 6px', width: '100px', fontSize: '0.82rem' }}
                              />
                            ) : item.productName}
                          </label>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-input"
                                value={editPendingQty}
                                onChange={(e) => setEditPendingQty(e.target.value)}
                                style={{ ...inputBorderStyle, padding: '4px 6px', width: '60px', fontSize: '0.82rem' }}
                              />
                            ) : `Qty: ${Number(item.quantity || 0).toLocaleString()} ${item.unit || 'units'}`}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                          Cost: ₦{Number(item.costPrice || 0).toLocaleString()}
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Set Selling Price (₦) *:</label>
                          <input
                            type="text"
                            placeholder="Enter Selling Price"
                            value={pendingSellingPrices[id] !== undefined ? pendingSellingPrices[id] : (item.sellingPrice ? formatWithCommas(item.sellingPrice) : '')}
                            onChange={(e) => {
                              const val = e.target.value.replace(/,/g, '');
                              if (val === '' || !isNaN(val)) {
                                setPendingSellingPrices({ ...pendingSellingPrices, [id]: formatWithCommas(val) });
                              }
                            }}
                            style={{ ...inputBorderStyle, marginTop: '4px', fontWeight: 'bold', color: 'var(--primary)', padding: '6px 10px', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div className="stock-mobile-actions">
                          {isEditing ? (
                            <button onClick={() => handleSavePendingEdit(item)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '5px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                          ) : (
                            <button onClick={() => { setEditingPendingId(id); setEditPendingName(item.productName); setEditPendingQty(item.quantity); }} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '5px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer' }}>Edit</button>
                          )}
                          <button onClick={() => handleDeletePending(item)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer' }}>Delete</button>
                          <button onClick={() => handleVerifyItem(id)} style={{ background: '#dcfce7', color: '#16a34a', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer' }}>✓ Verify</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* View Details Modal */}
      {showDetailsModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-card" style={{ maxWidth: '480px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📦 Stock Item Details</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: '12px', padding: '10px 0', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Product Name:</span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedProduct.productName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Category:</span>
                <strong>{selectedProduct.category || 'General'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Quantity:</span>
                <strong style={{ color: 'var(--primary)' }}>{Number(selectedProduct.quantity || 0).toLocaleString()} {selectedProduct.unit || 'units'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Cost Price:</span>
                <strong>₦{Number(selectedProduct.costPrice || 0).toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Selling Price:</span>
                <strong style={{ color: 'var(--primary)' }}>₦{Number(selectedProduct.sellingPrice || 0).toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Low Stock Threshold:</span>
                <strong style={{ color: 'var(--danger)' }}>{Number(selectedProduct.lowStockThreshold || 5).toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button 
                type="button" 
                className="submit-btn" 
                onClick={() => setShowDetailsModal(false)}
                style={{ width: '100%' }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditModal && (
        <div className="modal-overlay" onClick={() => setShowAuditModal(false)}>
          <div className="modal-card" style={{ maxWidth: '560px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Recent Deleted & Edited Logs</h2>
              <button className="close-btn" onClick={() => setShowAuditModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {auditLog.length === 0 ? (
                <p className="info-row">No stock edit or deletion activity recorded.</p>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {auditLog.map((log) => (
                    <div 
                      key={log._id || log.id} 
                      style={{ 
                        padding: '12px 14px', 
                        borderRadius: '8px', 
                        backgroundColor: '#f8fafc', 
                        borderLeft: `4px solid ${log.action === 'DELETE' ? 'var(--danger)' : 'var(--primary)'}`,
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: log.action === 'DELETE' ? 'var(--danger)' : 'var(--primary)', fontSize: '0.85rem' }}>
                          [{log.action}] {log.productName}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp || log.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--text-main)' }}>{log.description}</p>
                      <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>
                        👤 Audited by: <span style={{ color: 'var(--primary)' }}>{log.auditedBy || 'Owner/Manager'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" style={{ maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Stock Item</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Product Name <span className="required">*</span></label>
                  <input
                    type="text"
                    name="productName"
                    className="form-input"
                    value={formData.productName}
                    onChange={handleInputChange}
                    style={inputBorderStyle}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    name="category"
                    className="form-input"
                    value={formData.category}
                    onChange={handleInputChange}
                    style={inputBorderStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Quantity <span className="required">*</span></label>
                  <input
                    type="text"
                    name="quantity"
                    className="form-input"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    style={inputBorderStyle}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Unit <span className="required">*</span></label>
                  {formData.unit === 'other' ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input
                        type="text"
                        name="customUnit"
                        className="form-input"
                        placeholder="Type custom unit..."
                        value={formData.customUnit}
                        onChange={handleInputChange}
                        style={{ ...inputBorderStyle, flex: 1 }}
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, unit: 'units', customUnit: '' })}
                        style={{ padding: '0 8px', background: 'none', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                        title="Back to dropdown"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      name="unit"
                      className="form-input"
                      value={formData.unit}
                      onChange={handleInputChange}
                      style={inputBorderStyle}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Cost Price (₦)</label>
                  <input
                    type="text"
                    name="costPrice"
                    className="form-input"
                    value={formData.costPrice}
                    onChange={handleInputChange}
                    style={inputBorderStyle}
                  />
                </div>

                <div className="form-group">
                  <label>Selling Price (₦) <span className="required">*</span></label>
                  <input
                    type="text"
                    name="sellingPrice"
                    className="form-input"
                    value={formData.sellingPrice}
                    onChange={handleInputChange}
                    style={inputBorderStyle}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="submit-btn" style={{ marginTop: '10px' }}>
                Add Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-card" style={{ maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Product Details</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Product Name <span className="required">*</span></label>
                  <input
                    type="text"
                    name="productName"
                    className="form-input"
                    value={editFormData.productName}
                    onChange={handleEditInputChange}
                    style={inputBorderStyle}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    name="category"
                    className="form-input"
                    value={editFormData.category}
                    onChange={handleEditInputChange}
                    style={inputBorderStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Quantity <span className="required">*</span></label>
                  <input
                    type="text"
                    name="quantity"
                    className="form-input"
                    value={editFormData.quantity}
                    onChange={handleEditInputChange}
                    style={inputBorderStyle}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Unit <span className="required">*</span></label>
                  {editFormData.unit === 'other' ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input
                        type="text"
                        name="customUnit"
                        className="form-input"
                        placeholder="Type custom unit..."
                        value={editFormData.customUnit}
                        onChange={handleEditInputChange}
                        style={{ ...inputBorderStyle, flex: 1 }}
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, unit: 'units', customUnit: '' })}
                        style={{ padding: '0 8px', background: 'none', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                        title="Back to dropdown"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      name="unit"
                      className="form-input"
                      value={editFormData.unit}
                      onChange={handleEditInputChange}
                      style={inputBorderStyle}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Cost Price (₦)</label>
                  <input
                    type="text"
                    name="costPrice"
                    className="form-input"
                    value={editFormData.costPrice}
                    onChange={handleEditInputChange}
                    style={inputBorderStyle}
                  />
                </div>

                <div className="form-group">
                  <label>Selling Price (₦) <span className="required">*</span></label>
                  <input
                    type="text"
                    name="sellingPrice"
                    className="form-input"
                    value={editFormData.sellingPrice}
                    onChange={handleEditInputChange}
                    style={inputBorderStyle}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="submit-btn" 
                style={{ 
                  marginTop: '10px', 
                  opacity: isUpdating ? 0.7 : 1, 
                  cursor: isUpdating ? 'not-allowed' : 'pointer' 
                }}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating Item...' : 'Update Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;