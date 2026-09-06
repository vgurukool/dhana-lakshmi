import React, { useState } from 'react';
import { Search, Filter, Plus, Tag as TagIcon, FileCheck, Trash2, Calendar, CreditCard } from 'lucide-react';

export function Transactions({
  transactions = [],
  categories = [],
  accounts = [],
  tags = [],
  selectedPeriod,
  onPeriodChange,
  onPatchTransaction,
  onDeleteTransaction,
  onOpenAddEntry
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [editingTagTxId, setEditingTagTxId] = useState(null);
  const [tagModalSelected, setTagModalSelected] = useState([]);
  // Extract distinct available years from transaction dates (e.g. 2026, 2025, 2024)
  const availableYears = Array.from(new Set(
    transactions
      .map(t => {
        if (!t.date) return null;
        const y = new Date(t.date).getFullYear();
        return !isNaN(y) && y >= 2000 && y <= 2035 ? String(y) : null;
      })
      .filter(Boolean)
  )).sort((a, b) => b - a);

  // Date filtering logic
  const filterByPeriod = (txList, period) => {
    if (period === 'all-time' || !period) return txList;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return txList.filter(t => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;
      const y = d.getFullYear();
      const m = d.getMonth();

      if (period === 'this-month') return y === currentYear && m === currentMonth;
      if (period === 'last-month') {
        const lastM = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastY = currentMonth === 0 ? currentYear - 1 : currentYear;
        return y === lastY && m === lastM;
      }
      if (period === 'last-3-months') {
        const cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() - 3);
        return d >= cutoff;
      }
      if (period === 'last-6-months') {
        const cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() - 6);
        return d >= cutoff;
      }
      if (period === 'this-year') return y === currentYear;

      // Specific year matching (e.g. year-2025 or year-2024 or 2025)
      if (period.startsWith('year-')) {
        const targetYear = parseInt(period.replace('year-', ''), 10);
        return y === targetYear;
      }
      if (/^\d{4}$/.test(period)) {
        return y === parseInt(period, 10);
      }

      return true;
    });
  };

  const periodFiltered = filterByPeriod(transactions, selectedPeriod);

  // Search & filter
  const filteredList = periodFiltered.filter(t => {
    const q = search.toLowerCase();
    const matchSearch =
      t.merchant.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.tags && t.tags.some(tg => tg.toLowerCase().includes(q)));
    const matchCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchAcc = selectedAccount === 'all' || t.account === selectedAccount;
    return matchSearch && matchCat && matchAcc;
  });

  // Inline Category Change
  const handleCategorySelect = async (txId, newCategory) => {
    try {
      await onPatchTransaction(txId, { category: newCategory });
    } catch (err) {
      alert('Failed to update category: ' + err.message);
    }
  };

  // Toggle Mark as Subscription
  const handleMarkSubscription = async (tx) => {
    const isSub = tx.category === 'Subscriptions';
    const newCat = isSub ? 'Other' : 'Subscriptions';
    try {
      await onPatchTransaction(tx.id, { category: newCat });
    } catch (err) {
      alert('Failed to update subscription status: ' + err.message);
    }
  };

  // Remove Tag Pill
  const handleRemoveTagPill = async (tId, tagToRemove, currentTags) => {
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    try {
      await onPatchTransaction(tId, { tags: updatedTags });
    } catch (err) {
      alert('Failed to update tag: ' + err.message);
    }
  };

  // Tag Modal Open
  const handleOpenTagModal = (tx) => {
    setEditingTagTxId(tx.id);
    setTagModalSelected(tx.tags || []);
    setNewTagInput('');
  };

  const handleSaveTagModal = async () => {
    if (!editingTagTxId) return;
    let finalTags = [...tagModalSelected];
    if (newTagInput.trim() && !finalTags.includes(newTagInput.trim())) {
      finalTags.push(newTagInput.trim());
    }

    try {
      await onPatchTransaction(editingTagTxId, { tags: finalTags });
      setEditingTagTxId(null);
    } catch (err) {
      alert('Failed to save tags: ' + err.message);
    }
  };

  // Dynamic totals based on current active filters
  const totalIncome = filteredList
    .filter(t => t.type === 'income' && t.category !== 'Transfer')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpenses = filteredList
    .filter(t => t.type === 'expense' && t.category !== 'Credit Card Payment' && t.category !== 'Transfer')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netFlow = totalIncome - totalExpenses;

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>Transactions</h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>View, filter, and edit your recorded financial ledger</p>
        </div>

        <button className="btn btn-primary" onClick={onOpenAddEntry}>
          <Plus size={16} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Dynamic Summary Cards Based on Selected Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {/* Total Income */}
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #10B981', background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Filtered Income
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#065F46' }}>
            +${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px' }}>
            {filteredList.filter(t => t.type === 'income' && t.category !== 'Transfer').length} income items
          </div>
        </div>

        {/* Total Expenses */}
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #EF4444', background: 'linear-gradient(135deg, #FFFFFF 0%, #FEF2F2 100%)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedCategory !== 'all' ? `Total ${selectedCategory}` : 'Filtered Expenses'}
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#991B1B' }}>
            -${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>
            {filteredList.filter(t => t.type === 'expense' && t.category !== 'Credit Card Payment' && t.category !== 'Transfer').length} expense items
          </div>
        </div>

        {/* Net Flow */}
        <div className="card" style={{ padding: '16px', borderLeft: `4px solid ${netFlow >= 0 ? '#6558D3' : '#F59E0B'}`, background: netFlow >= 0 ? 'linear-gradient(135deg, #FFFFFF 0%, #F5F3FF 100%)' : 'linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: netFlow >= 0 ? '#4C1D95' : '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Net Flow
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: netFlow >= 0 ? '#6558D3' : '#D97706' }}>
            {netFlow >= 0 ? '+' : '-'}${Math.abs(netFlow).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '4px' }}>
            Filtered net cash flow
          </div>
        </div>

        {/* Total Matches */}
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #3B82F6', background: '#1E293B', border: '1px solid #334155' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Total Records
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#60A5FA' }}>
            {filteredList.length.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>/ {transactions.length}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#60A5FA', marginTop: '4px' }}>
            Matching active filters
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', gridColumn: 'span 1' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px', minHeight: '40px', fontSize: '14px' }}
              placeholder="Search merchant, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Account Filter */}
          <div>
            <select
              className="form-select"
              style={{ minHeight: '40px', fontSize: '14px' }}
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              <option value="all">All Accounts</option>
              {Array.from(new Set([...accounts, ...transactions.map(t => t.account).filter(Boolean)])).map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              className="form-select"
              style={{ minHeight: '40px', fontSize: '14px' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Shared Date Period Selector with Specific Years */}
          <div>
            <select
              className="form-select"
              style={{ minHeight: '40px', fontSize: '14px', fontWeight: 600, color: '#6558D3', backgroundColor: '#0F172A' }}
              value={selectedPeriod || 'all-time'}
              onChange={(e) => onPeriodChange(e.target.value)}
            >
              <option value="all-time">Period: All time</option>
              <option value="this-month">Period: This month</option>
              <option value="last-month">Period: Last month</option>
              <option value="last-3-months">Period: Last 3 months</option>
              <option value="last-6-months">Period: Last 6 months</option>
              <option value="this-year">Period: Current Year ({new Date().getFullYear()})</option>

              {availableYears.length > 0 && (
                <optgroup label="Filter by Specific Year">
                  {availableYears.map(yr => (
                    <option key={`year-${yr}`} value={`year-${yr}`}>
                      Year: {yr}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      {filteredList.length > 0 ? (
        <div className="table-container card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Date</th>
                <th>Merchant</th>
                <th style={{ width: '170px' }}>Category</th>
                <th style={{ width: '150px' }}>Account</th>
                <th>Tags</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Amount</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(t => {
                const isSub = t.category === 'Subscriptions';
                return (
                  <tr key={t.id}>
                    <td style={{ fontSize: '13px', color: '#94A3B8' }}>{t.date}</td>
                    <td style={{ fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{t.merchant}</span>
                        {t.receipt && (
                          <span title="Receipt attached" style={{ color: '#10B981', display: 'inline-flex' }}>
                            <FileCheck size={14} />
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Inline Category Editing */}
                    <td>
                      <select
                        className="form-select"
                        style={{ padding: '4px 8px', minHeight: '32px', fontSize: '13px', borderRadius: '6px', fontWeight: 500 }}
                        value={t.category || 'Needs review'}
                        onChange={(e) => handleCategorySelect(t.id, e.target.value)}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ fontSize: '13px', color: '#CBD5E1' }}>{t.account}</td>
                    {/* Inline Tag Editing */}
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                        {(t.tags || []).map(tg => (
                          <span
                            key={tg}
                            className="badge badge-primary"
                            style={{ cursor: 'pointer', fontSize: '11px', padding: '2px 8px' }}
                            title="Click to remove tag"
                            onClick={() => handleRemoveTagPill(t.id, tg, t.tags || [])}
                          >
                            {tg} ×
                          </span>
                        ))}
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 6px', minHeight: '24px', fontSize: '12px', color: '#6558D3' }}
                          title="Add/edit tags"
                          onClick={() => handleOpenTagModal(t)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: t.type === 'income' ? '#10B981' : '#F87171', fontSize: '15px' }}>
                      {t.type === 'income' ? `+$${t.amount.toFixed(2)}` : `-$${t.amount.toFixed(2)}`}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: isSub ? '#6558D3' : '#94A3B8', padding: '4px' }}
                          title={isSub ? 'Subscription active' : 'Mark as subscription'}
                          onClick={() => handleMarkSubscription(t)}
                        >
                          <CreditCard size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#EF4444', padding: '4px' }}
                          title="Delete entry"
                          onClick={() => onDeleteTransaction(t.id)}
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
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={28} />
          </div>
          <h3 className="empty-state-title">No transactions found</h3>
          <p className="empty-state-text">
            {transactions.length === 0
              ? 'Your financial ledger is currently empty. Click "Add entry" or "Import" to populate.'
              : 'No transactions match your current period or filter criteria.'}
          </p>
        </div>
      )}

      {/* Tag Modal */}
      {editingTagTxId && (
        <div className="modal-overlay" onClick={() => setEditingTagTxId(null)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Tags</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingTagTxId(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '12px' }}>
                Select existing tags or create a new tag name. No category required.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                {tags.map(tObj => {
                  const tName = typeof tObj === 'string' ? tObj : tObj.name;
                  const isSelected = tagModalSelected.includes(tName);
                  return (
                    <button
                      key={tName}
                      type="button"
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        if (isSelected) setTagModalSelected(tagModalSelected.filter(x => x !== tName));
                        else setTagModalSelected([...tagModalSelected, tName]);
                      }}
                    >
                      {tName}
                    </button>
                  );
                })}
              </div>

              <div className="form-group">
                <label className="form-label">Create New Tag</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter tag name..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingTagTxId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveTagModal}>Save Tags</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
