import React, { useState, useEffect } from 'react';
import {
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
  Sparkles,
  Zap,
  Key,
  Calendar,
  Layers,
  Check,
  AlertTriangle,
  Workflow,
  Activity,
  Play
} from 'lucide-react';

export function BankConnectors({ onRefreshData }) {
  const [connections, setConnections] = useState([]);
  const [workflowRuns, setWorkflowRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [latestPrefectUrl, setLatestPrefectUrl] = useState(null);
  const [error, setError] = useState('');
  const [filterMode, setFilterMode] = useState('ALL');

  // Keychain Modal State
  const [keychainModalBank, setKeychainModalBank] = useState(null);
  const [keychainUsername, setKeychainUsername] = useState('');
  const [keychainPassword, setKeychainPassword] = useState('');
  const [keychainSaving, setKeychainSaving] = useState(false);

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

  const fetchWorkflowRuns = async () => {
    try {
      const res = await fetch('/api/banks/workflow-runs');
      const data = await res.json();
      setWorkflowRuns(data.runs || []);
    } catch (err) {
      console.warn('Could not fetch Prefect workflow runs:', err);
    }
  };

  useEffect(() => {
    fetchConnections();
    fetchWorkflowRuns();
    const interval = setInterval(fetchWorkflowRuns, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunchAuth = async (bank) => {
    const bankId = bank.bank_id || bank.id.replace('conn_', '');
    try {
      setActiveAction(bankId);
      setError('');
      setStatusMessage(`🚀 Launching browser for ${bank.name}... Please log in and complete 2FA on your screen.`);

      const res = await fetch(`/api/banks/${bankId}/auth-session`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start auth session');

      setStatusMessage(`Browser launched for ${bank.name}. Complete 2FA and check 'Remember Device'. Session will be saved automatically.`);

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
    const bankId = bank.bank_id || bank.id.replace('conn_', '');
    try {
      setActiveAction(bankId);
      setError('');
      setLatestPrefectUrl(null);
      setStatusMessage(`⏳ Dispatched task to Prefect Workflow Engine (:3010) for ${bank.name}...`);

      const res = await fetch(`/api/banks/${bankId}/extract`, { method: 'POST' });
      const data = await res.json();
      setActiveAction(null);

      if (!res.ok) throw new Error(data.detail || 'Failed to dispatch workflow');

      if (data.status === 'success') {
        const flowData = data.data || {};
        const url = data.prefectUiUrl || 'http://127.0.0.1:3010';
        setLatestPrefectUrl(url);
        setStatusMessage(`✅ Prefect Workflow Completed: Extracted ${flowData.filesDownloaded || 0} statement(s) & imported ${flowData.transactionsImported || 0} transaction(s) for ${bank.name}!`);
        if (onRefreshData) onRefreshData();
        fetchConnections();
        fetchWorkflowRuns();
      } else {
        setError(data.error || 'Prefect workflow finished with error');
        fetchConnections();
        fetchWorkflowRuns();
      }
    } catch (err) {
      setActiveAction(null);
      setError(err.message || 'Error during workflow execution');
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      setError('');
      setStatusMessage('⏳ Dispatching batch extraction flow to Prefect Workflow Engine (:3010)...');

      const res = await fetch('/api/banks/sync-all', { method: 'POST' });
      const data = await res.json();
      setSyncingAll(false);

      if (!res.ok) throw new Error(data.detail || 'Failed to sync all banks');

      setStatusMessage(`✅ Prefect Batch Sync Completed for ${data.totalSynced || 0} active bank connection(s)!`);
      if (onRefreshData) onRefreshData();
      fetchConnections();
      fetchWorkflowRuns();
    } catch (err) {
      setSyncingAll(false);
      setError(err.message || 'Error during batch sync');
    }
  };

  const handleDisconnect = async (bank) => {
    const bankId = bank.bank_id || bank.id.replace('conn_', '');
    if (!window.confirm(`Disconnect and revoke saved session for ${bank.name}?`)) return;
    try {
      await fetch(`/api/banks/${bankId}/session`, { method: 'DELETE' });
      setStatusMessage(`Disconnected ${bank.name}.`);
      fetchConnections();
    } catch (err) {
      setError(err.message || 'Error disconnecting');
    }
  };

  const handleOpenKeychainModal = (bank) => {
    setKeychainModalBank(bank);
    setKeychainUsername(bank.keychain?.username || '');
    setKeychainPassword('');
  };

  const handleSaveKeychain = async (e) => {
    e.preventDefault();
    if (!keychainModalBank) return;
    const bankId = keychainModalBank.bank_id || keychainModalBank.id.replace('conn_', '');

    try {
      setKeychainSaving(true);
      const res = await fetch(`/api/banks/${bankId}/keychain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: keychainUsername,
          password: keychainPassword
        })
      });
      const data = await res.json();
      setKeychainSaving(false);

      if (!res.ok) throw new Error(data.detail || 'Failed to save to macOS Keychain');

      setStatusMessage(`🔐 Credentials for ${keychainModalBank.name} securely saved in macOS Keychain!`);
      setKeychainModalBank(null);
      fetchConnections();
    } catch (err) {
      setKeychainSaving(false);
      setError(err.message || 'Error saving to Keychain');
    }
  };

  const handleDeleteKeychain = async (bank) => {
    const bankId = bank.bank_id || bank.id.replace('conn_', '');
    if (!window.confirm(`Remove stored macOS Keychain credentials for ${bank.name}?`)) return;
    try {
      await fetch(`/api/banks/${bankId}/keychain`, { method: 'DELETE' });
      setStatusMessage(`Removed ${bank.name} credentials from macOS Keychain.`);
      fetchConnections();
    } catch (err) {
      setError(err.message || 'Error deleting from Keychain');
    }
  };

  // Metrics computation
  const activeCount = connections.filter(b => b.hasSession && b.status === 'active').length;
  const expiringSoonCount = connections.filter(b => b.status === 'expiring_soon').length;
  const keychainCount = connections.filter(b => b.keychain?.hasKeychain).length;
  const totalStatementsDownloaded = connections.reduce((sum, b) => sum + (b.download_count || 0), 0);

  const filtered = connections.filter(b => {
    if (filterMode === 'CONNECTED') return b.hasSession || b.status === 'active';
    if (filterMode === 'US') return b.country === 'US';
    if (filterMode === 'IN') return b.country === 'IN';
    return true;
  });

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🏦</span>
            <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
              Bank Connectors & Automated Extraction
            </h2>
          </div>
          <p style={{ fontSize: '14px', color: '#94A3B8', marginTop: '4px' }}>
            Token Setup in Dhana Lakshmi • Headless Playwright Tasks Orchestrated via <strong>Prefect Workflow Engine (:3010)</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Prefect UI Link Button */}
          <a
            href="http://127.0.0.1:3010"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.5)', color: '#A5B4FC', fontWeight: 700 }}
          >
            <Workflow size={15} />
            <span>Open Prefect UI (:3010) ↗</span>
          </a>

          <button
            className="btn btn-secondary"
            onClick={() => { fetchConnections(); fetchWorkflowRuns(); }}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSyncAll}
            disabled={syncingAll || activeCount === 0}
            style={{ backgroundColor: '#F59E0B', color: '#0B0F19', fontWeight: 800 }}
          >
            <Zap size={16} />
            <span>{syncingAll ? 'Running Prefect Flow...' : `Sync All Active Banks (${activeCount})`}</span>
          </button>
        </div>
      </div>

      {/* Alert / Status Banners */}
      {statusMessage && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34D399',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} />
            <span>{statusMessage}</span>
          </div>
          {latestPrefectUrl && (
            <a
              href={latestPrefectUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '12.5px',
                fontWeight: 800,
                color: '#38BDF8',
                textDecoration: 'underline',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Inspect Flow in Prefect UI <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#F87171',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 5 Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #6366F1' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Supported Banks
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', marginTop: '6px' }}>
            {connections.length} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>Institutions</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#CBD5E1', marginTop: '4px' }}>
            US & Indian National Banks
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active 2FA Sessions
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#10B981', marginTop: '6px' }}>
            {activeCount} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>/ {connections.length}</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#CBD5E1', marginTop: '4px' }}>
            Persistent profile on disk
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Expiring Sessions
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: expiringSoonCount > 0 ? '#FBBF24' : '#FFFFFF', marginTop: '6px' }}>
            {expiringSoonCount} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>within 7 days</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#CBD5E1', marginTop: '4px' }}>
            {expiringSoonCount > 0 ? 'Requires 2FA refresh soon' : 'All sessions healthy'}
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #38BDF8' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            macOS Keychain
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#38BDF8', marginTop: '6px' }}>
            {keychainCount} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>Secured</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#CBD5E1', marginTop: '4px' }}>
            Zero plaintext storage
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #8B5CF6' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#C084FC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Prefect Engine
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#A78BFA', marginTop: '6px' }}>
            Port 3010 <span style={{ fontSize: '13px', fontWeight: 600, color: '#34D399' }}>🟢 Live</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#CBD5E1', marginTop: '4px' }}>
            {workflowRuns.length} recent flow runs recorded
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ALL', label: `All Banks (${connections.length})` },
            { id: 'CONNECTED', label: `Connected (${activeCount})` },
            { id: 'US', label: '🇺🇸 United States' },
            { id: 'IN', label: '🇮🇳 India' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id)}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid',
                backgroundColor: filterMode === tab.id ? '#F59E0B' : '#1E293B',
                borderColor: filterMode === tab.id ? '#F59E0B' : '#334155',
                color: filterMode === tab.id ? '#0B0F19' : '#CBD5E1',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '12.5px', color: '#94A3B8' }}>
          Showing {filtered.length} of {connections.length} bank connectors
        </div>
      </div>

      {/* Grid of Bank Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '18px', marginBottom: '36px' }}>
        {filtered.map(bank => {
          const bankId = bank.bank_id || bank.id.replace('conn_', '');
          const exp = bank.expiryInfo || {};
          const kc = bank.keychain || {};
          const isActive = exp.status === 'active' || bank.hasSession;
          const isExpiringSoon = exp.status === 'expiring_soon';
          const isExpired = exp.status === 'expired';
          const isBusy = activeAction === bankId;

          return (
            <div
              key={bank.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '22px',
                border: isExpiringSoon ? '1px solid rgba(245, 158, 11, 0.6)' : isActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #334155',
                borderRadius: '16px',
                gap: '16px'
              }}
            >
              {/* Top Row: Logo, Title, Status Badge */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '32px' }}>{bank.logo || '🏛️'}</span>
                    <div>
                      <h3 style={{ fontSize: '16.5px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                        {bank.name}
                      </h3>
                      <div style={{ fontSize: '12.5px', color: '#94A3B8', marginTop: '2px' }}>
                        {bank.category} • {bank.country === 'US' ? '🇺🇸 US' : '🇮🇳 India'}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isExpiringSoon ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      color: '#FBBF24',
                      padding: '4px 10px',
                      borderRadius: '14px',
                      border: '1px solid rgba(245, 158, 11, 0.5)'
                    }}>
                      <Clock size={12} /> Expiring Soon
                    </span>
                  ) : isActive ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      color: '#34D399',
                      padding: '4px 10px',
                      borderRadius: '14px',
                      border: '1px solid rgba(16, 185, 129, 0.4)'
                    }}>
                      <CheckCircle2 size={12} /> Active Session
                    </span>
                  ) : isExpired ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#F87171',
                      padding: '4px 10px',
                      borderRadius: '14px',
                      border: '1px solid rgba(239, 68, 68, 0.4)'
                    }}>
                      <AlertTriangle size={12} /> Expired
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
                      padding: '4px 10px',
                      borderRadius: '14px',
                      border: '1px solid #334155'
                    }}>
                      Not Connected
                    </span>
                  )}
                </div>

                {/* Token Expiry & Health Section */}
                <div style={{
                  backgroundColor: '#0F172A',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '12px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', marginBottom: '6px' }}>
                    <span style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={14} color="#FBBF24" /> Token Expiry:
                    </span>
                    <strong style={{ color: isExpiringSoon ? '#FBBF24' : isActive ? '#34D399' : '#F87171' }}>
                      {exp.expirySummary || 'No session token'}
                    </strong>
                  </div>

                  {isActive && exp.daysRemaining !== undefined && (
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#1E293B', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(5, (exp.daysRemaining / 30) * 100))}%`,
                          backgroundColor: isExpiringSoon ? '#F59E0B' : '#10B981',
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                  )}

                  {exp.expiresAt && (
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                      Valid Until: {new Date(exp.expiresAt).toLocaleDateString()} ({new Date(exp.expiresAt).toLocaleTimeString()})
                    </div>
                  )}
                </div>

                {/* macOS Keychain Status Box */}
                <div style={{
                  backgroundColor: '#0F172A',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #334155'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                    <Key size={14} color="#38BDF8" />
                    {kc.hasKeychain ? (
                      <span style={{ color: '#F8FAFC' }}>
                        Mac Keychain: <strong style={{ color: '#38BDF8' }}>{kc.maskedUsername}</strong>
                      </span>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>No credentials in Mac Keychain</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleOpenKeychainModal(bank)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38BDF8',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '2px 6px'
                      }}
                    >
                      {kc.hasKeychain ? 'Edit' : '+ Set'}
                    </button>
                    {kc.hasKeychain && (
                      <button
                        onClick={() => handleDeleteKeychain(bank)}
                        title="Clear from Keychain"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#F87171',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: '2px 4px'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom: Metadata & Actions */}
              <div>
                <div style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderTop: '1px solid #334155', paddingTop: '10px' }}>
                  <span>Last Synced: <strong style={{ color: '#F8FAFC' }}>{bank.last_synced ? new Date(bank.last_synced).toLocaleDateString() : 'Never'}</strong></span>
                  <span>Extracted: <strong style={{ color: '#34D399' }}>{bank.download_count || 0} stmts</strong></span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleLaunchAuth(bank)}
                    disabled={isBusy}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: isActive ? '#0F172A' : '#F59E0B',
                      color: isActive ? '#F8FAFC' : '#0B0F19',
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
                    disabled={!isActive || isBusy}
                    style={{
                      flex: 1.2,
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: isActive ? 'rgba(99, 102, 241, 0.2)' : '#0F172A',
                      color: isActive ? '#A5B4FC' : '#64748B',
                      border: isActive ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid #334155',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: isActive ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Workflow size={14} />
                    {isBusy ? 'Running Flow...' : 'Prefect Extract'}
                  </button>

                  {isActive && (
                    <button
                      onClick={() => handleDisconnect(bank)}
                      title="Disconnect session"
                      style={{
                        padding: '9px 12px',
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
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prefect Workflow Engine Live Execution History */}
      <div className="card" style={{ padding: '22px', borderRadius: '16px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="#818CF8" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Prefect Workflow Execution Logs & Runs (:3010)
            </h3>
          </div>
          <a
            href="http://127.0.0.1:3010"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '13px', fontWeight: 700, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Launch Full Prefect Dashboard <ExternalLink size={13} />
          </a>
        </div>

        {workflowRuns.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13.5px' }}>
            No recent workflow runs yet. Click "Prefect Extract" on any active bank to trigger an orchestrated task run!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '12px' }}>
                  <th style={{ padding: '10px 14px' }}>FLOW RUN NAME</th>
                  <th style={{ padding: '10px 14px' }}>STATE</th>
                  <th style={{ padding: '10px 14px' }}>PARAMETERS</th>
                  <th style={{ padding: '10px 14px' }}>STARTED AT</th>
                  <th style={{ padding: '10px 14px' }}>DURATION</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {workflowRuns.map(run => {
                  const isCompleted = run.state === 'Completed';
                  const isRunning = run.state === 'Running';
                  const isFailed = run.state === 'Failed' || run.state === 'Crashed';

                  return (
                    <tr key={run.id} style={{ borderBottom: '1px solid #1E293B', fontSize: '13px' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#F8FAFC' }}>
                        <code>{run.name}</code>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.2)' : isRunning ? 'rgba(56, 189, 248, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: isCompleted ? '#34D399' : isRunning ? '#38BDF8' : '#F87171'
                        }}>
                          {isCompleted ? <Check size={12} /> : isRunning ? <RefreshCw size={12} className="spin" /> : <AlertTriangle size={12} />}
                          {run.state}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#CBD5E1' }}>
                        {run.parameters?.bank_id ? (
                          <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                            {run.parameters.bank_id}
                          </span>
                        ) : 'Batch'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#94A3B8' }}>
                        {run.startTime ? new Date(run.startTime).toLocaleTimeString() : 'Pending'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#94A3B8' }}>
                        {run.totalRunTime !== undefined && run.totalRunTime !== null ? `${run.totalRunTime.toFixed(1)}s` : '-'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <a
                          href={run.uiUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#818CF8',
                            fontSize: '12px',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          Details <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Store Credentials in macOS Keychain */}
      {keychainModalBank && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div className="modal-content" style={{ maxWidth: '480px', backgroundColor: '#0F172A', border: '1px solid #334155' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #1E293B', padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={20} color="#38BDF8" />
                <h3 className="modal-title" style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Store in macOS Keychain
                </h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setKeychainModalBank(null)} style={{ color: '#94A3B8' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKeychain}>
              <div className="modal-body" style={{ padding: '22px' }}>
                <div style={{
                  backgroundColor: '#1E293B',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '18px',
                  fontSize: '12.5px',
                  color: '#CBD5E1',
                  border: '1px solid #334155',
                  lineHeight: '1.4'
                }}>
                  🔐 Saved directly into your native <strong>macOS Keychain</strong> under service <code>DhanaLakshmi_{(keychainModalBank.bank_id || keychainModalBank.id.replace('conn_', '')).toUpperCase()}</code>. Zero plaintext stored on disk or in .env.
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ color: '#CBD5E1', fontWeight: 700 }}>
                    {keychainModalBank.name} Username / Online ID:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={keychainUsername}
                    onChange={(e) => setKeychainUsername(e.target.value)}
                    placeholder="e.g. my_online_id"
                    required
                    style={{ backgroundColor: '#0F172A', color: '#F8FAFC', border: '1px solid #334155' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ color: '#CBD5E1', fontWeight: 700 }}>
                    Password:
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={keychainPassword}
                    onChange={(e) => setKeychainPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{ backgroundColor: '#0F172A', color: '#F8FAFC', border: '1px solid #334155' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #1E293B', padding: '16px 22px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setKeychainModalBank(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={keychainSaving}
                  style={{ backgroundColor: '#38BDF8', color: '#0B0F19', fontWeight: 800 }}
                >
                  <ShieldCheck size={16} />
                  <span>{keychainSaving ? 'Saving to Keychain...' : 'Save to Mac Keychain'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
