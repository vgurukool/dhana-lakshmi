import React, { useState, useMemo } from 'react';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  BarChart3,
  Calendar,
  Search,
  ArrowUpRight,
  Layers,
  Sparkles,
  ShoppingBag,
  Home,
  Car,
  Utensils,
  Shield,
  HeartPulse,
  Tv,
  HelpCircle,
  Zap,
  BookOpen,
  Briefcase,
  HeartHandshake,
  CreditCard,
  Building2,
  Smile
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

export const PRIMARY_DHANA_CATEGORIES = [
  { id: 'Groceries & Organic Pantry', name: 'Groceries & Organic Pantry', icon: '🌾', color: '#10B981', group: 'Vitality' },
  { id: 'Dining & Social Outings', name: 'Dining & Social Outings', icon: '🍽️', color: '#F59E0B', group: 'Vitality' },
  { id: 'Health & Preventative Wellness', name: 'Health & Preventative Wellness', icon: '🧘', color: '#14B8A6', group: 'Vitality' },
  { id: 'Housing & Living Space', name: 'Housing & Living Space', icon: '🏠', color: '#6366F1', group: 'Shelter' },
  { id: 'Transportation & Mobility', name: 'Transportation & Mobility', icon: '🚗', color: '#3B82F6', group: 'Mobility' },
  { id: 'Utilities & Connectivity', name: 'Utilities & Connectivity', icon: '⚡', color: '#8B5CF6', group: 'Shelter' },
  { id: 'Insurance & Risk Armor', name: 'Insurance & Risk Armor', icon: '🛡️', color: '#06B6D4', group: 'Protection' },
  { id: 'Investments & Capital Growth', name: 'Investments & Capital Growth', icon: '📈', color: '#EAB308', group: 'Wealth' },
  { id: 'Debt Servicing & Payoff', name: 'Debt Servicing & Payoff', icon: '💳', color: '#F43F5E', group: 'Protection' },
  { id: 'Family & Childcare', name: 'Family & Childcare', icon: '👶', color: '#EC4899', group: 'Family' },
  { id: 'Education & Skill Mastery', name: 'Education & Skill Mastery', icon: '📚', color: '#A855F7', group: 'Mastery' },
  { id: 'Professional Tools & Enterprise', name: 'Professional Tools & Enterprise', icon: '💻', color: '#F97316', group: 'Mastery' },
  { id: 'Charity & Philanthropy (Dāna)', name: 'Charity & Philanthropy (Dāna)', icon: '🪷', color: '#0D9488', group: 'Dharma' },
  { id: 'Leisure, Travel & Personal Care', name: 'Leisure, Travel & Personal Care', icon: '✈️', color: '#38BDF8', group: 'Lifestyle' },
  { id: 'Living & General Expenses', name: 'Living & General Expenses', icon: '📦', color: '#94A3B8', group: 'General' }
];

const CATEGORY_LOOKUP = {};
PRIMARY_DHANA_CATEGORIES.forEach(c => {
  CATEGORY_LOOKUP[c.name] = c;
});

export function Spending({
  transactions = [],
  categories = [],
  onPatchTransaction
}) {
  const [selectedPeriod, setSelectedPeriod] = useState('all-time');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartView, setChartView] = useState('donut'); // 'donut' | 'bar'

  // Filter transactions by period and genuine expenses
  const periodExpenses = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter(t => {
      if (t.type !== 'expense') return false;

      const lowerCat = String(t.category || '').toLowerCase();
      // Exclude transfers and credit card payments from expense analytics
      if (lowerCat.includes('credit card payment') || lowerCat.includes('transfer') || lowerCat.includes('cash withdrawal')) {
        return false;
      }

      const d = new Date(t.date);
      if (isNaN(d.getTime())) return true;

      const y = d.getFullYear();
      const m = d.getMonth();

      if (selectedPeriod === 'this-month') return y === currentYear && m === currentMonth;
      if (selectedPeriod === 'last-month') {
        const lastM = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastY = currentMonth === 0 ? currentYear - 1 : currentYear;
        return y === lastY && m === lastM;
      }
      if (selectedPeriod === 'last-3-months') {
        const cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() - 3);
        return d >= cutoff;
      }
      if (selectedPeriod === 'this-year') return y === currentYear;

      return true;
    });
  }, [transactions, selectedPeriod]);

  // Aggregate spending by Primary Dhana Expense Category
  const categoryBreakdown = useMemo(() => {
    const map = {};
    PRIMARY_DHANA_CATEGORIES.forEach(c => {
      map[c.name] = { ...c, amount: 0, count: 0 };
    });

    periodExpenses.forEach(t => {
      const cat = t.primaryExpenseCategory || 'Living & General Expenses';
      if (!map[cat]) {
        map[cat] = {
          id: cat,
          name: cat,
          icon: '📦',
          color: '#94A3B8',
          group: 'General',
          amount: 0,
          count: 0
        };
      }
      map[cat].amount += Number(t.amount || 0);
      map[cat].count += 1;
    });

    const total = Object.values(map).reduce((sum, c) => sum + c.amount, 0);

    return Object.values(map)
      .map(c => ({
        ...c,
        percentage: total > 0 ? (c.amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodExpenses]);

  const activeCategoriesWithSpend = useMemo(() => {
    return categoryBreakdown.filter(c => c.amount > 0);
  }, [categoryBreakdown]);

  const totalExpenseAmount = useMemo(() => {
    return categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);
  }, [categoryBreakdown]);

  const topCategory = categoryBreakdown[0] || PRIMARY_DHANA_CATEGORIES[0];

  // Essential Living vs Discretionary & Lifestyle breakdown
  const essentialGroupNames = ['Housing & Living Space', 'Groceries & Organic Pantry', 'Utilities & Connectivity', 'Transportation & Mobility', 'Health & Preventative Wellness', 'Insurance & Risk Armor'];
  const essentialSpend = categoryBreakdown
    .filter(c => essentialGroupNames.includes(c.name))
    .reduce((sum, c) => sum + c.amount, 0);
  const essentialPct = totalExpenseAmount > 0 ? ((essentialSpend / totalExpenseAmount) * 100).toFixed(1) : '0';

  // Capital & Knowledge Investment (Investments + Education + Tools)
  const growthSpend = categoryBreakdown
    .filter(c => ['Investments & Capital Growth', 'Education & Skill Mastery', 'Professional Tools & Enterprise'].includes(c.name))
    .reduce((sum, c) => sum + c.amount, 0);
  const growthPct = totalExpenseAmount > 0 ? ((growthSpend / totalExpenseAmount) * 100).toFixed(1) : '0';

  // Table transactions filtered by category & search
  const filteredTableTxs = useMemo(() => {
    return periodExpenses.filter(t => {
      const cat = t.primaryExpenseCategory || 'Living & General Expenses';
      if (selectedCategoryFilter !== 'all' && cat !== selectedCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const m = (t.merchant || '').toLowerCase();
        const c = (t.category || '').toLowerCase();
        const p = cat.toLowerCase();
        if (!m.includes(q) && !c.includes(q) && !p.includes(q)) return false;
      }
      return true;
    });
  }, [periodExpenses, selectedCategoryFilter, searchQuery]);

  const handlePrimaryCategoryChange = async (txId, newCategory) => {
    if (!onPatchTransaction) return;
    await onPatchTransaction(txId, { primaryExpenseCategory: newCategory });
  };

  return (
    <div className="page-wrapper">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#FBBF24',
            marginBottom: '8px'
          }}>
            <PieChartIcon size={13} />
            PRIMARY DHANA EXPENSE CATEGORIES DEEP MAPPING
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#F8FAFC', margin: 0, fontFamily: "'Cinzel', serif" }}>
            Primary Expense Categories & Outflow Patterns
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
            Transactions are deeply classified across the 14 core financial pillars (Groceries, Housing, Mobility, Insurance, Education, Tools & Dāna).
          </p>
        </div>

        {/* Period Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1E293B', padding: '6px 12px', borderRadius: '12px', border: '1px solid #334155' }}>
          <Calendar size={16} color="#FBBF24" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{ backgroundColor: 'transparent', border: 'none', color: '#F8FAFC', fontWeight: 700, fontSize: '13px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="this-month" style={{ background: '#1E293B', color: '#F8FAFC' }}>This Month</option>
            <option value="last-month" style={{ background: '#1E293B', color: '#F8FAFC' }}>Last Month</option>
            <option value="last-3-months" style={{ background: '#1E293B', color: '#F8FAFC' }}>Last 3 Months</option>
            <option value="this-year" style={{ background: '#1E293B', color: '#F8FAFC' }}>This Year</option>
            <option value="all-time" style={{ background: '#1E293B', color: '#F8FAFC' }}>All Time ({transactions.length} txs)</option>
          </select>
        </div>
      </div>

      {/* 4 Summary Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Total Expenses Audited</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#F8FAFC', margin: '4px 0' }}>
            ${Math.round(totalExpenseAmount).toLocaleString()}
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Across {periodExpenses.length} genuine expense transactions</span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Top Primary Category</span>
          <div style={{ fontSize: '17px', fontWeight: 900, color: topCategory.color, margin: '6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{topCategory.icon}</span>
            <span>{topCategory.name}</span>
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>
            ${Math.round(topCategory.amount).toLocaleString()} ({topCategory.percentage.toFixed(1)}% of total)
          </span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Essential Living Outflow</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#10B981', margin: '4px 0' }}>
            {essentialPct}%
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>
            ${Math.round(essentialSpend).toLocaleString()} (Shelter, Groceries, Utilities & Health)
          </span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Growth & Mastery Outflow</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#A855F7', margin: '4px 0' }}>
            {growthPct}%
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>
            ${Math.round(growthSpend).toLocaleString()} (Investments, Education & Tools)
          </span>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div style={{
        backgroundColor: '#0F172A',
        border: '1px solid #1E293B',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChartIcon size={20} color="#FBBF24" />
              Primary Dhana Expense Distribution
            </h3>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>Deeper multi-category breakdown of your real cash outflows</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setChartView('donut')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: chartView === 'donut' ? '1px solid #F59E0B' : '1px solid #334155',
                backgroundColor: chartView === 'donut' ? 'rgba(245, 158, 11, 0.2)' : '#1E293B',
                color: chartView === 'donut' ? '#FBBF24' : '#94A3B8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Donut View
            </button>
            <button
              onClick={() => setChartView('bar')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: chartView === 'bar' ? '1px solid #F59E0B' : '1px solid #334155',
                backgroundColor: chartView === 'bar' ? 'rgba(245, 158, 11, 0.2)' : '#1E293B',
                color: chartView === 'bar' ? '#FBBF24' : '#94A3B8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Ranked Categories
            </button>
          </div>
        </div>

        {/* Chart Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '28px', alignItems: 'center' }}>
          <div style={{ height: '340px', width: '100%' }}>
            {chartView === 'donut' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeCategoriesWithSpend}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={120}
                    paddingAngle={2}
                  >
                    {activeCategoriesWithSpend.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} stroke="#0F172A" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`$${Number(val).toLocaleString()} (${((Number(val)/totalExpenseAmount)*100).toFixed(1)}%)`, 'Outflow']}
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#F8FAFC' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeCategoriesWithSpend.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 60, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis type="number" stroke="#94A3B8" tickFormatter={v => `$${v.toLocaleString()}`} />
                  <YAxis type="category" dataKey="name" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#F8FAFC' }}
                  />
                  <Bar dataKey="amount" fill="#F59E0B" radius={[0, 4, 4, 0]}>
                    {activeCategoriesWithSpend.slice(0, 8).map((entry) => (
                      <Cell key={`bar-${entry.name}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category Breakdown Side Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto', paddingRight: '6px' }}>
            {activeCategoriesWithSpend.map(cat => (
              <div
                key={cat.name}
                onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === cat.name ? 'all' : cat.name)}
                style={{
                  backgroundColor: selectedCategoryFilter === cat.name ? `${cat.color}25` : '#1E293B',
                  border: selectedCategoryFilter === cat.name ? `1px solid ${cat.color}` : '1px solid #334155',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{cat.icon}</span>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#F8FAFC' }}>{cat.name}</span>
                    <span style={{ fontSize: '10.5px', color: '#94A3B8', display: 'block' }}>Group: {cat.group}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 900, color: cat.color }}>
                    ${Math.round(cat.amount).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#CBD5E1' }}>
                    {cat.percentage.toFixed(1)}% ({cat.count} txs)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Category Filter Chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: selectedCategoryFilter === 'all' ? '1px solid #F59E0B' : '1px solid #334155',
              backgroundColor: selectedCategoryFilter === 'all' ? 'rgba(245, 158, 11, 0.2)' : '#1E293B',
              color: selectedCategoryFilter === 'all' ? '#FBBF24' : '#94A3B8',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            All Categories ({periodExpenses.length})
          </button>
          {activeCategoriesWithSpend.slice(0, 8).map(cat => {
            const isSel = selectedCategoryFilter === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategoryFilter(isSel ? 'all' : cat.name)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: isSel ? `1px solid ${cat.color}` : '1px solid #334155',
                  backgroundColor: isSel ? `${cat.color}25` : '#1E293B',
                  color: isSel ? cat.color : '#CBD5E1',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>({cat.count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
          <input
            type="text"
            placeholder="Search merchant or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 32px',
              borderRadius: '8px',
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              color: '#F8FAFC',
              fontSize: '12.5px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Categorized Expenses Table */}
      <div style={{
        backgroundColor: '#0F172A',
        border: '1px solid #1E293B',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
            Categorized Expenses ({filteredTableTxs.length} Transactions)
          </h3>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>
            Tip: You can re-map any transaction's Primary Dhana Category directly using the dropdown
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E293B', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 18px' }}>Date</th>
                <th style={{ padding: '12px 18px' }}>Merchant / Description</th>
                <th style={{ padding: '12px 18px' }}>Raw Ledger Category</th>
                <th style={{ padding: '12px 18px' }}>Primary Dhana Expense Mapping</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTableTxs.slice(0, 100).map((t) => {
                const currentPrimary = t.primaryExpenseCategory || 'Living & General Expenses';
                const catMeta = CATEGORY_LOOKUP[currentPrimary] || { icon: '📦', color: '#94A3B8' };

                return (
                  <tr
                    key={t.id}
                    style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.7)' }}
                  >
                    <td style={{ padding: '12px 18px', color: '#94A3B8', whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {t.date}
                    </td>

                    <td style={{ padding: '12px 18px', fontWeight: 700, color: '#F8FAFC', maxWidth: '320px' }}>
                      {t.merchant}
                    </td>

                    <td style={{ padding: '12px 18px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#1E293B',
                        color: '#94A3B8',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid #334155'
                      }}>
                        {t.category || 'Expense'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 18px' }}>
                      <select
                        value={currentPrimary}
                        onChange={(e) => handlePrimaryCategoryChange(t.id, e.target.value)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: `1px solid ${catMeta.color}60`,
                          backgroundColor: `${catMeta.color}15`,
                          color: catMeta.color,
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        {PRIMARY_DHANA_CATEGORIES.map(c => (
                          <option key={c.name} value={c.name} style={{ background: '#0F172A', color: '#F8FAFC' }}>
                            {c.icon} {c.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 900, color: '#F8FAFC', whiteSpace: 'nowrap' }}>
                      ${Number(t.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredTableTxs.length > 100 && (
            <div style={{ padding: '14px', textAlign: 'center', color: '#94A3B8', fontSize: '12px', borderTop: '1px solid #1E293B' }}>
              Showing first 100 of {filteredTableTxs.length} transactions. Refine search query or category filter to view more.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
