import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const API_BASE_URL = 'http://localhost:5000/api';

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

  // Memoized function to request code from Express server
  const sendVerificationCode = useCallback(async (userEmail) => {
    if (!userEmail || loadingCode) return;
    setLoadingCode(true);

    try {
      const response = await fetch(`${API_BASE_URL}/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await response.json();

      if (data.success) {
        setIsEmailSent(true);
        triggerAlert(`Verification code sent to ${userEmail}! Check your inbox.`, true);
      } else {
        triggerAlert(data.message || 'Failed to send verification email.');
      }
    } catch (err) {
      triggerAlert('Cannot connect to server on port 5000.');
    } finally {
      setLoadingCode(false);
    }
  }, [loadingCode]);

  // Automatically trigger email code request when a valid email format is written
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(formData.email) && !isEmailSent && !isEmailVerified && !loadingCode) {
      sendVerificationCode(formData.email);
    }
  }, [formData.email, isEmailSent, isEmailVerified, loadingCode, sendVerificationCode]);

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      triggerAlert('Please enter the 6-digit verification code.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/verify-code`, {
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
      const response = await fetch(`${API_BASE_URL}/register`, {
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

  // Social Login Handlers
  const handleGoogleSuccess = (credentialResponse) => {
    triggerAlert('Google Sign-In Successful!', true);
    console.log('Google Credential:', credentialResponse);
    navigate('/home');
  };

  const handleGoogleError = () => {
    triggerAlert('Google Sign-In Failed.');
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  return (
    <GoogleOAuthProvider clientId="105856944112-o387b0r920l02cgg37qcm0j06rk0vl93.apps.googleusercontent.com">
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
            <label>Full Name <span className="required">*</span></label>
            <input
              type="text"
              name="fullName"
              className="form-input"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Email Address <span className="required">*</span></label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              disabled={isEmailVerified}
            />
          </div>

          {/* Verification input stays visible once email is valid */}
          {(isValidEmail || isEmailSent) && (
            <div className="verification-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Enter Email Verification Code</label>
                {!isEmailVerified && isEmailSent && (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#ffca28', cursor: 'pointer', fontSize: '0.8rem' }}
                    onClick={() => sendVerificationCode(formData.email)}
                    disabled={loadingCode}
                  >
                    Resend Code
                  </button>
                )}
              </div>
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
                  disabled={isEmailVerified || loadingCode}
                >
                  {isEmailVerified ? 'Verified ✓' : loadingCode ? 'Sending...' : 'Verify'}
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

        <div className="divider">
          <span>OR</span>
        </div>

        {/* Social Login Option */}
        <div className="social-login-container">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
          />
        </div>

        <div className="auth-footer">
          <span>Already have an account? </span>
          <Link to="/login" className="auth-link-inline">
            Sign in
          </Link>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}