import React, { useState } from 'react';
import './App.css';

export default function CreateGroup() {
  const [groupName, setGroupName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('Weekly');
  const [selectedMember, setSelectedMember] = useState('');
  const [rotationOrder, setRotationOrder] = useState([]);
  const [alertConfig, setAlertConfig] = useState({ show: false, message: '' });

  // Mocked synced friends from our phonebook to choose from
  const AVAILABLE_FRIENDS = ["Chidi Okafor", "Amina Yusuf", "Funmi Adebayo", "Tunde Bakare"];

  const triggerToast = (message) => {
    setAlertConfig({ show: true, message });
    setTimeout(() => setAlertConfig({ show: false, message: '' }), 4000);
  };

  const addMemberToRotation = () => {
    if (!selectedMember) return;
    if (rotationOrder.includes(selectedMember)) {
      alert("This member is already added to the rotation order!");
      return;
    }
    setRotationOrder([...rotationOrder, selectedMember]);
    setSelectedMember('');
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!groupName || !amount || rotationOrder.length === 0) {
      triggerToast("Please complete all group details and add at least one member!");
      return;
    }

    // The data structural blueprint that represents the total group cycle calculations
    const groupBlueprint = {
      name: groupName,
      contributionAmount: Number(amount),
      cycleFrequency: frequency,
      totalPoolPerCycle: Number(amount) * rotationOrder.length,
      payoutRotation: rotationOrder
    };

    triggerToast(`Group "${groupName}" created successfully!`);
    console.log("Group Blueprint for Backend:", groupBlueprint);

    // Reset Form fields
    setGroupName('');
    setAmount('');
    setRotationOrder([]);
  };

  return (
    <div className="admin-panel-wrapper">
      {alertConfig.show && (
        <div className="custom-alert success">
          {alertConfig.message}
        </div>
      )}

      <h2 className="auth-title" style={{ marginBottom: '10px' }}>Create Ajo Group</h2>
      <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.9rem', marginBottom: '30px' }}>
        Admin Dashboard Control Panel
      </p>

      <form onSubmit={handleCreateGroup}>
        <div className="form-group">
          <label>Group / Circle Name</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. Rice Sellers Association, Tech Bros Hub" 
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <div className="input-grid-2">
          <div className="form-group">
            <label>Contribution Amount (₦)</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="5000" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Payment Frequency</label>
            <select 
              className="form-input" 
              style={{ background: 'rgb(18, 18, 18)' }}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
        </div>

        {/* ROTATION SCHEDULER */}
        <div className="form-group" style={{ marginTop: '10px' }}>
          <label>Setup Payout Rotation Order</label>
          <div className="phone-input-group">
            <select 
              className="form-input" 
              style={{ background: 'rgb(18, 18, 18)', width: '70%' }}
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
            >
              <option value="">-- Select Contact to Add --</option>
              {AVAILABLE_FRIENDS.map((name, i) => (
                <option key={i} value={name}>{name}</option>
              ))}
            </select>
            <button 
              type="button" 
              className="contact-action-btn action-primary" 
              style={{ width: '30%', padding: '0' }}
              onClick={addMemberToRotation}
            >
              + Slot
            </button>
          </div>

          {rotationOrder.length > 0 && (
            <div className="rotation-slots-list">
              {rotationOrder.map((name, index) => (
                <div key={index} className="slot-row">
                  <div>
                    <span className="slot-number">Month {index + 1}</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{name}</span>
                  </div>
                  <span style={{ color: '#666', fontSize: '0.85rem' }}>Pool Recipient</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* REAL TIME CALCULATION PREVIEW */}
        {amount && rotationOrder.length > 0 && (
          <div className="cycle-preview-card">
            <strong>📊 Live Cycle Metrics Preview:</strong><br />
            Each member will pay <strong>₦{Number(amount).toLocaleString()}</strong> {frequency.toLowerCase()}.<br />
            Total pooled payout of <strong>CNY / ₦{(Number(amount) * rotationOrder.length).toLocaleString()}</strong> will rotate to the assigned slot handler automatically at the end of each hand cycle.
          </div>
        )}

        <button type="submit" className="join-btn" style={{ marginTop: '25px' }}>
          Publish Group Blueprint
        </button>
      </form>
    </div>
  );
}