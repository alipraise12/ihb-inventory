import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from './config';

const Navbar = ({ userData }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false); // Close mobile drawer if resized to desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Brand Logo */}
        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', flexShrink: 0 }}>
          IHB <span style={{ color: '#4f46e5' }}>Inventory</span>
        </div>

        {/* Desktop Links (Hidden on mobile) */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/dashboard" style={{ color: isActive('/dashboard') ? '#4f46e5' : '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: isActive('/dashboard') ? '700' : '500' }}>Dashboard</Link>
            <Link to="/stock" style={{ color: isActive('/stock') ? '#4f46e5' : '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: isActive('/stock') ? '700' : '500' }}>Stock</Link>
            <Link to="/sales" style={{ color: isActive('/sales') ? '#4f46e5' : '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: isActive('/sales') ? '700' : '500' }}>Sales</Link>
            <Link to="/sales-summary" style={{ color: isActive('/sales-summary') ? '#4f46e5' : '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: isActive('/sales-summary') ? '700' : '500' }}>Sales Summary</Link>
            <Link to="/staff" style={{ color: isActive('/staff') ? '#4f46e5' : '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: isActive('/staff') ? '700' : '500' }}>Staff</Link>
            {userData?.role === 'owner' && (
              <Link to="/supply" style={{ color: isActive('/supply') ? '#4f46e5' : '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: isActive('/supply') ? '700' : '500' }}>Account & Supply</Link>
            )}
          </div>
        )}

        {/* User Badge, Logout & Hamburger Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#e0e7ff', color: '#4f46e5', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>
            {userData ? getInitials(userData.fullName) : 'U'}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700' }}
          >
            Logout
          </button>

          {/* Hamburger Toggle Button (Shows only on mobile) */}
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {isMobile && mobileMenuOpen && (
        <div style={{ background: '#fff', borderTop: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
          <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} style={{ color: isActive('/dashboard') ? '#4f46e5' : '#0f172a', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '600', padding: '6px 0' }}>📊 Dashboard</Link>
          <Link to="/stock" onClick={() => setMobileMenuOpen(false)} style={{ color: isActive('/stock') ? '#4f46e5' : '#0f172a', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '600', padding: '6px 0' }}>📦 Stock</Link>
          <Link to="/sales" onClick={() => setMobileMenuOpen(false)} style={{ color: isActive('/sales') ? '#4f46e5' : '#0f172a', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '600', padding: '6px 0' }}>🛒 Sales</Link>
          <Link to="/sales-summary" onClick={() => setMobileMenuOpen(false)} style={{ color: isActive('/sales-summary') ? '#4f46e5' : '#0f172a', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '600', padding: '6px 0' }}>📈 Sales Summary</Link>
          <Link to="/staff" onClick={() => setMobileMenuOpen(false)} style={{ color: isActive('/staff') ? '#4f46e5' : '#0f172a', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '600', padding: '6px 0' }}>👥 Staff</Link>
          {userData?.role === 'owner' && (
            <Link to="/supply" onClick={() => setMobileMenuOpen(false)} style={{ color: isActive('/supply') ? '#4f46e5' : '#0f172a', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '700', padding: '6px 0' }}>💳 Account & Supply</Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;