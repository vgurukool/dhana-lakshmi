import React, { useState } from 'react';
import { Target, Plus, Edit3, Trash2, Calendar } from 'lucide-react';

export function Goals({
  settings = {},
  onSavePreferences
}) {
  const { goals = [] } = settings;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  const handleOpenAdd = () => {
    setEditingGoalId(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setDueDate('');
    setNote('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g) => {
    setEditingGoalId(g.id);
    setName(g.name);
    setTargetAmount(String(g.targetAmount));
    setCurrentAmount(String(g.currentAmount || 0));
    setDueDate(g.dueDate || '');
    setNote(g.note || '');
    setIsModalOpen(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount) || 0;
    if (!name || isNaN(target) || target <= 0) return;

    let updated = [];
    if (editingGoalId) {
      updated = goals.map(g => g.id === editingGoalId ? {
        ...g,
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        dueDate,
        note: note.trim()
      } : g);
    } else {
      const newGoal = {
        id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        dueDate,
        note: note.trim()
      };
      updated = [...goals, newGoal];
    }

    await onSavePreferences({ goals: updated });
    setIsModalOpen(false);
  };

  const handleDeleteGoal = async (id) => {
    const updated = goals.filter(g => g.id !== id);
    await onSavePreferences({ goals: updated });
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>Financial Goals</h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>Track savings targets for emergency funds, vacations, or major purchases</p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>Create Goal</span>
        </button>
      </div>

      {/* Goal Cards Grid */}
      {goals.length > 0 ? (
        <div className="grid-2">
          {goals.map(g => {
            const target = Number(g.targetAmount || 0);
            const current = Number(g.currentAmount || 0);
            const remaining = Math.max(0, target - current);
            const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

            return (
              <div key={g.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '18px', color: '#F8FAFC' }}>{g.name}</h4>
                    {g.dueDate && (
                      <span style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Calendar size={13} /> Target Date: {g.dueDate}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEdit(g)}><Edit3 size={14} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#EF4444' }} onClick={() => handleDeleteGoal(g.id)}><Trash2 size={14} /></button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: '#6558D3' }}>
                    ${current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>
                    Target: ${target.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ height: '10px', backgroundColor: '#F1F5F9', borderRadius: '5px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${percent}%`,
                      backgroundColor: percent >= 100 ? '#10B981' : '#6558D3',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
                  <span>{percent}% Saved</span>
                  <span>${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon"><Target size={28} /></div>
          <h3 className="empty-state-title">No financial goals set</h3>
          <p className="empty-state-text">Create your first goal to track savings milestones for house downpayments, travel, or retirement.</p>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Create Goal
          </button>
        </div>
      )}

      {/* Goal Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingGoalId ? 'Edit Goal' : 'Create Goal'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveGoal}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Goal Name</label>
                  <input type="text" className="form-input" required placeholder="e.g. Emergency Fund, New Car" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Target Amount ($)</label>
                    <input type="number" step="0.01" className="form-input" required placeholder="5000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current Saved ($)</label>
                    <input type="number" step="0.01" className="form-input" placeholder="0.00" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Target Due Date (Optional)</label>
                  <input type="date" className="form-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
