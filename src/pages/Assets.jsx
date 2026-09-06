import React, { useState } from 'react';
import { Landmark, Plus, Trash2, Edit3, Eye, EyeOff, Building2, TrendingUp, Car, Coins, Wallet, Globe } from 'lucide-react';

const ASSET_TYPES = [
  'Cash / Bank Account',
  'Fixed Deposit (FD)',
  'Mutual Funds',
  'Investments / Stocks',
  'Workplace Solutions Shares',
  '401(k)',
  'Pension',
  'Real Estate',
  'Vehicles',
  'Crypto',
  'Precious Metals',
  'Other'
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'USD ($ - United States)', flag: '🇺🇸' },
  { code: 'INR', symbol: '₹', name: 'INR (₹ - India)', flag: '🇮🇳' },
  { code: 'EUR', symbol: '€', name: 'EUR (€ - Eurozone)', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'GBP (£ - United Kingdom)', flag: '🇬🇧' },
  { code: 'CAD', symbol: 'C$', name: 'CAD (C$ - Canada)', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'AUD (A$ - Australia)', flag: '🇦🇺' }
];

export function Assets({
  assetsList = [],
  settings = {},
  onSaveAsset,
  onPatchAsset,
  onDeleteAsset
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  const [nameInput, setNameInput] = useState('');
  const [typeInput, setTypeInput] = useState(ASSET_TYPES[0]);
  const [currencyInput, setCurrencyInput] = useState('USD');
  const [valueInput, setValueInput] = useState('');
  const [hideCheckbox, setHideCheckbox] = useState(false);

  // Helper to get exchange rate relative to USD
  const getRate = (code) => {
    if (!code || code === 'USD') return 1;
    const rates = { INR: 95, EUR: 0.92, GBP: 0.78, CAD: 1.38, AUD: 1.52, ...(settings.exchangeRates || {}) };
    return rates[code] || 1;
  };

  // Helper to calculate equivalent USD value
  const getUsdVal = (a) => {
    const val = Number(a.value || 0);
    const curr = a.currency || 'USD';
    const rate = getRate(curr);
    return rate > 0 ? val / rate : val;
  };

  // Compute summary metrics in Equivalent USD ($)
  const totalUsdValue = assetsList.reduce((sum, a) => sum + getUsdVal(a), 0);
  const visibleUsdValue = assetsList
    .filter(a => !a.hideFromDashboard)
    .reduce((sum, a) => sum + getUsdVal(a), 0);

  const cashUsdValue = assetsList
    .filter(a => a.type === 'Cash / Bank Account')
    .reduce((sum, a) => sum + getUsdVal(a), 0);

  const hiddenCount = assetsList.filter(a => a.hideFromDashboard).length;

  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setNameInput('');
    setTypeInput(ASSET_TYPES[0]);
    setCurrencyInput('USD');
    setValueInput('');
    setHideCheckbox(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset) => {
    setEditingAsset(asset);
    setNameInput(asset.name || '');
    setTypeInput(asset.type || ASSET_TYPES[0]);
    setCurrencyInput(asset.currency || 'USD');
    setValueInput(String(asset.value || ''));
    setHideCheckbox(Boolean(asset.hideFromDashboard));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nameInput.trim() || !valueInput) return;

    const payload = {
      id: editingAsset ? editingAsset.id : undefined,
      name: nameInput.trim(),
      type: typeInput,
      currency: currencyInput,
      value: parseFloat(valueInput) || 0,
      hideFromDashboard: hideCheckbox
    };

    try {
      await onSaveAsset(payload);
      setIsModalOpen(false);
    } catch (err) {
      alert('Failed to save asset: ' + err.message);
    }
  };

  const handleToggleHide = async (asset) => {
    try {
      await onPatchAsset(asset.id, { hideFromDashboard: !asset.hideFromDashboard });
    } catch (err) {
      alert('Failed to update visibility: ' + err.message);
    }
  };

  const getTypeBadgeStyle = (type) => {
    switch (type) {
      case 'Cash / Bank Account':
        return { backgroundColor: '#ECFDF5', color: '#059669', borderColor: '#A7F3D0' };
      case 'Fixed Deposit (FD)':
        return { backgroundColor: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0' };
      case 'Mutual Funds':
        return { backgroundColor: '#EEF2FF', color: '#4338CA', borderColor: '#C7D2FE' };
      case 'Real Estate':
        return { backgroundColor: '#EFF6FF', color: '#60A5FA', borderColor: '#BFDBFE' };
      case 'Investments / Stocks':
        return { backgroundColor: '#0F172A', color: '#7C3AED', borderColor: '#DDD6FE' };
      case 'Workplace Solutions Shares':
        return { backgroundColor: '#CCFBF1', color: '#0F766E', borderColor: '#99F6E4' };
      case '401(k)':
        return { backgroundColor: '#F3E8FF', color: '#7E22CE', borderColor: '#E9D5FF' };
      case 'Pension':
        return { backgroundColor: '#E0F2FE', color: '#0369A1', borderColor: '#BAE6FD' };
      case 'Vehicles':
        return { backgroundColor: '#FFF7ED', color: '#EA580C', borderColor: '#FFEDD5' };
      case 'Crypto':
        return { backgroundColor: '#FEF3C7', color: '#D97706', borderColor: '#FDE68A' };
      default:
        return { backgroundColor: '#F1F5F9', color: '#CBD5E1', borderColor: '#E2E8F0' };
    }
  };

  // Preview USD calculation in modal
  const modalRate = getRate(currencyInput);
  const modalVal = parseFloat(valueInput) || 0;
  const modalUsdPreview = modalRate > 0 ? modalVal / modalRate : modalVal;
  const activeCurrObj = CURRENCIES.find(c => c.code === currencyInput) || CURRENCIES[0];

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>Assets Portfolio</h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>View, add, and manage multi-currency holdings with automatic USD equivalent conversion</p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={16} />
          <span>Add Asset</span>
        </button>
      </div>

      {/* 4 Summary Cards (All in Equivalent USD) */}
      <div className="grid-4" style={{ marginBottom: '28px' }}>
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>Total Portfolio Value (USD)</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#0F172A', color: '#6558D3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Landmark size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC', marginTop: '4px' }}>
            ${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '8px' }}>
            Across {assetsList.length} global holding(s)
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>Dashboard Net Worth Assets</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Eye size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            ${visibleUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '8px' }}>
            Visible on main Dashboard (USD)
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>Liquid Cash Assets (USD)</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#60A5FA', marginTop: '4px' }}>
            ${cashUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '8px' }}>
            Bank deposits & liquid balances
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>Hidden Assets</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FFF7ED', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EyeOff size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#EA580C', marginTop: '4px' }}>
            {hiddenCount}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '8px' }}>
            Excluded from main Dashboard
          </div>
        </div>
      </div>

      {/* Assets Table Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Building2 size={18} color="#6558D3" />
            Asset Holdings ({assetsList.length})
          </h3>
        </div>

        {assetsList.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Type & Currency</th>
                  <th>Local Currency Value</th>
                  <th>Equivalent Dollar Value ($ USD)</th>
                  <th>Dashboard Visibility</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assetsList.map((asset) => {
                  const badgeStyle = getTypeBadgeStyle(asset.type);
                  const currObj = CURRENCIES.find(c => c.code === (asset.currency || 'USD')) || CURRENCIES[0];
                  const rate = getRate(currObj.code);
                  const usdVal = getUsdVal(asset);

                  return (
                    <tr key={asset.id} style={{ opacity: asset.hideFromDashboard ? 0.75 : 1 }}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '14px' }}>
                          {asset.name}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '99px',
                              fontSize: '11px',
                              fontWeight: 600,
                              border: `1px solid ${badgeStyle.borderColor}`,
                              backgroundColor: badgeStyle.backgroundColor,
                              color: badgeStyle.color
                            }}
                          >
                            {asset.type}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
                            {currObj.flag} {currObj.code}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: '#CBD5E1' }}>
                          {currObj.symbol}{Number(asset.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 800, fontSize: '15px', color: '#059669' }}>
                            ${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </span>
                          {currObj.code !== 'USD' && (
                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                              Rate: 1 USD = {rate} {currObj.code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: asset.hideFromDashboard ? '#EA580C' : '#059669' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(asset.hideFromDashboard)}
                            onChange={() => handleToggleHide(asset)}
                            style={{ width: '16px', height: '16px', accentColor: '#6558D3', cursor: 'pointer' }}
                          />
                          <span>{asset.hideFromDashboard ? 'Hidden from Main Dashboard' : 'Visible on Main Dashboard'}</span>
                        </label>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenEditModal(asset)}
                            title="Edit Asset"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#EF4444' }}
                            onClick={async () => {
                              if (window.confirm(`Delete asset "${asset.name}"?`)) {
                                try {
                                  await onDeleteAsset(asset.id);
                                } catch (err) {
                                  alert('Failed to delete asset: ' + err.message);
                                }
                              }
                            }}
                            title="Delete Asset"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '40px 16px' }}>
            <Landmark size={36} color="#94A3B8" style={{ marginBottom: '12px' }} />
            <p className="empty-state-text">No asset holdings recorded yet. Click "+ Add Asset" above to add multi-currency holdings, checking balances, real estate, or stocks.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Asset Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Asset Name</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. India Fixed Deposit, Primary Residence, Chase Checking"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                  />
                </div>

                <div className="grid-2" style={{ gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Asset Type</label>
                    <select
                      className="form-select"
                      value={typeInput}
                      onChange={(e) => setTypeInput(e.target.value)}
                    >
                      {ASSET_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Country & Currency</label>
                    <select
                      className="form-select"
                      value={currencyInput}
                      onChange={(e) => setCurrencyInput(e.target.value)}
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Asset Amount in Local Currency ({activeCurrObj.symbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    required
                    placeholder={`e.g. 9500000 (${activeCurrObj.code})`}
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                  />
                </div>

                {/* Conversion Rate & Equivalent USD Preview */}
                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>Conversion Rate:</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>
                      1 USD = {modalRate} {currencyInput}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#6558D3' }}>Equivalent Dollar Value:</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>
                      ${modalUsdPreview.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#CBD5E1' }}>
                    <input
                      type="checkbox"
                      checked={hideCheckbox}
                      onChange={(e) => setHideCheckbox(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#6558D3', cursor: 'pointer' }}
                    />
                    <span>Hide from main Dashboard Net Worth</span>
                  </label>
                  <p style={{ fontSize: '12px', color: '#94A3B8', marginLeft: '28px', marginTop: '2px' }}>
                    When checked, this asset value will be excluded from the main Dashboard Net Worth calculation.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingAsset ? 'Update Asset' : 'Save Asset'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
