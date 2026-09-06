import React, { useState } from 'react';
import { CreditCard, Sparkles, Check, EyeOff, Plus, Trash2 } from 'lucide-react';
import { detectRecurringPatterns } from '../utils/recurringDetector';

export function Subscriptions({
  transactions = [],
  settings = {},
  onSavePreferences
}) {
  const { subscriptions = [], dismissedPatterns = [] } = settings;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [service, setService] = useState('');
  const [category, setCategory] = useState('Subscriptions');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState('monthly');
  const [nextRenewal, setNextRenewal] = useState(new Date().toISOString().split('T')[0]);

  // Run automatic detection
  const allDetected = detectRecurringPatterns(transactions, dismissedPatterns, subscriptions);
  const subSuggestions = allDetected.filter(s => s.type === 'subscription');

  // Totals calculations
  const confirmedMonthly = subscriptions.reduce((sum, item) => {
    const amt = Number(item.amount || 0);
    if (item.cadence === 'weekly') return sum + (amt * 52) / 12;
    if (item.cadence === 'biweekly') return sum + (amt * 26) / 12;
    if (item.cadence === 'monthly') return sum + amt;
    if (item.cadence === 'quarterly') return sum + amt / 3;
    if (item.cadence === 'annual') return sum + amt / 12;
    return sum + amt;
  }, 0);

  const suggestionsMonthly = subSuggestions.reduce((sum, s) => sum + s.monthlyEquivalent, 0);
  const totalMonthly = confirmedMonthly + suggestionsMonthly;
  const totalAnnual = totalMonthly * 12;

  const handleKeep = async (s) => {
    const newItem = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      service: s.merchant,
      category: s.category || 'Subscriptions',
      amount: Number(s.averageAmount.toFixed(2)),
      cadence: s.cadence,
      nextRenewal: s.nextExpectedDate,
      account: s.sampleAccount,
      active: true
    };
    await onSavePreferences({ subscriptions: [...subscriptions, newItem] });
  };

  const handleIgnore = async (patternKey) => {
    const updated = Array.from(new Set([...dismissedPatterns, patternKey]));
    await onSavePreferences({ dismissedPatterns: updated });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!service || !amount) return;

    const newItem = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      service: service.trim(),
      category: category.trim(),
      amount: Math.abs(Number(amount)),
      cadence,
      nextRenewal,
      active: true
    };

    await onSavePreferences({ subscriptions: [...subscriptions, newItem] });
    setIsAddModalOpen(false);
    setService('');
    setAmount('');
  };

  const handleDeleteConfirmed = async (id) => {
    const updated = subscriptions.filter(s => s.id !== id);
    await onSavePreferences({ subscriptions: updated });
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>Subscriptions</h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>Monitor active digital memberships, software, and recurring streaming services</p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} />
          <span>Add Subscription</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid-2" style={{ marginBottom: '28px' }}>
        <div className="card">
          <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Estimated Monthly Subscriptions</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#6558D3', marginTop: '6px' }}>
            ${totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="card">
          <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Estimated Annual Subscriptions</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#F8FAFC', marginTop: '6px' }}>
            ${totalAnnual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Detected Suggestions */}
      {subSuggestions.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#F8FAFC' }}>
            Detected Subscription Suggestions ({subSuggestions.length})
          </h3>
          <div className="grid-2">
            {subSuggestions.map(s => (
              <div key={s.patternKey} className="card" style={{ borderColor: '#6558D3', backgroundColor: '#FAFAFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '16px', color: '#F8FAFC' }}>{s.merchant}</h4>
                    <span className="badge badge-primary" style={{ marginTop: '4px' }}>{s.cadence}</span>
                  </div>
                  <span className="badge badge-success">{s.confidence} Confidence</span>
                </div>
                <div style={{ fontSize: '14px', marginBottom: '16px', color: '#CBD5E1' }}>
                  Avg cost: <strong>${s.averageAmount.toFixed(2)}</strong> (${s.monthlyEquivalent.toFixed(2)}/mo equiv)
                  <br />
                  Next renewal: <strong>{s.nextExpectedDate}</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleKeep(s)}>
                    <Check size={14} /> Keep Subscription
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleIgnore(s.patternKey)}>
                    <EyeOff size={14} /> Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Confirmed Subscriptions</h3>
        </div>
        {subscriptions.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Service / Merchant</th>
                  <th>Category</th>
                  <th>Cadence</th>
                  <th>Next Renewal</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.service}</td>
                    <td><span className="badge badge-primary">{s.category || 'Subscriptions'}</span></td>
                    <td style={{ textTransform: 'capitalize' }}>{s.cadence}</td>
                    <td>{s.nextRenewal || 'N/A'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>${Number(s.amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#EF4444' }} onClick={() => handleDeleteConfirmed(s.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><CreditCard size={28} /></div>
            <h3 className="empty-state-title">No confirmed subscriptions</h3>
            <p className="empty-state-text">Click "Add Subscription" or confirm an automatically detected service suggestion.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Subscription</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Service Name</label>
                  <input type="text" className="form-input" required placeholder="e.g. Netflix, Spotify, GitHub" value={service} onChange={(e) => setService(e.target.value)} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Amount ($)</label>
                    <input type="number" step="0.01" className="form-input" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cadence</label>
                    <select className="form-select" value={cadence} onChange={(e) => setCadence(e.target.value)}>
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                      <option value="weekly">Weekly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input type="text" className="form-input" value={category} onChange={(e) => setCategory(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Next Renewal Date</label>
                    <input type="date" className="form-input" value={nextRenewal} onChange={(e) => setNextRenewal(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Subscription</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
