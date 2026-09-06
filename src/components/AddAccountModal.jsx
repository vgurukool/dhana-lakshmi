import React, { useState, useEffect } from 'react';
import { X, Building2, Landmark, Home, Car, Shield, CreditCard } from 'lucide-react';

export function AddAccountModal({ isOpen, onClose, initialData, onSaveAccount }) {
  if (!isOpen) return null;

  const [category, setCategory] = useState(initialData?.category || 'mortgage');
  const [name, setName] = useState(initialData?.name || '');
  const [institution, setInstitution] = useState(initialData?.institution || '');
  const [accountNumberLast4, setAccountNumberLast4] = useState(initialData?.accountNumberLast4 || '');
  const [balance, setBalance] = useState(initialData?.balance !== undefined ? initialData.balance : '');
  const [interestRate, setInterestRate] = useState(initialData?.interestRate !== undefined ? initialData.interestRate : '');
  const [paymentAmount, setPaymentAmount] = useState(initialData?.paymentAmount !== undefined ? initialData.paymentAmount : '');
  const [paymentFrequency, setPaymentFrequency] = useState(initialData?.paymentFrequency || 'monthly');
  const [dueDay, setDueDay] = useState(initialData?.dueDay || 1);
  const [nextDueDate, setNextDueDate] = useState(initialData?.nextDueDate || new Date().toISOString().split('T')[0]);
  const [autoPay, setAutoPay] = useState(initialData?.autoPay || false);
  const [maturityDate, setMaturityDate] = useState(initialData?.maturityDate || '');
  const [coverageAmount, setCoverageAmount] = useState(initialData?.coverageAmount !== undefined ? initialData.coverageAmount : '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !institution.trim()) return;

    onSaveAccount({
      id: initialData?.id,
      category,
      name: name.trim(),
      institution: institution.trim(),
      accountNumberLast4: accountNumberLast4.trim(),
      balance: parseFloat(balance) || 0,
      interestRate: parseFloat(interestRate) || 0,
      paymentAmount: parseFloat(paymentAmount) || 0,
      paymentFrequency,
      dueDay: parseInt(dueDay, 10) || 1,
      nextDueDate,
      autoPay: !!autoPay,
      maturityDate,
      coverageAmount: parseFloat(coverageAmount) || 0,
      notes: notes.trim()
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} color="#FBBF24" />
            {initialData ? 'Edit Financial Account / Loan' : 'Add Financial Account, Loan or Insurance'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Category Selector */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Account / Obligation Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
                  { id: 'mortgage', label: 'Mortgage', icon: Home },
                  { id: 'auto_loan', label: 'Auto Loan', icon: Car },
                  { id: 'personal_loan', label: 'Other Loan', icon: Landmark },
                  { id: 'insurance', label: 'Insurance', icon: Shield }
                ].map(c => {
                  const Icon = c.icon;
                  const isSel = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: isSel ? '1px solid #F59E0B' : '1px solid #334155',
                        backgroundColor: isSel ? 'rgba(245, 158, 11, 0.2)' : '#1E293B',
                        color: isSel ? '#FBBF24' : '#CBD5E1',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Icon size={16} />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name & Institution */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Account / Policy Name *</label>
                <input
                  required
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Chase Sapphire Reserve / Primary Mortgage"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Lender / Bank / Insurer *</label>
                <input
                  required
                  className="form-input"
                  value={institution}
                  onChange={e => setInstitution(e.target.value)}
                  placeholder="e.g. Chase / Tesla Finance / State Farm"
                />
              </div>
            </div>

            {/* Last 4 & Balance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  {category === 'credit_card' ? 'Current / Statement Balance ($)' : category === 'insurance' ? 'Coverage Amount ($)' : 'Remaining Principal Balance ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={category === 'insurance' ? coverageAmount : balance}
                  onChange={e => category === 'insurance' ? setCoverageAmount(e.target.value) : setBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Account / Policy # (Last 4 Digits)</label>
                <input
                  className="form-input"
                  value={accountNumberLast4}
                  onChange={e => setAccountNumberLast4(e.target.value)}
                  placeholder="e.g. 4912"
                  maxLength={6}
                />
              </div>
            </div>

            {/* Payment Amount & Frequency */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Recurring Payment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 2450.00"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Payment Frequency</label>
                <select
                  className="form-select"
                  value={paymentFrequency}
                  onChange={e => setPaymentFrequency(e.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Bi-Weekly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semiannual">Semi-Annually</option>
                  <option value="annual">Annually</option>
                </select>
              </div>
            </div>

            {/* Next Due Date & Interest Rate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Next Payment Due Date *</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={nextDueDate}
                  onChange={e => setNextDueDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Interest Rate (% APR)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value)}
                  placeholder="e.g. 4.125"
                />
              </div>
            </div>

            {/* Autopay Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
              <input
                type="checkbox"
                id="autopayCheck"
                checked={autoPay}
                onChange={e => setAutoPay(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#F59E0B', cursor: 'pointer' }}
              />
              <label htmlFor="autopayCheck" style={{ fontSize: '13px', color: '#CBD5E1', cursor: 'pointer', fontWeight: 600 }}>
                Recurring Autopay is active on this account (auto-debited on due date)
              </label>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Notes & Escrow Details</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Includes P&I + escrow taxes. Serviced via mobile app."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
