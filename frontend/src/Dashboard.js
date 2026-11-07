import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePaystackPayment } from 'react-paystack';
import Navbar from './Navbar';
import { API_URL } from './config';

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

  // Modals & Expiration Lockout
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);

  // Live Countdown Timer State
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const navigate = useNavigate();

  const showAlert = useCallback((message, type = 'error') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: '', type: '' }), 4000);
  }, []);

  // Paystack Live Recurring Subscription Configuration
  const paystackConfig = {
    reference: `IHB_SUB_${new Date().getTime()}`,
    email: userData?.email || 'customer@example.com',
    amount: 3000 * 100, // ₦3,000 in Kobo
    plan: 'PLN_qz6kyp0hfambdg1',
    publicKey: 'pk_live_4f1d66e58fa075c893b4917ef13bbc58b2b6c672',
  };

  const onSuccess = async (reference) => {
    showAlert(`Subscription successful! Ref: ${reference.reference}`, 'success');
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reference: reference.reference }),
      });
      setShowUpgradeModal(false);
      setIsLockedOut(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Payment verification sync failed:', err);
    }
  };

  const onClose = () => {
    showAlert('Transaction canceled.', 'error');
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const handleProceedToPaystack = () => {
    initializePayment(onSuccess, onClose);
  };

  // Fetch Dashboard and Account Details
  const fetchDashboardData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    try {
      const [userRes, stockRes, salesRes] = await Promise.all([
        fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/stock`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/sales`, {
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
    if (!userData) return;

    let startDate;
    let totalDays = 60;

    if (userData.isSubscribed && userData.subscriptionDate) {
      startDate = new Date(userData.subscriptionDate);
      totalDays = 30;
    } else if (userData.trialStartDate) {
      startDate = new Date(userData.trialStartDate);
      totalDays = 60;
    } else if (userData.createdAt) {
      startDate = new Date(userData.createdAt);
      totalDays = 60;
    } else {
      startDate = new Date();
      totalDays = 60;
    }

    const expiryDate = new Date(startDate.getTime() + totalDays * 24 * 60 * 60 * 1000);

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
        setShowUpgradeModal(true);
        setIsLockedOut(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [userData]);

  return (
    <div className="inventory-layout" style={{ position: 'relative' }}>
      {alert.message && (
        <div className={`custom-alert ${alert.type}`}>{alert.message}</div>
      )}

      {/* Professional Responsive Navigation Bar */}
      <Navbar userData={userData} />

      {/* Main Content Dashboard */}
      <main className="dashboard-content" style={{ maxWidth: '950px', margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, color: 'var(--text-main)' }}>
            Welcome back, {userData?.fullName || '...'}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></span>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700' }}>
              {userData?.isSubscribed ? 'Subscription Ends In: ' : 'Trial Ends In: '}
              {timeLeft.days}d : {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
            </span>
          </div>
        </div>

        {loading ? (
          <p className="info-row">Loading dashboard metrics...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
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
        <div className="modal-overlay" onClick={() => !isLockedOut && setShowUpgradeModal(false)}>
          <div className="modal-card" style={{ maxWidth: '440px', padding: '24px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ justifyContent: 'center', position: 'relative' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0 }}>
                {isLockedOut ? 'Trial Expired — Upgrade Required' : 'Upgrade Your Subscription'}
              </h2>
              {!isLockedOut && (
                <button className="close-btn" type="button" style={{ position: 'absolute', right: 0 }} onClick={() => setShowUpgradeModal(false)}>✕</button>
              )}
            </div>

            <div style={{ padding: '20px 10px 10px 10px' }}>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '8px' }}>
                ₦3,000 <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-muted)' }}>/ month</span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.4' }}>
                {isLockedOut
                  ? 'Your 60-day trial or active subscription window has ended. Please renew to continue using IHB Inventory.'
                  : 'Unlock unlimited stock management, staff accounts, multi-format receipt exports, and real-time inventory tracking.'}
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