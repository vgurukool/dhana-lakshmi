import React, { useState } from 'react';
import {
  Building2,
  Landmark,
  Car,
  Home,
  Shield,
  CreditCard,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  DollarSign,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';

export function AccountsAndLoans({
  accounts = [],
  onOpenAddAccount,
  onEditAccount,
  onDeleteAccount,
  onMarkAccountPaid
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filter accounts
  const filtered = accounts.filter(a => {
    if (selectedCategory === 'all') return true;
    return a.category === selectedCategory;
  });

  // Financial calculations
  const totalDebt = accounts
    .filter(a => ['mortgage', 'auto_loan', 'credit_card', 'personal_loan', 'other_loan'].includes(a.category))
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const totalCreditCardDebt = accounts
    .filter(a => a.category === 'credit_card')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  // Monthly equivalent outflow commitment
  const monthlyCommitment = accounts.reduce((sum, a) => {
    const pmt = Number(a.paymentAmount) || 0;
    const freq = a.paymentFrequency || 'monthly';
    if (freq === 'weekly') return sum + (pmt * 52) / 12;
    if (freq === 'biweekly') return sum + (pmt * 26) / 12;
    if (freq === 'monthly') return sum + pmt;
    if (freq === 'quarterly') return sum + pmt / 3;
    if (freq === 'semiannual') return sum + pmt / 6;
    if (freq === 'annual') return sum + pmt / 12;
    return sum + pmt;
  }, 0);

  // Due alerts: overdue, due today, or due in next 7 days
  const dueSoonList = accounts.filter(a => a.dueStatus === 'overdue' || a.dueStatus === 'due_today' || a.dueStatus === 'due_soon');

  const getCategoryMeta = (cat) => {
    switch (cat) {
      case 'mortgage':
        return { label: 'Mortgage', icon: Home, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'auto_loan':
        return { label: 'Auto Loan', icon: Car, color: '#60A5FA', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'credit_card':
        return { label: 'Credit Card', icon: CreditCard, color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' };
      case 'personal_loan':
        return { label: 'Personal / Student Loan', icon: CreditCard, color: '#A78BFA', bg: 'rgba(139, 92, 246, 0.15)' };
      case 'insurance':
        return { label: 'Insurance Policy', icon: Shield, color: '#22D3EE', bg: 'rgba(6, 182, 212, 0.15)' };
      default:
        return { label: 'Other Obligation', icon: Building2, color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  const getDueBadge = (acc) => {
    const days = acc.daysUntilDue;
    if (acc.dueStatus === 'overdue') {
      return { label: `Overdue by ${Math.abs(days)}d`, bg: 'rgba(239, 68, 68, 0.2)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.4)' };
    }
    if (acc.dueStatus === 'due_today') {
      return { label: 'Due Today!', bg: 'rgba(245, 158, 11, 0.25)', color: '#FBBF24', border: '1px solid #F59E0B' };
    }
    if (acc.dueStatus === 'due_soon') {
      return { label: `Due in ${days} days`, bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.3)' };
    }
    if (acc.dueStatus === 'upcoming_15') {
      return { label: `Due in ${days}d`, bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.3)' };
    }
    return { label: `Due ${acc.nextDueDate.slice(5)}`, bg: 'rgba(16, 185, 129, 0.12)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.25)' };
  };

  return (
    <div className="page-wrapper">
      {/* Top Header & Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#FBBF24',
            marginBottom: '8px'
          }}>
            <Building2 size={13} />
            ACCOUNTS, LOANS & RECURRING PAYMENT OBLIGATIONS
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#F8FAFC', margin: 0, fontFamily: "'Cinzel', serif" }}>
            Accounts, Loans & Recurring Bill Notifications
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
            Collect credit cards, mortgages, auto loans, and insurance policies with automated payment frequency tracking and due alerts.
          </p>
        </div>

        <button
          onClick={onOpenAddAccount}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Add Account / Loan / Policy
        </button>
      </div>

      {/* 4 Summary Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Monthly Commitment</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#FBBF24', margin: '4px 0' }}>
            ${Math.round(monthlyCommitment).toLocaleString()} <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>/mo</span>
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Total recurring outflow across all obligations</span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Total Debt & Loans</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#F87171', margin: '4px 0' }}>
            ${Math.round(totalDebt).toLocaleString()}
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Mortgages, auto loans & personal credit</span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Credit Card Balances</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#F59E0B', margin: '4px 0' }}>
            ${Math.round(totalCreditCardDebt).toLocaleString()}
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Current revolving credit balances</span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Payment Due Alerts</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: dueSoonList.length > 0 ? '#FBBF24' : '#34D399', margin: '4px 0' }}>
            {dueSoonList.length} Due Soon
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Payments due within next 7 days</span>
        </div>
      </div>

      {/* Due Date Alert Notification Banner */}
      {dueSoonList.length > 0 && (
        <div style={{
          backgroundColor: '#0F172A',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '28px',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <AlertCircle size={20} color="#FBBF24" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
              Payment Due Date Notifications ({dueSoonList.length} Actions Required)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {dueSoonList.map(acc => {
              const badge = getDueBadge(acc);
              const meta = getCategoryMeta(acc.category);

              return (
                <div
                  key={acc.id}
                  style={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', backgroundColor: badge.bg, color: badge.color, border: badge.border }}>
                        {badge.label}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>{acc.institution}</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#F8FAFC' }}>
                      {acc.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>
                      Amount Due: <strong style={{ color: '#FBBF24' }}>${Number(acc.paymentAmount).toLocaleString()}</strong> ({acc.paymentFrequency})
                    </div>
                  </div>

                  <button
                    onClick={() => onMarkAccountPaid(acc.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#F59E0B',
                      color: '#F8FAFC',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                    title="Advance to next cycle"
                  >
                    <CheckCircle2 size={14} /> Mark Paid
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All Obligations', count: accounts.length },
          { id: 'credit_card', label: 'Credit Cards', count: accounts.filter(a => a.category === 'credit_card').length },
          { id: 'mortgage', label: 'Mortgages', count: accounts.filter(a => a.category === 'mortgage').length },
          { id: 'auto_loan', label: 'Auto Loans', count: accounts.filter(a => a.category === 'auto_loan').length },
          { id: 'personal_loan', label: 'Personal & Student Loans', count: accounts.filter(a => a.category === 'personal_loan').length },
          { id: 'insurance', label: 'Insurance Policies', count: accounts.filter(a => a.category === 'insurance').length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: selectedCategory === tab.id ? '1px solid #F59E0B' : '1px solid #334155',
              backgroundColor: selectedCategory === tab.id ? 'rgba(245, 158, 11, 0.15)' : '#0F172A',
              color: selectedCategory === tab.id ? '#FBBF24' : '#94A3B8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{tab.label}</span>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '6px',
              backgroundColor: '#1E293B',
              color: selectedCategory === tab.id ? '#FBBF24' : '#64748B'
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Account Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '18px' }}>
        {filtered.map(acc => {
          const meta = getCategoryMeta(acc.category);
          const badge = getDueBadge(acc);
          const Icon = meta.icon;

          return (
            <div
              key={acc.id}
              className="card"
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid #1E293B',
                borderRadius: '16px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      backgroundColor: meta.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: meta.color
                    }}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 700 }}>
                        {acc.institution} {acc.accountNumberLast4 ? `(…${acc.accountNumberLast4})` : ''}
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: '2px 0 0 0' }}>
                        {acc.name}
                      </h3>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    backgroundColor: badge.bg,
                    color: badge.color,
                    border: badge.border
                  }}>
                    {badge.label}
                  </span>
                </div>

                {/* Core Balances & Payments Table */}
                <div style={{
                  backgroundColor: '#1E293B',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '14px'
                }}>
                  {acc.category === 'credit_card' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>Current / Statement Balance:</span>
                      <strong style={{ fontSize: '16px', color: '#F87171' }}>${Number(acc.balance).toLocaleString()}</strong>
                    </div>
                  ) : acc.category === 'insurance' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>Coverage Limit:</span>
                      <strong style={{ fontSize: '15px', color: '#22D3EE' }}>${Number(acc.coverageAmount).toLocaleString()}</strong>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>Remaining Principal:</span>
                      <strong style={{ fontSize: '16px', color: '#F87171' }}>${Number(acc.balance).toLocaleString()}</strong>
                    </div>
                  )}

                  {Number(acc.paymentAmount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>Recurring Payment:</span>
                      <strong style={{ fontSize: '15px', color: '#FBBF24' }}>
                        ${Number(acc.paymentAmount).toLocaleString()} <span style={{ fontSize: '11px', color: '#94A3B8' }}>/ {acc.paymentFrequency}</span>
                      </strong>
                    </div>
                  )}

                  {Number(acc.interestRate) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: '#94A3B8' }}>Interest Rate:</span>
                      <strong style={{ color: '#CBD5E1' }}>{acc.interestRate}% APR</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ color: '#94A3B8' }}>Payment Due Date:</span>
                    <strong style={{ color: '#F8FAFC' }}>
                      {acc.nextDueDate} (Day {acc.dueDay || '1'})
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ color: '#94A3B8' }}>Payment Autopay:</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: acc.autoPay ? '#34D399' : '#94A3B8' }}>
                      {acc.autoPay ? '✓ Enabled' : 'Manual Transfer'}
                    </span>
                  </div>
                </div>

                {acc.notes && (
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                    "{acc.notes}"
                  </p>
                )}
              </div>

              {/* Card Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1E293B', paddingTop: '14px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => onEditAccount(acc)}
                    style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700 }}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => onDeleteAccount(acc.id)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>

                {Number(acc.paymentAmount) > 0 && (
                  <button
                    onClick={() => onMarkAccountPaid(acc.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      color: '#FBBF24',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Advance to next payment cycle"
                  >
                    <CheckCircle2 size={14} /> Mark Paid
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
