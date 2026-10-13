import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Stock = () => {
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form States
  const initialFormState = {
    productName: '',
    category: 'General',
    packs: '',
    piecesPerPack: '1',
    loosePieces: '0',
    costPrice: '',
    sellingPrice: '',
    lowStockThreshold: '5',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editFormData, setEditFormData] = useState(initialFormState);

  // Audit Log State
  const [auditLog, setAuditLog] = useState(() => {
    const saved = localStorage.getItem('stock_audit_log');
    return saved ? JSON.parse(saved) : [];
  });

  const [alert, setAlert] = useState({ message: '', type: '' });
  const navigate = useNavigate();

  // Helper to get logged in user's name
  const getCurrentUserName = useCallback(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return parsed.fullName || parsed.username || parsed.name || 'Owner/Manager';
      }
    } catch (e) {
      // Fallback if parsing fails
    }
    return 'Owner/Manager';
  }, []);

  const showAlert = useCallback((message, type = 'error') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: '', type: '' }), 3500);
  }, []);

  // Helper to log Stock Audit Actions with Performed By User
  const logAuditAction = useCallback((actionType, productName, details) => {
    const currentUser = getCurrentUserName();
    const newEntry = {
      id: Date.now(),
      actionType,
      productName,
      details,
      performedBy: currentUser,
      timestamp: new Date().toLocaleString(),
    };
    setAuditLog((prev) => {
      const updated = [newEntry, ...prev];
      localStorage.setItem('stock_audit_log', JSON.stringify(updated));
      return updated;
    });
  }, [getCurrentUserName]);

  // Fetch all stock items
  const fetchStock = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    try {
      const res = await fetch('http://localhost:5000/api/stock', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStockList(data.stockItems || data.stock || []);
      } else {
        showAlert(data.message || 'Failed to fetch stock list', 'error');
      }
    } catch (err) {
      showAlert('Failed to connect to server', 'error');
    } finally {
      setLoading(false);
    }
  }, [navigate, showAlert]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // Filter stock items dynamically
  const filteredStock = useMemo(() => {
    return stockList.filter((s) => {
      const name = (s.productName || '').toLowerCase();
      const cat = (s.category || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      return name.includes(query) || cat.includes(query);
    });
  }, [stockList, searchTerm]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  // ADD NEW PRODUCT
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:5000/api/stock/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        showAlert('Product added to stock successfully!', 'success');
        setFormData(initialFormState);
        setShowAddModal(false);
        fetchStock();
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
    setEditFormData({
      productName: item.productName || '',
      category: item.category || 'General',
      packs: item.packs !== undefined ? item.packs : '',
      piecesPerPack: item.piecesPerPack || '1',
      loosePieces: item.loosePieces || '0',
      costPrice: item.costPrice || '',
      sellingPrice: item.sellingPrice || '',
      lowStockThreshold: item.lowStockThreshold || '5',
    });
    setShowEditModal(true);
  };

  // UPDATE PRODUCT
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const productId = selectedProduct?._id || selectedProduct?.id;

    if (!productId) {
      showAlert('Invalid Product ID', 'error');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/stock/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();

      if (data.success) {
        showAlert(`Product "${editFormData.productName}" updated!`, 'success');
        logAuditAction('EDIT', editFormData.productName, `Updated details: Selling Price ₦${editFormData.sellingPrice}, Packs: ${editFormData.packs}`);
        setShowEditModal(false);
        setSelectedProduct(null);
        fetchStock();
      } else {
        showAlert(data.message || 'Failed to update product', 'error');
      }
    } catch (err) {
      showAlert('Failed to connect to server', 'error');
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
      const res = await fetch(`http://localhost:5000/api/stock/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.success) {
        showAlert(`Product "${productName}" deleted!`, 'success');
        logAuditAction('DELETE', productName, `Removed from stock list.`);
        fetchStock();
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
  };

  return (
    <div className="inventory-layout">
      {alert.message && (
        <div className={`custom-alert ${alert.type}`}>{alert.message}</div>
      )}

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

      <main className="dashboard-content" style={{ maxWidth: '850px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 className="dashboard-title" style={{ margin: 0, fontSize: '1.6rem' }}>Stock & Warehouse Management</h1>
          
          <div style={{ display: 'flex', gap: '10px' }}>
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
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '14px 12px', width: '50px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>S/N</th>
                    <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Product Name</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', width: '150px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((item, index) => (
                    <tr key={item._id || item.id || index} style={{ borderBottom: '1px solid #e2e8f0' }} className="table-row-hover">
                      <td style={{ padding: '16px 12px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.95rem' }}>{index + 1}</td>
                      <td style={{ padding: '16px 12px', fontWeight: '700', color: 'var(--text-main)', fontSize: '1rem' }}>
                        {item.productName}
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
          )}
        </div>
      </main>

      {/* Audit Logs Modal */}
      {showAuditModal && (
        <div className="modal-overlay" onClick={() => setShowAuditModal(false)}>
          <div className="modal-card" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
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
                      key={log.id} 
                      style={{ 
                        padding: '12px 14px', 
                        borderRadius: '8px', 
                        backgroundColor: '#f8fafc', 
                        borderLeft: `4px solid ${log.actionType === 'DELETE' ? 'var(--danger)' : 'var(--primary)'}`,
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: log.actionType === 'DELETE' ? 'var(--danger)' : 'var(--primary)', fontSize: '0.85rem' }}>
                          [{log.actionType}] {log.productName}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{log.timestamp}</span>
                      </div>
                      <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--text-main)' }}>{log.details}</p>
                      <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>
                        👤 Audited by: <span style={{ color: 'var(--primary)' }}>{log.performedBy || 'Owner/Manager'}</span>
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
          <div className="modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
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
                  <label>Number of Packs</label>
                  <input
                    type="number"
                    name="packs"
                    className="form-input"
                    value={formData.packs}
                    onChange={handleInputChange}
                    style={inputBorderStyle}
                  />
                </div>

                <div className="form-group">
                  <label>Pieces Per Pack</label>
                  <input
                    type="number"
                    name="piecesPerPack"
                    className="form-input"
                    value={formData.piecesPerPack}
                    onChange={handleInputChange}
                    style={inputBorderStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Cost Price (₦ per piece)</label>
                  <input
                    type="number"
                    name="costPrice"
                    className="form-input"
                    value={formData.costPrice}
                    onChange={handleInputChange}
                    style={inputBorderStyle}
                  />
                </div>

                <div className="form-group">
                  <label>Selling Price (₦ per piece) <span className="required">*</span></label>
                  <input
                    type="number"
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
          <div className="modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
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
                  <label>Number of Packs</label>
                  <input
                    type="number"
                    name="packs"
                    className="form-input"
                    value={editFormData.packs}
                    onChange={handleEditInputChange}
                    style={inputBorderStyle}
                  />
                </div>

                <div className="form-group">
                  <label>Pieces Per Pack</label>
                  <input
                    type="number"
                    name="piecesPerPack"
                    className="form-input"
                    value={editFormData.piecesPerPack}
                    onChange={handleEditInputChange}
                    style={inputBorderStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Cost Price (₦ per piece)</label>
                  <input
                    type="number"
                    name="costPrice"
                    className="form-input"
                    value={editFormData.costPrice}
                    onChange={handleEditInputChange}
                    style={inputBorderStyle}
                  />
                </div>

                <div className="form-group">
                  <label>Selling Price (₦ per piece) <span className="required">*</span></label>
                  <input
                    type="number"
                    name="sellingPrice"
                    className="form-input"
                    value={editFormData.sellingPrice}
                    onChange={handleEditInputChange}
                    style={inputBorderStyle}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="submit-btn" style={{ marginTop: '10px' }}>
                Update Item
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;