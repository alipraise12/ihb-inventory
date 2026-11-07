import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CreateAccount = () => {
  const [accountName, setAccountName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transferPin, setTransferPin] = useState('');
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

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/account/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accountName, phoneNumber, transferPin }),
      });

      const data = await res.json();
      if (data.success) {
        showAlert('Business account generated successfully!', 'success');
        setTimeout(() => {
          navigate('/supply'); // Redirect to transfer dashboard
        }, 1500);
      } else {
        showAlert(data.message || 'Failed to generate account.');
        setLoading(false);
      }
    } catch (err) {
      showAlert('Server error creating account.');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {alert.show && (
        <div className={`custom-alert ${alert.type === 'success' ? 'success' : ''}`}>
          {alert.message}
        </div>
      )}

      <div className="auth-container" style={{ width: '100%', maxWidth: '450px' }}>
        <div className="auth-header">
          <h1 className="auth-title">Generate Account</h1>
          <p className="auth-subtitle">Provision your dedicated Paystack settlement account</p>
        </div>

        <form onSubmit={handleCreateAccount}>
          <div className="form-group">
            <label>Account Name <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. John Doe Enterprises"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 08012345678"
              required
            />
          </div>

          <div className="form-group">
            <label>Payment PIN (4-Digit) <span className="required">*</span></label>
            <input
              type="password"
              className="form-input"
              value={transferPin}
              onChange={(e) => setTransferPin(e.target.value)}
              placeholder="****"
              maxLength="4"
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Generating Account...' : 'Generate Business Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateAccount;