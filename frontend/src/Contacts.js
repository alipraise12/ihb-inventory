import React, { useState } from 'react';
import './App.css';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ show: false, message: '' });
  const [loading, setLoading] = useState(false);

  const triggerToast = (message) => {
    setAlertConfig({ show: true, message });
    setTimeout(() => setAlertConfig({ show: false, message: '' }), 3500);
  };

  // Fetch contacts dynamically from the Laravel backend when permission is granted
  const requestContactPermission = () => {
    setLoading(true);
    triggerToast("Accessing device contacts list... Synchronization matching complete.");

    fetch('http://127.0.0.1:8000/api/contacts')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch from Laravel API');
        return res.json();
      })
      .then((data) => {
        // Ensure data is sorted by name
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
        setContacts(sortedData);
        setPermissionGranted(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error("API Error:", err);
        triggerToast("Failed to fetch contacts from Laravel backend.");
        setLoading(false);
      });
  };

  const handleInvite = (contact) => {
    const inviteLink = `https://ihbajo.com/download?ref=${contact.phone.replace(/\s+/g, '')}`;
    const smsMessage = `Hey ${contact.name}, join my financial contribution circle on IHB Ajo! Download here: ${inviteLink}`;
    
    triggerToast(`SMS text generated for ${contact.name}!`);
    window.open(`sms:${contact.phone}?body=${encodeURIComponent(smsMessage)}`, '_blank');
  };

  // Dynamically group contacts based on search query
  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)
  );

  const registeredFriends = filteredContacts.filter(c => c.isRegistered);
  const unRegisteredFriends = filteredContacts.filter(c => !c.isRegistered);

  return (
    <div className="contacts-wrapper">
      {alertConfig.show && (
        <div className="custom-alert success">
          {alertConfig.message}
        </div>
      )}

      <div className="contacts-header">
        <h3>Sync Directory</h3>
        {permissionGranted && <span className="sync-status">Connected</span>}
      </div>

      {!permissionGranted ? (
        <div style={{ textAlign: 'center', padding: '30px 10px' }}>
          <p style={{ color: '#aaa', fontSize: '0.95rem', marginBottom: '20px' }}>
            Allow IHB Ajo to check your local address book to reveal which of your family and friends are already using the platform.
          </p>
          <button 
            className="auth-btn" 
            onClick={requestContactPermission}
            disabled={loading}
          >
            {loading ? "Connecting..." : "Grant Address Book Access"}
          </button>
        </div>
      ) : (
        <div>
          {/* Search bar specifically for filtering contacts */}
          <input 
            type="text" 
            className="form-input" 
            style={{ marginBottom: '20px' }}
            placeholder="🔍 Search name or number from address book..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* SECTION 1: Registered on platform */}
          <div className="section-title">Registered on IHB Ajo</div>
          <div className="contacts-list">
            {registeredFriends.length > 0 ? (
              registeredFriends.map((c, i) => (
                <div key={i} className="contact-card registered">
                  <div className="contact-avatar">{c.name.charAt(0)}</div>
                  <div className="contact-info">
                    <div className="contact-name">{c.name}</div>
                    <div className="contact-phone">{c.phone}</div>
                  </div>
                  <button 
                    className="contact-action-btn action-primary" 
                    onClick={() => triggerToast(`Initiating transfer panel context to ${c.name}...`)}
                  >
                    Transact
                  </button>
                </div>
              ))
            ) : (
              <div style={{ padding: '10px', color: '#666', fontSize: '0.9rem' }}>
                No active members match search parameter.
              </div>
            )}
          </div>

          {/* SECTION 2: Invite out to unregistered profiles */}
          <div className="section-title">Invite to IHB Ajo</div>
          <div className="contacts-list">
            {unRegisteredFriends.length > 0 ? (
              unRegisteredFriends.map((c, i) => (
                <div key={i} className="contact-card">
                  <div className="contact-avatar" style={{ backgroundColor: '#333' }}>
                    {c.name.charAt(0)}
                  </div>
                  <div className="contact-info">
                    <div className="contact-name" style={{ color: '#aaa' }}>{c.name}</div>
                    <div className="contact-phone">{c.phone}</div>
                  </div>
                  <button 
                    className="contact-action-btn action-accent" 
                    onClick={() => handleInvite(c)}
                  >
                    Invite ✉
                  </button>
                </div>
              ))
            ) : (
              <div style={{ padding: '10px', color: '#666', fontSize: '0.9rem' }}>
                No non-members found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}