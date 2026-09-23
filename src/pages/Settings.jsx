import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Wallet,
  ShieldAlert,
  FolderCheck,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  LayoutDashboard,
  ReceiptText,
  Landmark,
  Repeat,
  CreditCard,
  PieChart,
  Target,
  FileText,
  Sliders,
  Sun,
  ExternalLink
} from 'lucide-react';

export function Settings({
  settings = {},
  categories = [],
  accounts = [],
  tags = [],
  onSavePreferences,
  onWipeData
}) {
  const {
    assets = 0,
    liabilities = 0,
    netWorthConfigured = false,
    dismissedPatterns = [],
    driveSyncInfo = {}
  } = settings;

  const [assetsInput, setAssetsInput] = useState(String(assets));
  const [liabilitiesInput, setLiabilitiesInput] = useState(String(liabilities));
  const [netWorthMessage, setNetWorthMessage] = useState('');

  // Category & Account input
  const [newCatInput, setNewCatInput] = useState('');
  const [newAccInput, setNewAccInput] = useState('');

  // Tab Visibility State
  const ALL_TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'assets', label: 'Assets Portfolio', icon: Landmark },
    { id: 'recurring', label: 'Recurring Payments', icon: Repeat },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'goals', label: 'Financial Goals', icon: Target },
    { id: 'documents', label: 'Documents & Imports', icon: FileText },
    { id: 'rules', label: 'Rules & Tags', icon: Sliders },
    { id: 'settings', label: 'Settings & Preferences', icon: SettingsIcon, alwaysVisible: true }
  ];

  const defaultTabVisibility = {
    dashboard: true,
    transactions: true,
    assets: true,
    recurring: true,
    subscriptions: true,
    budgets: true,
    goals: true,
    documents: true,
    rules: true,
    settings: true
  };

  const [visibleTabsState, setVisibleTabsState] = useState({
    ...defaultTabVisibility,
    ...(settings.visibleTabs || {})
  });
  const [tabMessage, setTabMessage] = useState('');

  const handleToggleTab = async (tabId) => {
    if (tabId === 'settings') return;
    const updated = {
      ...visibleTabsState,
      [tabId]: !visibleTabsState[tabId]
    };
    setVisibleTabsState(updated);
    await onSavePreferences({ visibleTabs: updated });
    setTabMessage('Tab visibility preferences updated successfully.');
    setTimeout(() => setTabMessage(''), 2500);
  };

  // Wipe Modal
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [wiping, setWiping] = useState(false);
  const [wipeError, setWipeError] = useState('');

  // Save Net Worth
  const handleSaveNetWorth = async (e) => {
    e.preventDefault();
    const parsedAssets = parseFloat(assetsInput) || 0;
    const parsedLiab = parseFloat(liabilitiesInput) || 0;

    await onSavePreferences({
      assets: parsedAssets,
      liabilities: parsedLiab,
      netWorthConfigured: true
    });
    setNetWorthMessage('Net worth values updated successfully.');
    setTimeout(() => setNetWorthMessage(''), 3000);
  };

  // Add Category
  const handleAddCategory = async () => {
    const clean = newCatInput.trim();
    if (!clean) return;
    if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      alert('Category already exists.');
      return;
    }
    await onSavePreferences({ categories: [...categories, clean] });
    setNewCatInput('');
  };

  const handleRemoveCategory = async (catName) => {
    if (categories.length <= 1) {
      alert('At least one category definition must remain.');
      return;
    }
    const updated = categories.filter(c => c !== catName);
    await onSavePreferences({ categories: updated });
  };

  // Add Account
  const handleAddAccount = async () => {
    const clean = newAccInput.trim();
    if (!clean) return;
    if (accounts.some(a => a.toLowerCase() === clean.toLowerCase())) {
      alert('Account already exists.');
      return;
    }
    await onSavePreferences({ accounts: [...accounts, clean] });
    setNewAccInput('');
  };

  const handleRemoveAccount = async (accName) => {
    const updated = accounts.filter(a => a !== accName);
    await onSavePreferences({ accounts: updated });
  };

  // Restore Ignored Suggestions
  const handleRestoreIgnored = async () => {
    await onSavePreferences({ dismissedPatterns: [] });
    alert('Restored all ignored pattern suggestions.');
  };

  // Run Wipe Data
  const handleExecuteWipe = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setWiping(true);
    setWipeError('');
    try {
      await onWipeData();
      setWiping(false);
      setIsWipeModalOpen(false);
      setDeleteConfirmText('');
    } catch (err) {
      setWiping(false);
      setWipeError(err.message || 'Wipe failed');
    }
  };

  // Exchange Rates state
  const defaultRates = {
    INR: 95,
    EUR: 0.92,
    GBP: 0.78,
    CAD: 1.38,
    AUD: 1.52
  };

  const currentRates = { ...defaultRates, ...(settings.exchangeRates || {}) };
  const [inrRate, setInrRate] = useState(String(currentRates.INR));
  const [eurRate, setEurRate] = useState(String(currentRates.EUR));
  const [gbpRate, setGbpRate] = useState(String(currentRates.GBP));
  const [cadRate, setCadRate] = useState(String(currentRates.CAD));
  const [ratesMessage, setRatesMessage] = useState('');

  const handleSaveRates = async (e) => {
    e.preventDefault();
    await onSavePreferences({
      exchangeRates: {
        INR: parseFloat(inrRate) || 95,
        EUR: parseFloat(eurRate) || 0.92,
        GBP: parseFloat(gbpRate) || 0.78,
        CAD: parseFloat(cadRate) || 1.38
      }
    });
    setRatesMessage('Currency conversion rates updated successfully.');
    setTimeout(() => setRatesMessage(''), 3000);
  };

  const calculatedNetWorth = (parseFloat(assetsInput) || 0) - (parseFloat(liabilitiesInput) || 0);

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>Settings & Preferences</h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>Configure net worth, currency conversion rates, accounts, categories, Drive sync, and data wipe</p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '28px' }}>
        {/* 16.1 Net Worth Setup */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Wallet size={18} color="#6558D3" />
              Net Worth Setup
            </h3>
          </div>
          {netWorthMessage && (
            <div style={{ padding: '8px 12px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> {netWorthMessage}
            </div>
          )}
          <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px' }}>
            Net worth is calculated as <strong>total assets minus total liabilities</strong>. It is independent of your monthly cash flow.
          </p>

          <form onSubmit={handleSaveNetWorth}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Total Assets ($)</label>
                <input type="number" step="0.01" className="form-input" value={assetsInput} onChange={(e) => setAssetsInput(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Total Liabilities ($)</label>
                <input type="number" step="0.01" className="form-input" value={liabilitiesInput} onChange={(e) => setLiabilitiesInput(e.target.value)} required />
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', marginBottom: '16px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#94A3B8' }}>Calculated Net Worth Preview:</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: calculatedNetWorth >= 0 ? '#10B981' : '#EF4444' }}>
                ${calculatedNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button type="submit" className="btn btn-primary btn-sm">Save Net Worth Totals</button>
          </form>
        </div>

        {/* Currency Conversion Rates Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Sparkles size={18} color="#6558D3" />
              Currency Conversion Rates (Relative to 1 USD)
            </h3>
          </div>
          {ratesMessage && (
            <div style={{ padding: '8px 12px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> {ratesMessage}
            </div>
          )}
          <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px', lineHeight: '1.5' }}>
            Set currency exchange rates relative to <strong>1.00 USD ($)</strong>. These rates convert non-USD international assets into equivalent USD ($) values.
          </p>

          <form onSubmit={handleSaveRates}>
            <div className="grid-2" style={{ gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>INR (₹ - India)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" step="0.01" className="form-input" value={inrRate} onChange={(e) => setInrRate(e.target.value)} required />
                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>₹/$</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>EUR (€ - Eurozone)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" step="0.01" className="form-input" value={eurRate} onChange={(e) => setEurRate(e.target.value)} required />
                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>€/$</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>GBP (£ - UK)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" step="0.01" className="form-input" value={gbpRate} onChange={(e) => setGbpRate(e.target.value)} required />
                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>£/$</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>CAD (C$ - Canada)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" step="0.01" className="form-input" value={cadRate} onChange={(e) => setCadRate(e.target.value)} required />
                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>C$/$</span>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-sm">Save Conversion Rates</button>
          </form>
        </div>
      </div>

      {/* Tab & Navigation Visibility Controls */}
      <div className="card" style={{ marginBottom: '28px', padding: '24px' }}>
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <h3 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>
            <Eye size={20} color="#6558D3" />
            Tab & Navigation Visibility Controls
          </h3>
        </div>
        {tabMessage && (
          <div style={{ padding: '8px 12px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> {tabMessage}
          </div>
        )}
        <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
          Control which navigation tabs are visible in your sidebar menu. Toggle off tabs you wish to hide. The <strong>Settings</strong> tab is locked always visible so you can re-enable hidden tabs anytime.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
          {ALL_TABS.map(tab => {
            const Icon = tab.icon;
            const isVisible = tab.alwaysVisible || visibleTabsState[tab.id] !== false;
            return (
              <div
                key={tab.id}
                onClick={() => !tab.alwaysVisible && handleToggleTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: isVisible ? '1px solid #CBD5E1' : '1px dashed #E2E8F0',
                  backgroundColor: isVisible ? '#FFFFFF' : '#F8FAFC',
                  cursor: tab.alwaysVisible ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isVisible ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: isVisible ? '#EEF2FF' : '#F1F5F9',
                    color: isVisible ? '#4F46E5' : '#94A3B8'
                  }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: isVisible ? '#0F172A' : '#64748B' }}>
                      {tab.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      {tab.alwaysVisible ? 'Always Visible' : (isVisible ? 'Visible in Sidebar' : 'Hidden from Sidebar')}
                    </div>
                  </div>
                </div>

                <div style={{
                  width: '44px',
                  height: '24px',
                  backgroundColor: isVisible ? '#6558D3' : '#CBD5E1',
                  borderRadius: '12px',
                  position: 'relative',
                  transition: 'background-color 0.2s ease'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: isVisible ? '22px' : '2px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 16.2 Managed Categories & Accounts */}
      <div className="grid-2" style={{ marginBottom: '28px' }}>
        {/* Managed Categories */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Managed Categories ({categories.length})</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input type="text" className="form-input" placeholder="New category name..." value={newCatInput} onChange={(e) => setNewCatInput(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={handleAddCategory}><Plus size={16} /></button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {categories.map(c => (
              <span key={c} className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', fontSize: '13px' }}>
                {c}
                <button style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', marginLeft: '4px' }} onClick={() => handleRemoveCategory(c)}>×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Managed Accounts */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Managed Accounts ({accounts.length})</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input type="text" className="form-input" placeholder="New account name..." value={newAccInput} onChange={(e) => setNewAccInput(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={handleAddAccount}><Plus size={16} /></button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {accounts.map(a => (
              <span key={a} className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', fontSize: '13px' }}>
                {a}
                <button style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', marginLeft: '4px' }} onClick={() => handleRemoveAccount(a)}>×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 16.4 Google Drive Sync Details */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <FolderCheck size={18} color="#6558D3" />
            Google Drive Sync Configuration
          </h3>
        </div>
        <div className="grid-3" style={{ fontSize: '13px', color: '#94A3B8' }}>
          <div>
            <span style={{ fontWeight: 600, color: '#F8FAFC' }}>Folder:</span>
            <div>
              {driveSyncInfo.folderUrl ? (
                <a
                  href={driveSyncInfo.folderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#6558D3', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                >
                  <span>{driveSyncInfo.folderName || 'Ledgerly Financial Inbox'}</span>
                  <ExternalLink size={13} />
                </a>
              ) : (
                driveSyncInfo.folderName || 'Ledgerly Financial Inbox'
              )}
            </div>
          </div>
          <div>
            <span style={{ fontWeight: 600, color: '#F8FAFC' }}>Schedule:</span>
            <div>Daily at 8:00 AM CDT</div>
          </div>
          <div>
            <span style={{ fontWeight: 600, color: '#F8FAFC' }}>Last Synced:</span>
            <div>{driveSyncInfo.lastSyncedAt ? new Date(driveSyncInfo.lastSyncedAt).toLocaleString() : 'Never'}</div>
          </div>
        </div>
      </div>

      {/* 16.5 Danger Zone */}
      <div className="card" style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ color: '#991B1B' }}>
            <ShieldAlert size={20} color="#DC2626" />
            Danger Zone
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: '#7F1D1D', marginBottom: '16px' }}>
          Erase all transactions, documents, rules, tags, budgets, goals, and settings from D1 database and R2 object storage. Original files in Google Drive will remain intact.
        </p>

        <button className="btn btn-danger" onClick={() => setIsWipeModalOpen(true)}>
          Erase All Ledgerly Data
        </button>
      </div>

      {/* Wipe Confirmation Modal */}
      {isWipeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsWipeModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#DC2626' }}>Confirm Data Wipe</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsWipeModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {wipeError && (
                <div style={{ padding: '10px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>
                  {wipeError}
                </div>
              )}
              <p style={{ fontSize: '14px', color: '#F8FAFC', marginBottom: '12px', lineHeight: '1.5' }}>
                This action is irreversible. All D1 database records and R2 bucket files will be permanently deleted.
              </p>
              <div className="form-group">
                <label className="form-label">Type "<strong>DELETE</strong>" to confirm:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsWipeModalOpen(false)} disabled={wiping}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleExecuteWipe} disabled={deleteConfirmText !== 'DELETE' || wiping}>
                {wiping ? 'Wiping All Data...' : 'Permanently Delete All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
