import React, { useState } from 'react';
import './App.css';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { API_URL } from './config';

export default function Register() {
  const navigate = useNavigate();
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ show: false, message: '', isSuccess: false });
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  // Password Visibility Toggle States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verification Code State
  const [verificationCode, setVerificationCode] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);

  const triggerAlert = (message, isSuccess = false) => {
    setAlertConfig({ show: true, message, isSuccess });
    setTimeout(() => {
      setAlertConfig({ show: false, message: '', isSuccess: false });
    }, 4000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Function to request code from Express server manually via button click
  const sendVerificationCode = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      triggerAlert('Please enter a valid email address first.');
      return;
    }

    if (loadingCode) return;
    setLoadingCode(true);

    try {
      const response = await fetch(`${API_URL}/api/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await response.json();

      if (data.success) {
        setIsEmailSent(true);
        triggerAlert(`Verification code sent to ${formData.email}! Check your inbox.`, true);
      } else {
        triggerAlert(data.message || 'Failed to send verification email.');
      }
    } catch (err) {
      triggerAlert('Cannot connect to backend server.');
    } finally {
      setLoadingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      triggerAlert('Please enter the 6-digit verification code.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: verificationCode }),
      });
      const data = await response.json();

      if (data.success) {
        setIsEmailVerified(true);
        triggerAlert('Email verified successfully!', true);
      } else {
        triggerAlert(data.message || 'Invalid verification code.');
      }
    } catch (err) {
      triggerAlert('Verification server error.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { fullName, email, phone, password, confirmPassword } = formData;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      triggerAlert('Please fill in all required fields!');
      return;
    }

    if (password !== confirmPassword) {
      triggerAlert('Passwords do not match!');
      return;
    }

    if (!isEmailVerified) {
      triggerAlert('Please verify your email address before continuing.');
      return;
    }

    if (!agreedTerms) {
      triggerAlert('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    // Call MongoDB Registration Endpoint
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, password }),
      });

      const data = await response.json();

      if (data.success) {
        triggerAlert('Account created successfully! Redirecting...', true);
        
        // Clear Form
        setFormData({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
        setVerificationCode('');
        setIsEmailSent(false);
        setIsEmailVerified(false);
        setAgreedTerms(false);

        // Save token if returned by your backend
        if (data.token) {
          localStorage.setItem('token', data.token);
        }

        // Redirect to post-registration Home page
        setTimeout(() => {
          navigate('/home');
        }, 1500);
      } else {
        triggerAlert(data.message || 'Failed to create account.');
      }
    } catch (err) {
      triggerAlert('Server connection error during registration.');
    }
  };

  return (
    <div className="auth-container">
      {alertConfig.show && (
        <div className={`custom-alert ${alertConfig.isSuccess ? 'success' : ''}`}>
          {alertConfig.message}
        </div>
      )}

      <div className="auth-header">
        <h2 className="auth-title">Sign up</h2>
        <p className="auth-subtitle">Create your account to manage your business efficiently.</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Full Name or Company Name <span className="required">*</span></label>
          <input
            type="text"
            name="fullName"
            className="form-input"
            placeholder="Enter full name or company name"
            value={formData.fullName}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Email Address <span className="required">*</span></label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              disabled={isEmailVerified}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="verify-btn"
              onClick={sendVerificationCode}
              disabled={isEmailVerified || loadingCode}
              style={{ whiteSpace: 'nowrap', padding: '0 16px' }}
            >
              {loadingCode ? 'Sending...' : isEmailSent ? 'Resend Code' : 'Send Code'}
            </button>
          </div>
        </div>

        {/* Verification input box appears once code has been requested */}
        {isEmailSent && (
          <div className="verification-box">
            <label>Enter Email Verification Code</label>
            <div className="verification-input-group">
              <input
                type="text"
                maxLength="6"
                className="form-input"
                placeholder="6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={isEmailVerified}
              />
              <button
                type="button"
                className="verify-btn"
                onClick={handleVerifyCode}
                disabled={isEmailVerified}
              >
                {isEmailVerified ? 'Verified ✓' : 'Verify'}
              </button>
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Phone Number <span className="required">*</span></label>
          <input
            type="tel"
            name="phone"
            className="form-input"
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        {/* Password Field */}
        <div className="form-group">
          <label>Password <span className="required">*</span></label>
          <div className="password-input-wrapper" style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              className="form-input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              style={{ width: '100%', paddingRight: '40px' }}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                color: '#aaa',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </span>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className="form-group">
          <label>Confirm Password <span className="required">*</span></label>
          <div className="password-input-wrapper" style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              className="form-input"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              style={{ width: '100%', paddingRight: '40px' }}
            />
            <span
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                color: '#aaa',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </span>
          </div>
        </div>

        <div className="terms-group">
          <input
            type="checkbox"
            id="terms"
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
          />
          <label htmlFor="terms">
            I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.
          </label>
        </div>

        <button type="submit" className="submit-btn">
          Create Account
        </button>
      </form>

      <div className="auth-footer">
        <span>Already have an account? </span>
        <Link to="/login" className="auth-link-inline">
          Sign in
        </Link>
      </div>
    </div>
  );
}