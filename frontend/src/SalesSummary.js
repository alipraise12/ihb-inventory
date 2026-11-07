import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from './config';

const SalesSummary = () => {
  const [sales, setSales] = useState([]);
  const [stockList, setStockList] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchDate, setSearchDate] = useState('');
  const [expandedDates, setExpandedDates] = useState({});
  const [alert, setAlert] = useState({ message: '', type: '' });

  const navigate = useNavigate();

  const showAlert = useCallback((message, type = 'error') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: '', type: '' }), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    try {
      const [userRes, salesRes, stockRes] = await Promise.all([
        fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/sales`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/stock`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const userJson = await userRes.json();
      const salesData = await salesRes.json();
      const stockData = await stockRes.json();

      if (userJson.success) {
        setUserData(userJson.user);
      }

      if (salesData.success) {
        setSales(salesData.sales || salesData.data || []);
      } else {
        showAlert(salesData.message || 'Failed to fetch sales history.', 'error');
      }

      if (stockData.success) {
        setStockList(stockData.stockItems || stockData.stock || []);
      }
    } catch (err) {
      showAlert('Server connection error.', 'error');
    } finally {
      setLoading(false);
    }
  }, [navigate, showAlert]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Format date helper: DD/MM/YYYY
  const formatDateKey = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown Date';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Convert input type="date" (YYYY-MM-DD) to DD/MM/YYYY for precise matching
  const formatSearchInput = (searchStr) => {
    if (!searchStr) return '';
    const parts = searchStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return searchStr;
  };

  const groupedSales = useMemo(() => {
    const groups = {};

    // 14th Oct 2026 start threshold to hide all older test records
    const CUTOFF_TIMESTAMP = new Date('2026-10-14T00:00:00.000Z').getTime();

    sales.forEach((sale) => {
      const rawDateObj = new Date(sale.saleDate || sale.createdAt || sale.date);
      
      // Hide legacy/old test data before today (14/10/2026)
      if (isNaN(rawDateObj.getTime()) || rawDateObj.getTime() < CUTOFF_TIMESTAMP) {
        return;
      }

      const dateKey = formatDateKey(rawDateObj);

      // Search Date Filter Matching
      if (searchDate) {
        const targetFormatted = formatSearchInput(searchDate);
        if (dateKey !== targetFormatted) {
          return;
        }
      }

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          rawDate: rawDateObj,
          totalRevenue: 0,
          totalProfit: 0,
          cashTotal: 0,
          transferTotal: 0,
          posTotal: 0,
          staffSalesMap: {},
          unlistedItems: [],
          unlistedTotalAmount: 0,
          itemsSold: [],
        };
      }

      const group = groups[dateKey];
      const totalAmount = Number(sale.totalAmount || 0);
      const paymentMethod = (sale.paymentMethod || 'Cash').toLowerCase();

      const sellerName = 
        sale.soldBy?.fullName || 
        sale.sellerName || 
        sale.staffName || 
        sale.user?.fullName || 
        'Owner';

      group.totalRevenue += totalAmount;

      if (paymentMethod.includes('cash')) group.cashTotal += totalAmount;
      else if (paymentMethod.includes('transfer') || paymentMethod.includes('bank')) group.transferTotal += totalAmount;
      else if (paymentMethod.includes('pos') || paymentMethod.includes('card')) group.posTotal += totalAmount;
      else group.cashTotal += totalAmount;

      if (!group.staffSalesMap[sellerName]) {
        group.staffSalesMap[sellerName] = 0;
      }
      group.staffSalesMap[sellerName] += totalAmount;

      // Iterate items inside sale
      const saleItems = sale.items && sale.items.length > 0 ? sale.items : [{
        productName: sale.productName || 'Product',
        quantity: sale.quantity || 1,
        unitPrice: sale.unitPrice || totalAmount,
        costPrice: sale.costPrice || 0,
        stockId: sale.stockId,
        isCustomItem: sale.isCustomItem
      }];

      saleItems.forEach((item) => {
        const itemName = item.productName || 'Product';
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice || 0);
        const itemRevenue = qty * unitPrice;

        let costPrice = Number(item.costPrice || 0);
        let isUnlisted = item.isCustomItem || item.isUnlisted || costPrice <= 0;

        if (!isUnlisted && costPrice <= 0 && item.stockId) {
          const matchedStock = stockList.find(s => String(s._id || s.id) === String(item.stockId));
          if (matchedStock) costPrice = Number(matchedStock.costPrice || 0);
        }

        if (isUnlisted || costPrice <= 0) {
          group.unlistedItems.push({
            name: itemName,
            amount: itemRevenue,
            qty: qty,
            soldBy: sellerName,
          });
          group.unlistedTotalAmount += itemRevenue;
        } else {
          const profit = (unitPrice - costPrice) * qty;
          group.totalProfit += profit > 0 ? profit : 0;
        }
      });

      group.itemsSold.push(sale);
    });

    return Object.values(groups).sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
  }, [sales, stockList, searchDate]);

  const toggleExpand = (dateKey) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {alert.message && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, padding: '12px 20px', borderRadius: '8px', color: '#fff', backgroundColor: alert.type === 'error' ? '#ef4444' : '#22c55e', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: '600' }}>
          {alert.message}
        </div>
      )}

      {/* Professional Navigation Bar */}
      <nav className="inventory-nav">
        <div className="nav-top-row">
          <div className="nav-brand">
            IHB <span className="highlight-text">Inventory</span>
          </div>

          <div className="nav-actions-group">
            <div className="user-avatar-badge">
              {userData ? getInitials(userData.fullName) : '...'}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="logout-badge-btn"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Clean Scrollable Navigation Tabs */}
        <div className="nav-links">
          <Link to="/dashboard" className="nav-item">Dashboard</Link>
          <Link to="/stock" className="nav-item">Stock</Link>
          <Link to="/sales" className="nav-item">Sales</Link>
          <Link to="/sales-summary" className="nav-item active">Sales Summary</Link>
          <Link to="/staff" className="nav-item">Staff</Link>
          {userData?.role === 'owner' && (
            <Link to="/supply" className="nav-item account-tab-item">
              <span className="account-text-full">Account/Supply</span>
              <span className="account-text-mobile">Account</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Professional CSS Styling for Mobile & Desktop */}
      <style>{`
        .inventory-nav {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px 20px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
        }
        .nav-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .nav-brand {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.02em;
        }
        .highlight-text {
          color: #4f46e5;
        }
        .nav-actions-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .user-avatar-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #4f46e5;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.8rem;
          flex-shrink: 0;
        }
        .logout-badge-btn {
          padding: 5px 12px;
          border-radius: 6px;
          border: 1px solid #ef4444;
          background-color: transparent;
          color: #ef4444;
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          white-space: nowrap;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          width: 100%;
          padding-bottom: 4px;
          scrollbar-width: none;
        }
        .nav-links::-webkit-scrollbar {
          display: none;
        }
        .nav-item {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #4b5563;
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .nav-item.active {
          background-color: #ede9fe;
          color: #4f46e5;
          font-weight: 700;
        }
        .account-text-mobile {
          display: none;
        }

        @media (max-width: 640px) {
          .inventory-nav {
            padding: 10px 12px;
          }
          .account-text-full {
            display: none;
          }
          .account-text-mobile {
            display: inline !important;
          }
        }
      `}</style>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Title and Date Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              📊 Daily Sales Summary Breakdown
            </h1>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>
              Click on any date to inspect payment channels, staff totals, profits, and unlisted sales.
            </p>
          </div>

          {/* Search Date Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#ffffff', padding: '6px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}>Search Date:</label>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.88rem',
                outline: 'none',
                color: '#1e293b',
                backgroundColor: 'transparent',
                fontWeight: '500',
              }}
            />
            {searchDate && (
              <button
                type="button"
                onClick={() => setSearchDate('')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontWeight: '500' }}>
            Loading daily sales breakdown...
          </div>
        ) : groupedSales.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '48px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: 0, color: '#334155', fontSize: '1.1rem' }}>No sales record found for the selected date.</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {groupedSales.map((dayGroup) => {
              const isExpanded = !!expandedDates[dayGroup.date];

              return (
                <div
                  key={dayGroup.date}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleExpand(dayGroup.date)}
                    style={{
                      padding: '20px 24px',
                      backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b' }}>
                        📅 {dayGroup.date}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          backgroundColor: '#e0e7ff',
                          color: '#3730a3',
                          fontWeight: '600',
                        }}
                      >
                        {dayGroup.itemsSold.length} Sales Transaction(s)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#16a34a' }}>
                          ₦{dayGroup.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Total Sold</div>
                      </div>
                      <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div style={{ padding: '24px', backgroundColor: '#ffffff' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                        {/* Payment Breakdown */}
                        <div style={{ padding: '18px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 14px 0', fontSize: '0.88rem', color: '#1e293b', fontWeight: '700', textTransform: 'uppercase' }}>
                            💳 Payment Channel Breakdown
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: '#475569' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>💵 Cash:</span>
                              <strong style={{ color: '#1e293b' }}>₦{dayGroup.cashTotal.toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>🏦 Bank Transfer:</span>
                              <strong style={{ color: '#1e293b' }}>₦{dayGroup.transferTotal.toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>💳 POS:</span>
                              <strong style={{ color: '#1e293b' }}>₦{dayGroup.posTotal.toLocaleString()}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Staff / Owner Breakdown */}
                        <div style={{ padding: '18px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 14px 0', fontSize: '0.88rem', color: '#1e293b', fontWeight: '700', textTransform: 'uppercase' }}>
                            👤 Sales Sold by Staff / Owner
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: '#475569' }}>
                            {Object.entries(dayGroup.staffSalesMap).map(([seller, sellerTotal]) => (
                              <div key={seller} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>👤 {seller}:</span>
                                <strong style={{ color: '#4f46e5' }}>₦{sellerTotal.toLocaleString()}</strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Total Profit Metric */}
                        <div style={{ padding: '18px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.88rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>
                            📈 Total Profit Made
                          </h4>
                          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#16a34a' }}>
                            ₦{dayGroup.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#15803d', lineHeight: '1.4' }}>
                            Calculated as (Selling Price - Cost Price) for listed products.
                          </p>
                        </div>
                      </div>

                      {/* Unlisted Items Breakdown with Total Amount */}
                      {dayGroup.unlistedItems.length > 0 && (
                        <div style={{ padding: '18px', backgroundColor: '#fefce8', borderRadius: '10px', border: '1px solid #fef08a' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#854d0e', fontWeight: '700', textTransform: 'uppercase' }}>
                              ⚠️ Unlisted Items Sold on {dayGroup.date} ({dayGroup.unlistedItems.length} item(s))
                            </h4>
                            <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#854d0e' }}>
                              Total Unlisted: ₦{dayGroup.unlistedTotalAmount.toLocaleString()}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {dayGroup.unlistedItems.map((uItem, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#713f12' }}>
                                <span><strong>{uItem.name}</strong> ({uItem.qty} qty) — Sold by {uItem.soldBy}</span>
                                <strong style={{ color: '#854d0e' }}>₦{uItem.amount.toLocaleString()}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default SalesSummary;