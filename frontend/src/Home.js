import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGetStarted = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Call endpoint to initialize or record the trial start timestamp in MongoDB
      await axios.post(
        'http://localhost:5000/api/start-trial',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err) {
      console.error('Error recording trial start timestamp:', err);
    } finally {
      setLoading(false);
      // Navigate to dashboard regardless of whether it's their first time or return visit
      navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={styles.pageWrapper}>
      {/* Top Header Bar */}
      <header style={styles.header}>
        <div style={styles.brandBadge}>IHB INVENT</div>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Sign Out
        </button>
      </header>

      {/* Main Hero Container */}
      <main style={styles.heroSection}>
        <div style={styles.glowEffect} />

        <div style={styles.badgeContainer}>
          <span style={styles.trialBadge}>🎉 60-Day Free Trial Activated</span>
        </div>

        <h1 style={styles.mainTitle}>
          Welcome to <span style={styles.gradientText}>IHB INVENT</span>
        </h1>

        <p style={styles.description}>
          Your seamless inventory management experience starts here. Click below to enter your dashboard and launch your full 60-day trial—no commitment required.
        </p>

        {/* Action Button */}
        <div style={styles.actionGroup}>
          <button
            style={{
              ...styles.primaryBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onClick={handleGetStarted}
            disabled={loading}
          >
            {loading ? 'Starting Trial...' : 'Get Started'}
            <span style={styles.arrowIcon}>→</span>
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📦</div>
            <h3 style={styles.featureTitle}>Real-Time Stock</h3>
            <p style={styles.featureSub}>Track inventory items and low-stock alerts live.</p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📈</div>
            <h3 style={styles.featureTitle}>Sales Analytics</h3>
            <p style={styles.featureSub}>Record sales and review performance metrics instantly.</p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>💳</div>
            <h3 style={styles.featureTitle}>Paystack Dedicated</h3>
            <p style={styles.featureSub}>Receive automated payments right into your account.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        © 2026 IHB INVENT • All rights reserved
      </footer>
    </div>
  );
};

// Styling Object matching your dark UI theme
const styles = {
  pageWrapper: {
    minHeight: '100vh',
    backgroundColor: '#0d0d12',
    color: '#ffffff',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '20px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1000px',
    width: '100%',
    margin: '0 auto',
    padding: '10px 0 20px 0',
  },
  brandBadge: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#f59e0b',
    letterSpacing: '1px',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #2a2a36',
    color: '#a1a1aa',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  heroSection: {
    maxWidth: '800px',
    width: '100%',
    margin: 'auto',
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
    padding: '30px 10px',
  },
  glowEffect: {
    position: 'absolute',
    top: '-80px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '300px',
    height: '300px',
    background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(0,0,0,0) 70%)',
    zIndex: -1,
    pointerEvents: 'none',
  },
  badgeContainer: {
    marginBottom: '20px',
  },
  trialBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  mainTitle: {
    fontSize: 'clamp(2rem, 5vw, 3.2rem)',
    fontWeight: '900',
    lineHeight: '1.2',
    margin: '0 0 16px 0',
    letterSpacing: '-0.5px',
  },
  gradientText: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  description: {
    fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
    color: '#a1a1aa',
    lineHeight: '1.6',
    maxWidth: '600px',
    margin: '0 auto 32px auto',
  },
  actionGroup: {
    marginBottom: '48px',
  },
  primaryBtn: {
    backgroundColor: '#f59e0b',
    color: '#000000',
    border: 'none',
    padding: '16px 40px',
    fontSize: '1.1rem',
    fontWeight: '700',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'transform 0.2s ease, boxShadow 0.2s ease',
  },
  arrowIcon: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginTop: '20px',
    textAlign: 'left',
  },
  featureCard: {
    backgroundColor: '#16161e',
    border: '1px solid #232330',
    padding: '20px',
    borderRadius: '12px',
  },
  featureIcon: {
    fontSize: '1.5rem',
    marginBottom: '10px',
  },
  featureTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 6px 0',
  },
  featureSub: {
    fontSize: '0.825rem',
    color: '#71717a',
    margin: 0,
    lineHeight: '1.4',
  },
  footer: {
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#52525b',
    paddingTop: '20px',
  },
};

export default Home;