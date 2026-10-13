import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const SalesSummary = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchDate, setSearchDate] = useState('');
  const [expandedDates, setExpandedDates] = useState({});
  const [alert, setAlert] = useState({ message: '', type: '' });

  const navigate = useNavigate();

  const showAlert = useCallback((message, type = 'error') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: '', type: '' }), 4000);
  }, []);

  // Fetch sales records
  const fetchSalesData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    try {
      const res = await fetch('http://localhost:5000/api/sales', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setSales(data.sales || data.data || []);
      } else {
        showAlert(data.message || 'Failed to fetch sales history.', 'error');
      }
    } catch (err) {
      showAlert('Server connection error.', 'error');
    } finally {
      setLoading(false);
    }
  }, [navigate, showAlert]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // Format date helper: DD/MM/YYYY
  const formatDateKey = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown Date';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Group sales by Date
  const groupedSales = useMemo(() => {
    const groups = {};

    sales.forEach((sale) => {
      const dateKey = formatDateKey(sale.createdAt || sale.date);

      // Apply Date Search Filter
      if (searchDate) {
        const searchFormatted = formatDateKey(searchDate);
        if (dateKey !== searchFormatted && !dateKey.includes(searchDate)) {
          return;
        }
      }

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          rawDate: sale.createdAt || sale.date,
          totalRevenue: 0,
          totalProfit: 0,
          cashTotal: 0,
          transferTotal: 0,
          posTotal: 0,
          staffSalesMap: {},
          unlistedItems: [],
          itemsSold: [],
        };
      }

      const group = groups[dateKey];
      const amount = Number(sale.totalAmount || sale.amount || sale.price || 0);
      const qty = Number(sale.quantity || sale.qty || 1);
      const paymentMethod = (sale.paymentMethod || sale.paymentType || 'Cash').toLowerCase();
      const sellerName = sale.sellerName || sale.staffName || sale.user?.fullName || sale.createdByName || 'Owner';

      group.totalRevenue += amount;

      // Payment Method Totals
      if (paymentMethod.includes('cash')) group.cashTotal += amount;
      else if (paymentMethod.includes('transfer') || paymentMethod.includes('bank')) group.transferTotal += amount;
      else if (paymentMethod.includes('pos') || paymentMethod.includes('card')) group.posTotal += amount;
      else group.cashTotal += amount;

      // Staff / Owner Sales Mapping
      if (!group.staffSalesMap[sellerName]) {
        group.staffSalesMap[sellerName] = 0;
      }
      group.staffSalesMap[sellerName] += amount;

      // Profit Calculation & Unlisted Item Check
      const isUnlisted = sale.isUnlisted || sale.unlisted || !sale.costPrice || sale.itemType === 'unlisted';
      
      if (isUnlisted) {
        group.unlistedItems.push({
          name: sale.itemName || sale.productName || 'Unlisted Product',
          amount: amount,
          qty: qty,
          soldBy: sellerName,
        });
      } else {
        const costPrice = Number(sale.costPrice || sale.product?.costPrice || 0);
        const profit = (amount - (costPrice * qty));
        group.totalProfit += profit > 0 ? profit : 0;
      }

      group.itemsSold.push(sale);
    });

    return Object.values(groups).sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
  }, [sales, searchDate]);

  const toggleExpand = (dateKey) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  return (
    <div className="inventory-layout">
      {alert.message && <div className={`custom-alert ${alert.type}`}>{alert.message}</div>}

      {/* Navigation Header */}
      <nav className="inventory-nav">
        <div className="nav-brand">
          IHB <span className="highlight-text">Inventory</span>
        </div>
        <div className="nav-links">
          <Link to="/dashboard" className="nav-item">Dashboard</Link>
          <Link to="/stock" className="nav-item">Stock</Link>
          <Link to="/sales" className="nav-item">Sales</Link>
          <Link to="/sales-summary" className="nav-item active">Sales Summary</Link>
          <Link to="/staff" className="nav-item">Staff</Link>
        </div>
      </nav>

      <main style={{ maxWidth: '950px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Title and Date Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, color: 'var(--text-main)' }}>
              📊 Daily Sales Summary Breakdown
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Click on any date to inspect payment channels, staff totals, profits, and unlisted sales.
            </p>
          </div>

          {/* Search Date Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Search Date:</label>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            {searchDate && (
              <button
                type="button"
                onClick={() => setSearchDate('')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p>Loading daily sales breakdown...</p>
        ) : groupedSales.length === 0 ? (
          <div className="board-card" style={{ padding: '32px', textAlign: 'center' }}>
            <h3>No sales record found for the selected date.</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {groupedSales.map((dayGroup) => {
              const isExpanded = !!expandedDates[dayGroup.date] || groupedSales.length === 1;

              return (
                <div
                  key={dayGroup.date}
                  className="board-card"
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Date Wrapper Header Bar */}
                  <div
                    onClick={() => toggleExpand(dayGroup.date)}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary)' }}>
                        📅 {dayGroup.date}
                      </span>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          backgroundColor: '#e0e7ff',
                          color: '#3730a3',
                          fontWeight: '800',
                        }}
                      >
                        {dayGroup.itemsSold.length} Sales Transaction(s)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#16a34a' }}>
                          ₦{dayGroup.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Sold</div>
                      </div>
                      <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded Breakdown Body */}
                  {isExpanded && (
                    <div style={{ padding: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                        {/* Payment Channel Breakdown */}
                        <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: '800' }}>
                            💳 Payment Channel Breakdown
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>💵 Cash:</span>
                              <strong>₦{dayGroup.cashTotal.toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>🏦 Bank Transfer:</span>
                              <strong>₦{dayGroup.transferTotal.toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>💳 POS:</span>
                              <strong>₦{dayGroup.posTotal.toLocaleString()}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Staff & Owner Breakdown */}
                        <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: '800' }}>
                            👤 Sales Sold by Staff / Owner
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                            {Object.entries(dayGroup.staffSalesMap).map(([seller, sellerTotal]) => (
                              <div key={seller} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>👤 {seller}:</span>
                                <strong style={{ color: 'var(--primary)' }}>₦{sellerTotal.toLocaleString()}</strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Total Profit Metric Card */}
                        <div style={{ padding: '16px', backgroundColor: 'rgba(34, 197, 94, 0.08)', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.92rem', color: '#15803d', fontWeight: '800' }}>
                            📈 Total Profit Made
                          </h4>
                          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#16a34a' }}>
                            ₦{dayGroup.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#166534' }}>
                            Calculated as (Selling Price - Cost Price) excluding unlisted items.
                          </p>
                        </div>
                      </div>

                      {/* Unlisted Items Section */}
                      {dayGroup.unlistedItems.length > 0 && (
                        <div style={{ padding: '16px', backgroundColor: '#fffbe3', borderRadius: '10px', border: '1px solid #fef08a' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#854d0e', fontWeight: '800' }}>
                            ⚠️ Unlisted Items Sold on {dayGroup.date}
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {dayGroup.unlistedItems.map((uItem, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#713f12' }}>
                                <span>• <strong>{uItem.name}</strong> ({uItem.qty} qty) — Sold by {uItem.soldBy}</span>
                                <strong>₦{uItem.amount.toLocaleString()}</strong>
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