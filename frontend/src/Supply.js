import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Supply = () => {
  const [userAccount, setUserAccount] = useState(null);
  const [step, setStep] = useState(1); // 1: Phone, 2: Verify OTP & PIN
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [transferPin, setTransferPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch existing account details on load
    const fetchAccountDetails = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/account/details', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.hasAccount) {
          setUserAccount(data.account);
        }
      } catch (err) {
        console.error('Error loading account details:', err);
      }
    };

    fetchAccountDetails();
  }, [token, navigate]);

  // Step 1: Request OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/account/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`OTP sent! (Demo OTP: ${data.demoOtp || '123456'})`);
        setStep(2);
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setError('Server error sending OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Set Transfer PIN
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const storedUser = JSON.parse(localStorage.getItem('user')) || {};

    try {
      const res = await fetch('http://localhost:5000/api/account/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          otp,
          transferPin,
          fullName: storedUser.fullName || 'User',
          email: storedUser.email || '',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUserAccount(data.account);
        setSuccessMsg('Account generated successfully!');
      } else {
        setError(data.message || 'Failed to generate account.');
      }
    } catch (err) {
      setError('Server error creating account.');
    } finally {
      setLoading(false);
    }
  };

  return React.createElement(
    'div',
    { className: 'inventory-layout' },
    // Navigation Bar
    React.createElement(
      'nav',
      { className: 'inventory-nav' },
      React.createElement(
        'div',
        { className: 'nav-brand' },
        'IHB ',
        React.createElement('span', { className: 'highlight-text' }, 'Inventory')
      ),
      React.createElement(
        'div',
        { className: 'nav-links' },
        React.createElement(Link, { to: '/dashboard', className: 'nav-item' }, 'Dashboard'),
        React.createElement(Link, { to: '/stock', className: 'nav-item' }, 'Stock'),
        React.createElement(Link, { to: '/sales', className: 'nav-item' }, 'Sales'),
        React.createElement(Link, { to: '/supply', className: 'nav-item active' }, 'Account/Supply')
      )
    ),

    // Main Content
    React.createElement(
      'main',
      { className: 'dashboard-content', style: { maxWidth: '600px', margin: '0 auto', paddingTop: '40px' } },
      React.createElement('h1', { className: 'dashboard-title' }, 'Account & Supply Session'),

      // Alerts
      error && React.createElement('div', { style: { color: '#e74c3c', marginBottom: '15px' } }, error),
      successMsg && React.createElement('div', { style: { color: '#2ecc71', marginBottom: '15px' } }, successMsg),

      // Existing Account View OR Multi-Step Form
      userAccount
        ? React.createElement(
            'div',
            { className: 'board-card', style: { padding: '24px', borderRadius: '12px', background: '#1e1e1e' } },
            React.createElement('h2', { style: { marginBottom: '16px' } }, 'Your Dedicated Paystack Account'),
            React.createElement(
              'div',
              { style: { background: '#2a2a2a', padding: '16px', borderRadius: '8px', marginBottom: '12px' } },
              React.createElement('p', { style: { color: '#aaa', fontSize: '14px' } }, 'Bank Name'),
              React.createElement('h3', null, userAccount.bankName)
            ),
            React.createElement(
              'div',
              { style: { background: '#2a2a2a', padding: '16px', borderRadius: '8px', marginBottom: '12px' } },
              React.createElement('p', { style: { color: '#aaa', fontSize: '14px' } }, 'Account Number'),
              React.createElement('h2', { style: { color: '#f39c12' } }, userAccount.accountNumber)
            ),
            React.createElement(
              'div',
              { style: { background: '#2a2a2a', padding: '16px', borderRadius: '8px' } },
              React.createElement('p', { style: { color: '#aaa', fontSize: '14px' } }, 'Linked Phone Number'),
              React.createElement('p', null, React.createElement('strong', null, userAccount.phoneNumber))
            )
          )
        : React.createElement(
            'div',
            { className: 'board-card', style: { padding: '24px', borderRadius: '12px', background: '#1e1e1e' } },
            step === 1
              ? React.createElement(
                  'form',
                  { onSubmit: handleSendOtp },
                  React.createElement('h2', null, 'Step 1: Phone Verification'),
                  React.createElement(
                    'p',
                    { style: { color: '#aaa', marginBottom: '20px' } },
                    'Enter your phone number to receive a verification OTP and create your dedicated account.'
                  ),
                  React.createElement(
                    'div',
                    { style: { marginBottom: '15px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px' } }, 'Phone Number'),
                    React.createElement('input', {
                      type: 'text',
                      placeholder: 'e.g. 08012345678',
                      value: phoneNumber,
                      onChange: (e) => setPhoneNumber(e.target.value),
                      required: true,
                      style: { width: '100%', padding: '10px', borderRadius: '6px', background: '#2b2b2b', color: '#fff', border: '1px solid #444' },
                    })
                  ),
                  React.createElement(
                    'button',
                    { type: 'submit', disabled: loading, className: 'logout-btn', style: { width: '100%', background: '#f39c12' } },
                    loading ? 'Sending OTP...' : 'Send Verification OTP'
                  )
                )
              : React.createElement(
                  'form',
                  { onSubmit: handleCreateAccount },
                  React.createElement('h2', null, 'Step 2: Enter OTP & Set Transfer PIN'),
                  React.createElement(
                    'div',
                    { style: { marginBottom: '15px', marginTop: '15px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px' } }, '6-Digit OTP Code'),
                    React.createElement('input', {
                      type: 'text',
                      placeholder: 'Enter 6-digit OTP',
                      value: otp,
                      onChange: (e) => setOtp(e.target.value),
                      required: true,
                      maxLength: 6,
                      style: { width: '100%', padding: '10px', borderRadius: '6px', background: '#2b2b2b', color: '#fff', border: '1px solid #444' },
                    })
                  ),
                  React.createElement(
                    'div',
                    { style: { marginBottom: '20px' } },
                    React.createElement('label', { style: { display: 'block', marginBottom: '8px' } }, 'Create 4-Digit Transfer PIN'),
                    React.createElement('input', {
                      type: 'password',
                      placeholder: '****',
                      value: transferPin,
                      onChange: (e) => setTransferPin(e.target.value),
                      required: true,
                      maxLength: 4,
                      style: { width: '100%', padding: '10px', borderRadius: '6px', background: '#2b2b2b', color: '#fff', border: '1px solid #444' },
                    })
                  ),
                  React.createElement(
                    'button',
                    { type: 'submit', disabled: loading, className: 'logout-btn', style: { width: '100%', background: '#2ecc71' } },
                    loading ? 'Generating Account...' : 'Verify & Generate Paystack Account'
                  )
                )
          )
    )
  );
};

export default Supply;