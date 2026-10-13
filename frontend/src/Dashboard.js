import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePaystackPayment } from 'react-paystack';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [stockSummary, setStockSummary] = useState({ totalUnits: 0, count: 0 });
  const [salesSummary, setSalesSummary] = useState({
    todayRevenue: 0,
    todayTransactions: 0,
    cashSales: 0,
    transferSales: 0,
    posSales: 0,
    staffSales: 0,
    debts: 0,
  });

  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ message: '', type: '' });
  
  // Modals
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Live Countdown Timer State
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const navigate = useNavigate();

  // WhatsApp Feedback details
  const whatsappNumber = '2347067715543';
  const whatsappMessage = encodeURIComponent('Hello! I have some feedback/inquiry regarding IHB Inventory:');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const showAlert = useCallback((message, type = 'error') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: '', type: '' }), 4000);
  }, []);

  // Paystack Live Recurring Subscription Configuration
  const paystackConfig = {
    reference: `IHB_SUB_${new Date().getTime()}`,
    email: userData?.email || 'customer@example.com',
    amount: 3000 * 100, // ₦3,000 in Kobo
    plan: 'PLN_qz6kyp0hfambdg1', // Integrated Paystack Plan Code
    publicKey: 'pk_live_4f1d66e58fa075c893b4917ef13bbc58b2b6c672',
  };

  const onSuccess = (reference) => {
    showAlert(`Subscription successful! Ref: ${reference.reference}`, 'success');
    setShowUpgradeModal(false);
  };

  const onClose = () => {
    showAlert('Transaction canceled.', 'error');
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const handleProceedToPaystack = () => {
    initializePayment(onSuccess, onClose);
  };

  // Fetch Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    try {
      const [userRes, stockRes, salesRes] = await Promise.all([
        fetch('http://localhost:5000/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5000/api/stock', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5000/api/sales', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const userJson = await userRes.json();
      const stockJson = await stockRes.json();
      const salesJson = await salesRes.json();

      if (userJson.success) {
        setUserData(userJson.user);
        localStorage.setItem('user', JSON.stringify(userJson.user));
      }

      if (stockJson.success) {
        setStockSummary({
          totalUnits: stockJson.totalUnits || stockJson.totalStock || 0,
          count: stockJson.count || 0,
        });
      }

      if (salesJson.success) {
        setSalesSummary({
          todayRevenue: salesJson.todayRevenue || salesJson.todaySales || 0,
          todayTransactions: salesJson.todayTransactionsCount || salesJson.todayTransactions || 0,
          cashSales: salesJson.cashSales || 0,
          transferSales: salesJson.transferSales || 0,
          posSales: salesJson.posSales || 0,
          staffSales: salesJson.staffSales || 0,
          debts: salesJson.debts || 0,
        });
      }
    } catch (err) {
      showAlert('Failed to connect to backend server.', 'error');
    } finally {
      setLoading(false);
    }
  }, [navigate, showAlert]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Dynamic Live Countdown Timer Logic
  useEffect(() => {
    const registrationDate = userData?.createdAt ? new Date(userData.createdAt) : new Date();
    const expiryDate = new Date(registrationDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = expiryDate.getTime() - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [userData]);

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

  return (
    <div className="inventory-layout">
      {alert.message && (
        <div className={`custom-alert ${alert.type}`}>{alert.message}</div>
      )}

      {/* Navigation Bar */}
      <nav className="inventory-nav">
        <div className="nav-brand">
          IHB <span className="highlight-text">Inventory</span>
        </div>

        <div className="nav-links">
          <Link to="/dashboard" className="nav-item active">Dashboard</Link>
          <Link to="/stock" className="nav-item">Stock</Link>
          <Link to="/sales" className="nav-item">Sales</Link>
          <Link to="/sales-summary" className="nav-item">Sales Summary</Link>
          <Link to="/staff" className="nav-item">Staff</Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Upgrade Plan Trigger Button */}
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className="submit-btn"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
              cursor: 'pointer',
            }}
          >
            ♛ Upgrade Plan
          </button>

          {/* Direct WhatsApp Feedback Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '20px',
              backgroundColor: '#e8f5e9',
              border: '1px solid #a5d6a7',
              color: '#1b5e20',
              fontWeight: '700',
              fontSize: '0.82rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
            title="Chat directly on WhatsApp for support or feedback"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
              <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 5.001l-1.416 5.166 5.289-1.385c1.467.8 3.123 1.22 4.781 1.22h.004c5.505 0 9.988-4.478 9.989-9.984 0-2.668-1.038-5.176-2.925-7.062-1.887-1.886-4.396-2.924-7.064-2.924zm5.83 14.288c-.242.682-1.411 1.302-1.956 1.384-.504.076-1.161.107-1.87-.121-.43-.138-.985-.32-1.705-.631-3.031-1.312-5.003-4.391-5.155-4.595-.152-.204-1.238-1.648-1.238-3.146 0-1.498.784-2.235 1.062-2.538.278-.303.607-.379.809-.379.202 0 .405.002.582.01.189.008.441-.072.69.525.253.606.86 2.1.936 2.252.076.152.126.329.025.531-.101.202-.152.329-.303.505-.152.177-.32.395-.457.531-.152.152-.31.317-.133.62.177.303.788 1.298 1.69 2.102 1.16 1.033 2.138 1.353 2.441 1.505.303.152.481.126.658-.076.177-.202.758-.884.96-1.187.202-.303.405-.253.682-.152.278.101 1.769.834 2.072.986.303.152.505.228.582.354.076.126.076.733-.166 1.415z" />
            </svg>
            Feedback
          </a>

          {/* User Avatar Badge */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '0.85rem',
            }}
          >
            {userData ? getInitials(userData.fullName) : 'U'}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid var(--danger)',
              backgroundColor: 'transparent',
              color: 'var(--danger)',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content Dashboard */}
      <main className="dashboard-content" style={{ maxWidth: '950px', margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, color: 'var(--text-main)' }}>
            Welcome back, {userData?.fullName || 'Praise Ali'}
          </h1>
          
          {/* Live Countdown Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></span>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700' }}>
              Trial Ends In: {timeLeft.days}d : {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
            </span>
          </div>
        </div>

        {loading ? (
          <p className="info-row">Loading dashboard metrics...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {/* Total Stock Card */}
            <div className="board-card" style={{ padding: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', fontWeight: '700' }}>
                Total Stock Items
              </h3>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--primary)', margin: '14px 0 6px 0' }}>
                {stockSummary.totalUnits} units
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {stockSummary.count} distinct items in warehouse
              </p>
            </div>

            {/* Today's Sales Card */}
            <div className="board-card" style={{ padding: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', fontWeight: '700' }}>
                Today's Sales
              </h3>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--primary)', margin: '14px 0 6px 0' }}>
                ₦{salesSummary.todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {salesSummary.todayTransactions} transaction(s) today
              </p>
            </div>

            {/* Sales Summary Card */}
            <div className="board-card" style={{ padding: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', fontWeight: '700' }}>
                Sales Summary
              </h3>
              <div style={{ margin: '14px 0 6px 0' }}>
                <Link
                  to="/sales-summary"
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: '800',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  📊 View Breakdown
                </Link>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Click to view daily sales, payment breakdown & profits
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Upgrade Plan Pop-up Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-card" style={{ maxWidth: '440px', padding: '24px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ justifyContent: 'center', position: 'relative' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Upgrade Your Subscription</h2>
              <button className="close-btn" type="button" style={{ position: 'absolute', right: 0 }} onClick={() => setShowUpgradeModal(false)}>✕</button>
            </div>

            <div style={{ padding: '20px 10px 10px 10px' }}>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '8px' }}>
                ₦3,000 <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-muted)' }}>/ month</span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.4' }}>
                Unlock unlimited stock management, staff accounts, multi-format receipt exports, and real-time inventory tracking.
              </p>

              <button
                type="button"
                onClick={handleProceedToPaystack}
                className="submit-btn"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                  cursor: 'pointer',
                }}
              >
                Proceed to Paystack Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;