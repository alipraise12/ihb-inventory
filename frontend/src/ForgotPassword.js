import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from './config';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // Step 1: Request Code, Step 2: Enter Code & New Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Resend Timer State
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const navigate = useNavigate();

  const showAlert = (message, type = 'error') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: '' });
    }, 4000);
  };

  // Countdown timer effect for Resend option
  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer, canResend]);

  // Handle Request Reset Code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showAlert('Password reset code sent to your email!', 'success');
        setStep(2);
        setTimer(60);
        setCanResend(false);
      } else {
        showAlert(data.message || 'Failed to send reset code.');
      }
    } catch (err) {
      showAlert('Network error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend Code Action
  const handleResendCode = async () => {
    if (!canResend || loading) return;
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showAlert('A new reset code has been sent!', 'success');
        setTimer(60);
        setCanResend(false);
      } else {
        showAlert(data.message || 'Failed to resend code.');
      }
    } catch (err) {
      showAlert('Network error resending code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Reset Submission
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showAlert('Password reset successful! Redirecting to login...', 'success');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        showAlert(data.message || 'Invalid or expired reset code.');
      }
    } catch (err) {
      showAlert('Network error resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {alert.show && (
        <div className={`custom-alert ${alert.type === 'success' ? 'success' : ''}`}>
          {alert.message}
        </div>
      )}

      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            {step === 1 ? 'Enter your registered email address' : 'Enter verification code & new password'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestCode}>
            <div className="form-group">
              <label>
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alipraise60@gmail.com"
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
              {loading ? 'Sending Code...' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>
                Reset Code <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
              />
            </div>

            <div className="form-group">
              <label>
                New Password <span className="required">*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{ paddingRight: '45px', width: '100%' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    color: '#64748b'
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Resend Option Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 20px', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Didn't receive the code?</span>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={!canResend || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: canResend ? 'var(--primary)' : '#94a3b8',
                  fontWeight: '700',
                  cursor: canResend ? 'pointer' : 'not-allowed',
                  padding: 0
                }}
              >
                {canResend ? 'Resend Code' : `Resend in ${timer}s`}
              </button>
            </div>

            <button type="submit" className="submit-btn" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ marginTop: '20px' }}>
          Remember your password?{' '}
          <Link to="/login" className="auth-link-inline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;