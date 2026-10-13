import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Staff = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Form Data
  const initialFormState = {
    username: '',
    email: '',
    phone: '',
    password: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editFormData, setEditFormData] = useState({ fullName: '', phone: '', password: '' });

  // Audit Log State
  const [auditLog, setAuditLog] = useState(() => {
    const saved = localStorage.getItem('staff_audit_log');
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

  // Helper to log Staff Audit Actions with Performed By User
  const logAuditAction = useCallback((actionType, staffName, details) => {
    const currentUser = getCurrentUserName();
    const newEntry = {
      id: Date.now(),
      actionType,
      staffName,
      details,
      performedBy: currentUser,
      timestamp: new Date().toLocaleString(),
    };
    setAuditLog((prev) => {
      const updated = [newEntry, ...prev];
      localStorage.setItem('staff_audit_log', JSON.stringify(updated));
      return updated;
    });
  }, [getCurrentUserName]);

  // Fetch all staff members
  const fetchStaff = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    try {
      const res = await fetch('http://localhost:5000/api/staff/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStaffList(data.staff || []);
      } else {
        showAlert(data.message || 'Failed to fetch staff list', 'error');
      }
    } catch (err) {
      showAlert('Failed to connect to server', 'error');
    } finally {
      setLoading(false);
    }
  }, [navigate, showAlert]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Filter staff members dynamically
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const name = (s.fullName || s.username || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [staffList, searchTerm]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  // ADD SALES REP
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const payload = {
      fullName: formData.username,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
    };

    try {
      const res = await fetch('http://localhost:5000/api/staff/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        showAlert('Sales Representative added successfully!', 'success');
        setFormData(initialFormState);
        setShowAddModal(false);
        fetchStaff();
      } else {
        showAlert(data.message || 'Failed to register sales rep', 'error');
      }
    } catch (err) {
      showAlert('Failed to connect to server', 'error');
    }
  };

  // OPEN EDIT MODAL
  const handleOpenEdit = (userItem) => {
    setSelectedStaff(userItem);
    setEditFormData({
      fullName: userItem.fullName || userItem.username || '',
      phone: userItem.phone || '',
      password: '',
    });
    setShowEditModal(true);
  };

  // UPDATE SALES REP
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const staffId = selectedStaff?._id || selectedStaff?.id;

    if (!staffId) {
      showAlert('Invalid Staff ID', 'error');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/staff/${staffId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();

      if (data.success) {
        showAlert(`Staff details for "${editFormData.fullName}" updated!`, 'success');
        logAuditAction('EDIT', editFormData.fullName, `Updated phone to ${editFormData.phone}`);
        setShowEditModal(false);
        setSelectedStaff(null);
        fetchStaff();
      } else {
        showAlert(data.message || 'Failed to update staff member', 'error');
      }
    } catch (err) {
      showAlert('Failed to connect to server', 'error');
    }
  };

  // DELETE SALES REP
  const handleDelete = async (userItem) => {
    const staffName = userItem.fullName || userItem.username || 'Staff member';
    if (!window.confirm(`Are you sure you want to delete sales rep "${staffName}"?`)) return;

    const token = localStorage.getItem('token');
    const staffId = userItem._id || userItem.id;

    if (!staffId) {
      showAlert('Invalid Staff ID', 'error');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/staff/${staffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.success) {
        showAlert(`Sales representative "${staffName}" deleted!`, 'success');
        logAuditAction('DELETE', staffName, `Removed from staff list. Email: ${userItem.email}`);
        fetchStaff();
      } else {
        showAlert(data.message || 'Failed to delete staff member', 'error');
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
          <Link to="/stock" className="nav-item">Stock</Link>
          <Link to="/sales" className="nav-item">Sales</Link>
          <Link to="/staff" className="nav-item active">Staff</Link>
          <Link to="/supply" className="nav-item">Account/Supply</Link>
        </div>
      </nav>

      <main className="dashboard-content" style={{ maxWidth: '850px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 className="dashboard-title" style={{ margin: 0, fontSize: '1.6rem' }}>Staff & Sales Rep Management</h1>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="submit-btn" 
              style={{ background: '#ffffff', color: 'var(--text-main)', border: '1px solid #cbd5e1', boxShadow: 'none' }}
              onClick={() => setShowAuditModal(true)}
            >
              📜 Staff History ({auditLog.length})
            </button>
            <button 
              className="submit-btn" 
              onClick={() => setShowAddModal(true)}
            >
              + Add Sales Rep
            </button>
          </div>
        </div>

        <div className="board-card" style={{ padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Registered Sales Representatives</h2>
            
            <div style={{ width: '100%', maxWidth: '300px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 Search staff name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={inputBorderStyle}
              />
            </div>
          </div>

          {loading ? (
            <p className="info-row">Loading staff details...</p>
          ) : filteredStaff.length === 0 ? (
            <p className="info-row">
              {searchTerm ? `No staff matching "${searchTerm}"` : 'No sales representatives found. Click "+ Add Sales Rep" to add one.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '14px 12px', width: '50px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>S/N</th>
                    <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Staff Name</th>
                    <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Email / Phone</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', width: '150px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((userItem, index) => (
                    <tr key={userItem._id || userItem.id || index} style={{ borderBottom: '1px solid #e2e8f0' }} className="table-row-hover">
                      <td style={{ padding: '16px 12px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.95rem' }}>{index + 1}</td>
                      <td style={{ padding: '16px 12px', fontWeight: '700', color: 'var(--text-main)', fontSize: '1rem' }}>
                        {userItem.fullName || userItem.username}
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600' }}>{userItem.email}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{userItem.phone || 'No phone number'}</div>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleOpenEdit(userItem)}
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
                          onClick={() => handleDelete(userItem)}
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

      {/* Staff Activity Audit Modal */}
      {showAuditModal && (
        <div className="modal-overlay" onClick={() => setShowAuditModal(false)}>
          <div className="modal-card" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Staff Change History</h2>
              <button className="close-btn" onClick={() => setShowAuditModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {auditLog.length === 0 ? (
                <p className="info-row">No staff edit or deletion activity recorded.</p>
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
                          [{log.actionType}] {log.staffName}
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

      {/* Add Sales Rep Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Sales Rep</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
              <div className="form-group">
                <label>Sales Rep Name <span className="required">*</span></label>
                <input
                  type="text"
                  name="username"
                  className="form-input"
                  placeholder="e.g. John Doe"
                  value={formData.username}
                  onChange={handleInputChange}
                  style={inputBorderStyle}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address <span className="required">*</span></label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="e.g. john@ihbinventory.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={inputBorderStyle}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number <span className="required">*</span></label>
                <input
                  type="text"
                  name="phone"
                  className="form-input"
                  placeholder="e.g. 08012345678"
                  value={formData.phone}
                  onChange={handleInputChange}
                  style={inputBorderStyle}
                  required
                />
              </div>

              <div className="form-group">
                <label>Login Password <span className="required">*</span></label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="Assign initial password"
                  value={formData.password}
                  onChange={handleInputChange}
                  style={inputBorderStyle}
                  required
                />
              </div>

              <button type="submit" className="submit-btn" style={{ marginTop: '10px' }}>
                Register Sales Rep
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sales Rep Modal */}
      {showEditModal && selectedStaff && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Staff Details</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: '14px' }}>
              <div className="form-group">
                <label>Staff Full Name <span className="required">*</span></label>
                <input
                  type="text"
                  name="fullName"
                  className="form-input"
                  value={editFormData.fullName}
                  onChange={handleEditInputChange}
                  style={inputBorderStyle}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  className="form-input"
                  value={editFormData.phone}
                  onChange={handleEditInputChange}
                  style={inputBorderStyle}
                />
              </div>

              <div className="form-group">
                <label>Reset Password (Leave blank to keep unchanged)</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="New password..."
                  value={editFormData.password}
                  onChange={handleEditInputChange}
                  style={inputBorderStyle}
                />
              </div>

              <button type="submit" className="submit-btn" style={{ marginTop: '10px' }}>
                Update Staff Details
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;