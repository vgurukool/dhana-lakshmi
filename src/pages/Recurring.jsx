import React, { useState } from 'react';
import { Repeat, Sparkles, Check, EyeOff, Plus, Trash2, Calendar, ShieldCheck } from 'lucide-react';
import { detectRecurringPatterns } from '../utils/recurringDetector';

export function Recurring({
  transactions = [],
  settings = {},
  onSavePreferences
}) {
  const { recurring = [], dismissedPatterns = [] } = settings;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState('monthly');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);

  // Run automatic detection
  const suggestions = detectRecurringPatterns(transactions, dismissedPatterns, recurring);

  // Compute monthly and annual totals (confirmed + visible suggestions)
  const confirmedMonthly = recurring.reduce((sum, item) => {
    const amt = Number(item.amount || 0);
    if (item.cadence === 'weekly') return sum + (amt * 52) / 12;
    if (item.cadence === 'biweekly') return sum + (amt * 26) / 12;
    if (item.cadence === 'monthly') return sum + amt;
    if (item.cadence === 'quarterly') return sum + amt / 3;
    if (item.cadence === 'annual') return sum + amt / 12;
    return sum + amt;
  }, 0);

  const suggestionsMonthly = suggestions.reduce((sum, s) => sum + s.monthlyEquivalent, 0);
  const totalMonthlyCommitment = confirmedMonthly + suggestionsMonthly;
  const totalAnnualCommitment = totalMonthlyCommitment * 12;

  const handleKeepSuggestion = async (s) => {
    const newItem = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: s.merchant,
      category: s.category,
      amount: Number(s.averageAmount.toFixed(2)),
      cadence: s.cadence,
      nextDate: s.nextExpectedDate,
      account: s.sampleAccount,
      active: true
    };
    const updated = [...recurring, newItem];
    await onSavePreferences({ recurring: updated });
  };

  const handleIgnoreSuggestion = async (patternKey) => {
    const updatedDismissed = Array.from(new Set([...dismissedPatterns, patternKey]));
    await onSavePreferences({ dismissedPatterns: updatedDismissed });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!name || !amount) return;

    const newItem = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim(),
      category: category.trim(),
      amount: Math.abs(Number(amount)),
      cadence,
      nextDate,
      active: true
    };

    await onSavePreferences({ recurring: [...recurring, newItem] });
    setIsAddModalOpen(false);
    setName('');
    setAmount('');
  };

  const handleDeleteConfirmed = async (id) => {
    const updated = recurring.filter(r => r.id !== id);
    await onSavePreferences({ recurring: updated });
  };

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>Recurring Payments</h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>Track expected bills, mortgage, utilities, and recurring charges</p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} />
          <span>Add Recurring Payment</span>
        </button>
      </div>

      {/* Detection Status Banner */}
      <div className="card" style={{ backgroundColor: '#0F172A', borderColor: '#DDD6FE', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#6558D3', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#4338CA' }}>Active Detection Engine Running</h4>
            <p style={{ fontSize: '13px', color: '#6558D3' }}>
              Ledgerly analyzes recorded transactions for weekly, biweekly, monthly, quarterly, and annual cadence patterns.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-2" style={{ marginBottom: '28px' }}>
        <div className="card">
          <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Estimated Monthly Commitment</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#F8FAFC', marginTop: '6px' }}>
            ${totalMonthlyCommitment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="card">
          <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Estimated Annual Commitment</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#6558D3', marginTop: '6px' }}>
            ${totalAnnualCommitment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Suggestions Panel */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#F8FAFC' }}>
            Detected Recurring Payment Suggestions ({suggestions.length})
          </h3>
          <div className="grid-2">
            {suggestions.map(s => (
              <div key={s.patternKey} className="card" style={{ borderColor: '#6558D3', backgroundColor: '#FAFAFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '16px', color: '#F8FAFC' }}>{s.merchant}</h4>
                    <span className="badge badge-primary" style={{ marginTop: '4px' }}>{s.category} • {s.cadence}</span>
                  </div>
                  <span className={`badge ${s.confidence === 'High' ? 'badge-success' : 'badge-info'}`}>
                    {s.confidence} Confidence
                  </span>
                </div>
                <div style={{ fontSize: '14px', marginBottom: '16px', color: '#CBD5E1' }}>
                  Avg charge: <strong>${s.averageAmount.toFixed(2)}</strong> (${s.monthlyEquivalent.toFixed(2)}/mo equiv)
                  <br />
                  Next date: <strong>{s.nextExpectedDate}</strong> ({s.occurrenceCount} occurrences)
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleKeepSuggestion(s)}>
                    <Check size={14} /> Keep (Confirm)
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleIgnoreSuggestion(s.patternKey)}>
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
          <h3 className="card-title">Confirmed Recurring Payments</h3>
        </div>
        {recurring.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name / Merchant</th>
                  <th>Category</th>
                  <th>Cadence</th>
                  <th>Next Due</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recurring.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700 }}>{r.name}</td>
                    <td><span className="badge badge-primary">{r.category}</span></td>
                    <td style={{ textTransform: 'capitalize' }}>{r.cadence}</td>
                    <td>{r.nextDate || 'N/A'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>${Number(r.amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#EF4444' }} onClick={() => handleDeleteConfirmed(r.id)}>
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
            <div className="empty-state-icon"><Repeat size={28} /></div>
            <h3 className="empty-state-title">No confirmed recurring payments</h3>
            <p className="empty-state-text">Click "Add Recurring Payment" or accept an automatically detected suggestion above.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Recurring Payment</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Payment Name</label>
                  <input type="text" className="form-input" required placeholder="e.g. Electric Utility, Rent" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Amount ($)</label>
                    <input type="number" step="0.01" className="form-input" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cadence</label>
                    <select className="form-select" value={cadence} onChange={(e) => setCadence(e.target.value)}>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input type="text" className="form-input" value={category} onChange={(e) => setCategory(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Next Expected Date</label>
                    <input type="date" className="form-input" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Recurring Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
