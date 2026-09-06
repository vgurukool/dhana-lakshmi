import React, { useState } from 'react';
import { Sliders, Tag as TagIcon, Plus, Trash2, Edit3, CheckSquare, Square, Sparkles, HelpCircle } from 'lucide-react';

export function RulesAndTags({
  rules = [],
  tags = [],
  transactions = [],
  categories = [],
  onSavePreferences,
  onApplyRulesNow,
  onPatchTransaction
}) {
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [whenText, setWhenText] = useState('');
  const [operator, setOperator] = useState('OR');
  const [thenText, setThenText] = useState(categories[0] || 'Groceries');
  const [applyingRules, setApplyingRules] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagNameInput, setTagNameInput] = useState('');

  // Compute tag usage counts
  const tagCounts = {};
  transactions.forEach(t => {
    (t.tags || []).forEach(tg => {
      tagCounts[tg] = (tagCounts[tg] || 0) + 1;
    });
  });

  // Rule Handlers
  const handleOpenAddRule = () => {
    setEditingRuleId(null);
    setWhenText('');
    setOperator('OR');
    setThenText(categories[0] || 'Groceries');
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (rule) => {
    setEditingRuleId(rule.id);
    setWhenText(rule.whenText || '');
    setOperator(rule.operator || 'OR');
    setThenText(rule.thenText || categories[0] || 'Groceries');
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!whenText.trim()) return;

    let updatedRules = [];
    if (editingRuleId) {
      updatedRules = rules.map(r => r.id === editingRuleId ? {
        ...r,
        whenText: whenText.trim(),
        operator: operator,
        thenText: thenText.trim()
      } : r);
    } else {
      const newRule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        whenText: whenText.trim(),
        operator: operator,
        thenText: thenText.trim(),
        enabled: true,
        createdAt: new Date().toISOString()
      };
      updatedRules = [...rules, newRule];
    }

    await onSavePreferences({ rules: updatedRules });
    setIsRuleModalOpen(false);
    setStatusMsg(`Rule saved and applied across existing transactions!`);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleToggleRule = async (ruleId) => {
    const updated = rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r);
    await onSavePreferences({ rules: updated });
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Delete this categorization rule?')) return;
    const updated = rules.filter(r => r.id !== ruleId);
    await onSavePreferences({ rules: updated });
  };

  // Tag Handlers
  const handleSaveTag = async (e) => {
    e.preventDefault();
    const clean = tagNameInput.trim();
    if (!clean) return;

    const existingNames = tags.map(t => typeof t === 'string' ? t : t.name);
    if (existingNames.includes(clean)) {
      alert('Tag already exists.');
      return;
    }

    const updatedTags = [...existingNames, clean];
    await onSavePreferences({ tags: updatedTags });
    setIsTagModalOpen(false);
    setTagNameInput('');
  };

  const handleDeleteTag = async (tagName) => {
    if (!window.confirm(`Are you sure you want to delete tag "${tagName}"?`)) return;
    const existingNames = tags.map(t => typeof t === 'string' ? t : t.name);
    const updatedTags = existingNames.filter(t => t !== tagName);
    await onSavePreferences({ tags: updatedTags });
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>Rules & Tags</h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>Configure automated merchant categorization rules with AND/OR conditions</p>
        </div>
      </div>

      {statusMsg && (
        <div style={{ padding: '12px 16px', marginBottom: '20px', borderRadius: '10px', backgroundColor: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', fontSize: '14px', fontWeight: 600 }}>
          {statusMsg}
        </div>
      )}

      <div className="grid-2">
        {/* Categorization Rules */}
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <h3 className="card-title">
              <Sliders size={18} color="#6558D3" />
              Categorization Rules ({rules.length})
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {rules.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={applyingRules}
                  onClick={async () => {
                    setApplyingRules(true);
                    try {
                      const data = await onApplyRulesNow();
                      setStatusMsg(`Rules applied! Updated ${data.updatedCount || 0} matching transaction(s).`);
                      setTimeout(() => setStatusMsg(null), 4000);
                    } catch (err) {
                      alert('Failed to apply rules: ' + err.message);
                    } finally {
                      setApplyingRules(false);
                    }
                  }}
                >
                  <Sparkles size={14} color="#6558D3" />
                  <span>{applyingRules ? 'Applying...' : 'Apply Rules Now'}</span>
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={handleOpenAddRule}>
                <Plus size={14} /> Add Rule
              </button>
            </div>
          </div>

          {rules.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rules.map(r => {
                const op = (r.operator || 'OR').toUpperCase();
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: r.enabled ? '#FFFFFF' : '#F8FAFC' }}>
                    <div style={{ flex: 1, paddingRight: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: r.enabled ? '#0F172A' : '#94A3B8' }}>
                          When merchant contains
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, backgroundColor: op === 'AND' ? '#F5F3FF' : '#EFF6FF', color: op === 'AND' ? '#6558D3' : '#2563EB', border: '1px solid #DDD6FE' }}>
                          {op}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#6558D3' }}>
                          "{r.whenText}"
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                        → Set Category to <strong style={{ color: '#F8FAFC' }}>{r.thenText}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEditRule(r)} title="Edit rule">
                        <Edit3 size={16} color="#64748B" />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggleRule(r.id)} title={r.enabled ? 'Disable rule' : 'Enable rule'}>
                        {r.enabled ? <CheckSquare size={18} color="#6558D3" /> : <Square size={18} color="#94A3B8" />}
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#EF4444' }} onClick={() => handleDeleteRule(r.id)} title="Delete rule">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '28px 16px' }}>
              <p className="empty-state-text">No rules configured. Create a rule to auto-categorize future and existing transactions.</p>
            </div>
          )}
        </div>

        {/* Tag Management */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <TagIcon size={18} color="#6558D3" />
              Tag Management ({tags.length})
            </h3>
            <button className="btn btn-primary btn-sm" onClick={() => setIsTagModalOpen(true)}>
              <Plus size={14} /> Create Tag
            </button>
          </div>

          {tags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tags.map(tObj => {
                const tName = typeof tObj === 'string' ? tObj : tObj.name;
                const count = tagCounts[tName] || 0;
                return (
                  <div key={tName} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', backgroundColor: '#0F172A', border: '1px solid #DDD6FE', fontSize: '13px', fontWeight: 600, color: '#6558D3' }}>
                    <span>{tName}</span>
                    <span style={{ fontSize: '11px', backgroundColor: '#EDE9FE', padding: '1px 6px', borderRadius: '99px' }}>{count}</span>
                    <button style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', marginLeft: '4px' }} onClick={() => handleDeleteTag(tName)}>×</button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '28px 16px' }}>
              <p className="empty-state-text">No custom tags created.</p>
            </div>
          )}
        </div>
      </div>

      {/* Rule Add / Edit Modal */}
      {isRuleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRuleModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingRuleId ? 'Edit Categorization Rule' : 'Create Categorization Rule'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsRuleModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveRule}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Match Operator</label>
                  <select
                    className="form-select"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                  >
                    <option value="OR">OR (Matches ANY term - e.g. Kroger OR Grocers OR Aldi)</option>
                    <option value="AND">AND (Matches ALL terms - e.g. Chase AND Payroll)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Merchant Keywords / Terms</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder={operator === 'AND' ? 'e.g. Chase, Payroll' : 'e.g. Kroger, Grocers, Aldi'}
                    value={whenText}
                    onChange={(e) => setWhenText(e.target.value)}
                  />
                  <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                    {operator === 'AND'
                      ? 'Separate keywords with commas. Transaction merchant must contain ALL listed terms.'
                      : 'Separate multiple keywords with commas or "OR". Transaction merchant matching ANY term will trigger this rule.'}
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Then Set Category To</label>
                  <select
                    className="form-select"
                    value={thenText}
                    onChange={(e) => setThenText(e.target.value)}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRuleModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingRuleId ? 'Update & Apply Rule' : 'Save & Apply Rule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {isTagModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTagModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Tag</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsTagModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveTag}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tag Name Only</label>
                  <input type="text" className="form-input" required placeholder="e.g. Tax-Deductible, Vacation" value={tagNameInput} onChange={(e) => setTagNameInput(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsTagModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Tag</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
