import React, { useState, useEffect } from 'react';
import { X, Upload, Plus } from 'lucide-react';

export function AddEntryModal({ isOpen, onClose, onSave, categories = [], accounts = [], tags = [] }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(categories[0] || 'Needs review');
  const [account, setAccount] = useState(accounts[0] || 'Main Checking');
  const [selectedTags, setSelectedTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [hasReceipt, setHasReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && (!category || !categories.includes(category))) {
      setCategory(categories[0]);
    }
  }, [categories]);

  useEffect(() => {
    if (accounts.length > 0 && (!account || !accounts.includes(account))) {
      setAccount(accounts[0]);
    }
  }, [accounts]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (t) => {
    setSelectedTags(selectedTags.filter(item => item !== t));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!merchant.trim()) {
      setError('Please enter a merchant or source name.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!date) {
      setError('Please enter a valid date.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        type,
        amount: numAmount,
        merchant: merchant.trim(),
        date,
        category,
        account: account || 'Imported account',
        tags: selectedTags,
        receipt: hasReceipt && receiptFile ? true : false,
        receiptFile: hasReceipt ? receiptFile : null,
        source: 'manual'
      });
      setSaving(false);
      onClose();
      // Reset form
      setAmount('');
      setMerchant('');
      setSelectedTags([]);
      setHasReceipt(false);
      setReceiptFile(null);
    } catch (err) {
      setSaving(false);
      setError(err.message || 'Failed to save entry.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Transaction</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                {error}
              </div>
            )}

            {/* Type Segmented */}
            <div className="form-group">
              <label className="form-label">Entry Type</label>
              <div style={{ display: 'flex', gap: '8px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: type === 'expense' ? '#ffffff' : 'transparent',
                    color: type === 'expense' ? '#EA580C' : '#64748B',
                    boxShadow: type === 'expense' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                  onClick={() => setType('expense')}
                >
                  Expense (-)
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: type === 'income' ? '#ffffff' : 'transparent',
                    color: type === 'income' ? '#059669' : '#64748B',
                    boxShadow: type === 'income' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                  onClick={() => setType('income')}
                >
                  Income (+)
                </button>
              </div>
            </div>

            {/* Amount & Date Grid */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Merchant */}
            <div className="form-group">
              <label className="form-label">{type === 'expense' ? 'Merchant / Payee' : 'Source / Payer'}</label>
              <input
                type="text"
                className="form-input"
                placeholder={type === 'expense' ? 'e.g. Grocery Store, Netflix' : 'e.g. Employer, Client'}
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
              />
            </div>

            {/* Category & Account */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Account</label>
                {accounts.length > 0 ? (
                  <select className="form-select" value={account} onChange={(e) => setAccount(e.target.value)}>
                    {accounts.map(acc => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" className="form-input" value="Imported account" disabled />
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="form-group">
              <label className="form-label">Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {selectedTags.map(t => (
                  <span key={t} className="badge badge-primary" style={{ cursor: 'pointer' }} onClick={() => handleRemoveTag(t)}>
                    {t} ×
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Add a tag name..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddTag}>
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Receipt Checkbox & Picker */}
            <div className="form-group" style={{ marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={hasReceipt}
                  onChange={(e) => setHasReceipt(e.target.checked)}
                />
                I have a receipt to attach
              </label>

              {hasReceipt && (
                <div style={{ marginTop: '10px' }}>
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                  />
                </div>
              )}
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
