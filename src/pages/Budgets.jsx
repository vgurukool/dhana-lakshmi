import React, { useState } from 'react';
import { PieChart, Plus, AlertCircle, CheckCircle2, Edit3, Trash2, Calendar } from 'lucide-react';

export function Budgets({
  transactions = [],
  categories = [],
  settings = {},
  onSavePreferences
}) {
  const { budgets = [] } = settings;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || 'Groceries');
  const [limit, setLimit] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState('all-time');

  const isTransferCategory = (cat) => {
    if (!cat) return false;
    const lower = String(cat).toLowerCase();
    return lower.includes('credit card payment') ||
           lower.includes('transfer') ||
           lower.includes('card payment') ||
           lower.includes('internal transfer');
  };

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
      if (period === 'this-year') return y === currentYear;
      return true;
    });
  };

  const periodExpenses = filterByPeriod(transactions, budgetPeriod).filter(t => {
    return t.type === 'expense' && !isTransferCategory(t.category);
  });

  const categorySpentMap = {};
  periodExpenses.forEach(t => {
    const cat = t.category || 'Needs review';
    categorySpentMap[cat] = (categorySpentMap[cat] || 0) + Number(t.amount || 0);
  });

  const budgetItems = budgets.map(b => {
    const spent = categorySpentMap[b.category] || 0;
    const bLimit = Number(b.limit || 0);
    const remaining = bLimit - spent;
    const percent = bLimit > 0 ? Math.min(100, Math.round((spent / bLimit) * 100)) : 0;
    const isOver = spent > bLimit;

    return {
      ...b,
      spent,
      remaining,
      percent,
      isOver
    };
  });

  const totalBudgeted = budgetItems.reduce((acc, b) => acc + Number(b.limit || 0), 0);
  const totalSpentInBudgets = budgetItems.reduce((acc, b) => acc + b.spent, 0);
  const overBudgetCount = budgetItems.filter(b => b.isOver).length;

  const handleOpenAdd = () => {
    setEditingBudgetId(null);
    setSelectedCategory(categories[0] || 'Groceries');
    setLimit('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b) => {
    setEditingBudgetId(b.id);
    setSelectedCategory(b.category);
    setLimit(String(b.limit));
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    const numLimit = parseFloat(limit);
    if (isNaN(numLimit) || numLimit <= 0) return;

    let updated = [];
    if (editingBudgetId) {
      updated = budgets.map(b => b.id === editingBudgetId ? { ...b, category: selectedCategory, limit: numLimit } : b);
    } else {
      const newB = {
        id: `bud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category: selectedCategory,
        limit: numLimit,
        active: true
      };
      updated = [...budgets, newB];
    }

    await onSavePreferences({ budgets: updated });
    setIsModalOpen(false);
  };

  const handleDeleteBudget = async (id) => {
    const updated = budgets.filter(b => b.id !== id);
    await onSavePreferences({ budgets: updated });
  };

  return (
    <div className="page-wrapper">
      {/* Header & Period Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>Monthly Budgets</h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>Set category spending caps and monitor live monthly progress</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Period Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FFFFFF', padding: '6px 12px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <Calendar size={16} color="#6558D3" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>Period:</span>
            <select
              className="form-select"
              style={{ minHeight: '36px', padding: '4px 10px', fontSize: '13px', border: 'none', backgroundColor: 'transparent', fontWeight: 700, color: '#F8FAFC', cursor: 'pointer' }}
              value={budgetPeriod}
              onChange={(e) => setBudgetPeriod(e.target.value)}
            >
              <option value="all-time">All time</option>
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
              <option value="this-year">This year</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Create Budget</span>
          </button>
        </div>
      </div>

      {/* Budget Health Summary */}
      {budgets.length > 0 && (
        <div className="card" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>Budget Health Summary</h3>
              <p style={{ fontSize: '13px', color: '#94A3B8' }}>
                {overBudgetCount > 0
                  ? `${overBudgetCount} category budget(s) currently exceeded.`
                  : 'All category budgets are within target limits.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Total Budgeted</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#F8FAFC' }}>
                  ${totalBudgeted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Spent</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: totalSpentInBudgets > totalBudgeted ? '#EF4444' : '#10B981' }}>
                  ${totalSpentInBudgets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Items Grid */}
      {budgetItems.length > 0 ? (
        <div className="grid-2">
          {budgetItems.map(b => (
            <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: b.isOver ? '#FEF2F2' : '#F5F3FF', color: b.isOver ? '#EF4444' : '#6558D3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PieChart size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>{b.category}</h4>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                        Limit: ${Number(b.limit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEdit(b)} title="Edit Budget">
                      <Edit3 size={16} />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#EF4444' }} onClick={() => handleDeleteBudget(b.id)} title="Delete Budget">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    <span style={{ color: '#F8FAFC' }}>
                      Spent: ${b.spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ color: b.isOver ? '#EF4444' : '#64748B' }}>
                      {b.percent}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '99px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${b.percent}%`,
                        height: '100%',
                        backgroundColor: b.isOver ? '#EF4444' : b.percent > 85 ? '#F59E0B' : '#6558D3',
                        borderRadius: '99px',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '12px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#94A3B8' }}>
                  {b.isOver ? 'Over Limit By:' : 'Remaining:'}
                </span>
                <span style={{ fontWeight: 700, color: b.isOver ? '#EF4444' : '#10B981' }}>
                  {b.isOver
                    ? `$${Math.abs(b.remaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `$${b.remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state" style={{ padding: '40px 16px' }}>
            <PieChart size={36} color="#94A3B8" style={{ marginBottom: '12px' }} />
            <p className="empty-state-text">No category budgets created. Click "+ Create Budget" above to set spending caps for Groceries, Dining, Utilities, or Housing.</p>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingBudgetId ? 'Edit Budget' : 'Create Category Budget'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveBudget}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Monthly Limit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    required
                    placeholder="e.g. 500.00"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingBudgetId ? 'Update Budget' : 'Save Budget'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
