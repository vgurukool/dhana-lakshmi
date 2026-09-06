import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Trash2,
  Globe,
  Lock,
  Sparkles
} from 'lucide-react';

export function BankConnectorsModal({ isOpen, onClose, onRefreshData }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [filterCountry, setFilterCountry] = useState('ALL');

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/banks/connections');
      const data = await res.json();
      setConnections(data.connections || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError('Failed to load bank connectors: ' + err.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConnections();
      setStatusMessage('');
      setError('');
    }
  }, [isOpen]);

  const handleLaunchAuth = async (bank) => {
    try {
      setActiveAction(bank.id);
      setError('');
      setStatusMessage(`🚀 Launching browser for ${bank.name}... Please log in and complete 2FA on your screen.`);
      
      const res = await fetch(`/api/banks/${bank.bank_id || bank.id.replace('conn_', '')}/auth-session`, {
        method: 'POST'
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || 'Failed to start auth session');

      setStatusMessage(`Browser launched for ${bank.name}. Complete 2FA and check 'Remember Device'. When you reach the dashboard, session cookies will be saved automatically.`);
      
      // Poll status every 4 seconds for 1 minute
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        await fetchConnections();
        if (attempts >= 15) {
          clearInterval(interval);
          setActiveAction(null);
        }
      }, 4000);

    } catch (err) {
      setActiveAction(null);
      setError(err.message || 'Error launching auth');
    }
  };

  const handleExtractStatements = async (bank) => {
    try {
      setActiveAction(bank.id);
      setError('');
      setStatusMessage(`⏳ Running headless statement extraction for ${bank.name}...`);

      const res = await fetch(`/api/banks/${bank.bank_id || bank.id.replace('conn_', '')}/extract`, {
        method: 'POST'
      });
      const data = await res.json();

      setActiveAction(null);
      if (!res.ok) throw new Error(data.detail || 'Failed to extract statements');

      if (data.status === 'success') {
        setStatusMessage(`✅ Extracted ${data.filesDownloaded || 0} statement(s) & imported ${data.transactionsImported || 0} transaction(s) from ${bank.name}!`);
        if (onRefreshData) onRefreshData();
        fetchConnections();
      } else if (data.status === 'expired') {
        setError(`Session for ${bank.name} has expired. Please click "Connect / Login" to refresh 2FA session.`);
        fetchConnections();
      } else {
        setError(data.error || 'Extraction completed with notice');
        fetchConnections();
      }
    } catch (err) {
      setActiveAction(null);
      setError(err.message || 'Error during statement extraction');
    }
  };

  const handleDisconnect = async (bank) => {
    if (!window.confirm(`Are you sure you want to disconnect and delete saved session for ${bank.name}?`)) return;
    try {
      await fetch(`/api/banks/${bank.bank_id || bank.id.replace('conn_', '')}/session`, { method: 'DELETE' });
      setStatusMessage(`Disconnected ${bank.name}.`);
      fetchConnections();
    } catch (err) {
      setError(err.message || 'Error disconnecting');
    }
  };

  if (!isOpen) return null;

  const filtered = connections.filter(b => {
    if (filterCountry === 'ALL') return true;
    return b.country === filterCountry;
  });

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }}>
      <div className="modal-content" style={{ maxWidth: '880px', maxHeight: '90vh', backgroundColor: '#0F172A', border: '1px solid #334155' }}>
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid #1E293B', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FBBF24' }}>
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Automated Bank Connectors (Playwright Engine)
              </h3>
              <p style={{ fontSize: '12.5px', color: '#94A3B8', margin: 0 }}>
                Store persistent device sessions & extract official PDF statements with zero manual uploads
              </p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ color: '#94A3B8' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '24px', overflowY: 'auto' }}>
          {/* Info Banner */}
          <div style={{
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <ShieldCheck size={24} color="#10B981" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: '1.4' }}>
              <strong style={{ color: '#F8FAFC' }}>Bank-Grade Session Reuse:</strong> Click <strong>"Connect / Login"</strong> to log in once with 2FA in a secure browser window. Playwright captures your trusted device token so subsequent automated extractions run headlessly in the background.
            </div>
          </div>

          {/* Status / Error Messages */}
          {statusMessage && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34D399',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Sparkles size={16} />
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#F87171',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Region Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'ALL', label: 'All Banks' },
                { id: 'US', label: '🇺🇸 United States' },
                { id: 'IN', label: '🇮🇳 India' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterCountry(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: filterCountry === tab.id ? '#F59E0B' : '#1E293B',
                    borderColor: filterCountry === tab.id ? '#F59E0B' : '#334155',
                    color: filterCountry === tab.id ? '#0B0F19' : '#CBD5E1',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchConnections}
              className="btn btn-ghost btn-sm"
              style={{ color: '#94A3B8', fontSize: '12px' }}
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} style={{ marginRight: '4px' }} />
              Refresh
            </button>
          </div>

          {/* Bank Connectors Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '14px' }}>
            {filtered.map(bank => {
              const isActive = bank.hasSession || bank.status === 'active';
              const isSyncing = activeAction === bank.id || bank.status === 'syncing';

              return (
                <div
                  key={bank.id}
                  style={{
                    backgroundColor: '#1E293B',
                    border: isActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #334155',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  {/* Top: Logo, Name, Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{bank.logo || '🏛️'}</span>
                      <div>
                        <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF' }}>{bank.name}</div>
                        <div style={{ fontSize: '12px', color: '#94A3B8' }}>{bank.category} • {bank.country === 'US' ? '🇺🇸 US' : '🇮🇳 India'}</div>
                      </div>
                    </div>

                    {/* Badge */}
                    {isActive ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        color: '#34D399',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        border: '1px solid rgba(16, 185, 129, 0.4)'
                      }}>
                        <CheckCircle2 size={12} /> Active Session
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#0F172A',
                        color: '#94A3B8',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        border: '1px solid #334155'
                      }}>
                        Not Connected
                      </span>
                    )}
                  </div>

                  {/* Metadata: Last login & downloads */}
                  <div style={{ fontSize: '12px', color: '#CBD5E1', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                    <span>Last Login: <strong style={{ color: '#F8FAFC' }}>{bank.last_login ? new Date(bank.last_login).toLocaleDateString() : 'Never'}</strong></span>
                    <span>Synced: <strong style={{ color: '#34D399' }}>{bank.download_count || 0} stmts</strong></span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleLaunchAuth(bank)}
                      disabled={isSyncing}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: isActive ? '#0F172A' : '#F59E0B',
                        color: isActive ? '#CBD5E1' : '#0B0F19',
                        border: isActive ? '1px solid #334155' : 'none',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <KeyRound size={14} />
                      {isActive ? 'Refresh 2FA Login' : 'Connect / Login'}
                    </button>

                    <button
                      onClick={() => handleExtractStatements(bank)}
                      disabled={!isActive || isSyncing}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: isActive ? 'rgba(16, 185, 129, 0.2)' : '#0F172A',
                        color: isActive ? '#34D399' : '#64748B',
                        border: isActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #334155',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        cursor: isActive ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Download size={14} />
                      {isSyncing ? 'Extracting...' : 'Extract Statements'}
                    </button>

                    {isActive && (
                      <button
                        onClick={() => handleDisconnect(bank)}
                        title="Disconnect session"
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          backgroundColor: '#0F172A',
                          color: '#F87171',
                          border: '1px solid #334155',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid #1E293B', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
            Sessions stored locally in <code>dhana-lakshmi/data/bank_sessions/</code>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
