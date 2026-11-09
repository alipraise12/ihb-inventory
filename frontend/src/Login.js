import React, { useState } from 'react';
import { API_URL } from './config';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [loading, setLoading] = useState(false);

  const { email, password } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const showAlert = (message, type = 'error') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: '' });
    }, 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store JWT Token and User Profile in LocalStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showAlert('Login successful! Redirecting...', 'success');

        // Redirect after 1.5s
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        showAlert(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      showAlert('Network error. Is your server running or accessible?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {/* Toast Alert System from App.css */}
      {alert.show && (
        <div className={`custom-alert ${alert.type === 'success' ? 'success' : ''}`}>
          {alert.message}
        </div>
      )}

      {/* Auth Card Layout matching App.css */}
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Email Address <span className="required">*</span>
            </label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={email}
              onChange={handleChange}
              placeholder="alipraise60@gmail.com"
              required
            />
          </div>

          <div className="form-group">
            <label>
              Password <span className="required">*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                value={password}
                onChange={handleChange}
                placeholder="Enter your password"
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

          {/* Forgot Password Link */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <a href="/forgot-password" className="auth-link-inline" style={{ fontSize: '0.9rem', textDecoration: 'none' }}>
              Forgot Password?
            </a>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?
          <a href="/register" className="auth-link-inline">
            Register Here
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;