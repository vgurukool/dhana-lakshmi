import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowRight,
  Sparkles,
  Calendar,
  CreditCard,
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from 'recharts';

export function Dashboard({
  transactions = [],
  settings = {},
  assetsList = [],
  accounts = [],
  selectedPeriod,
  onPeriodChange,
  onNavigate,
  onMarkAccountPaid
}) {
  const { assets = 0, liabilities = 0, accountBalances = {}, netWorthConfigured = false } = settings || {};
  const accountBalancesSum = Object.values(accountBalances || {}).reduce((sum, b) => sum + Number(b || 0), 0);

  const getExchangeRate = (code) => {
    if (!code || code === 'USD') return 1;
    const rates = { INR: 95, EUR: 0.92, GBP: 0.78, CAD: 1.38, AUD: 1.52, ...(settings?.exchangeRates || {}) };
    return rates[code] || 1;
  };

  const getUsdAssetValue = (a) => {
    if (!a) return 0;
    const val = Number(a.value || 0);
    const curr = a.currency || 'USD';
    const rate = getExchangeRate(curr);
    return rate > 0 ? val / rate : val;
  };

  const visibleAssetsFromTable = (assetsList || [])
    .filter(a => a && !a.hideFromDashboard)
    .reduce((sum, a) => sum + getUsdAssetValue(a), 0);

  const totalAssetsVal = assetsList.length > 0 ? visibleAssetsFromTable : Math.max(Number(assets || 0), accountBalancesSum);
  const isNetWorthSet = netWorthConfigured || accountBalancesSum > 0 || assetsList.length > 0;

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

  // Filter transactions by selected period
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

  const periodTransactions = filterByPeriod(transactions, selectedPeriod);

  const isTransferCategory = (cat) => {
    if (!cat) return false;
    const lower = String(cat).toLowerCase();
    return lower.includes('credit card payment') ||
           lower.includes('transfer') ||
           lower.includes('card payment') ||
           lower.includes('internal transfer');
  };

  // Totals calculations
  const totalIncome = periodTransactions
    .filter(t => t.type === 'income' && !isTransferCategory(t.category))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalSpending = periodTransactions
    .filter(t => t.type === 'expense' && !isTransferCategory(t.category))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const savingsRate = totalIncome > 0 ? (((totalIncome - totalSpending) / totalIncome) * 100) : 0;
  const netWorthValue = totalAssetsVal - Number(settings.liabilities || 0);

  // Category breakdown for Pie Chart
  const categoryTotals = {};
  periodTransactions
    .filter(t => t.type === 'expense' && !isTransferCategory(t.category))
    .forEach(t => {
      const cat = t.category || 'Needs review';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount || 0);
    });

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  })).sort((a, b) => b.value - a.value);

  const PIE_COLORS = ['#6558D3', '#10B981', '#F97316', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B', '#14B8A6'];

  // Cash flow chart data (up to 7 monthly points)
  const getMonthlyCashFlow = () => {
    if (periodTransactions.length === 0) return [];

    const monthlyMap = {};
    periodTransactions.forEach(t => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, Income: 0, Spending: 0 };
      if (t.type === 'income' && !isTransferCategory(t.category)) monthlyMap[key].Income += Number(t.amount || 0);
      if (t.type === 'expense' && !isTransferCategory(t.category)) monthlyMap[key].Spending += Number(t.amount || 0);
    });

    const sortedKeys = Object.keys(monthlyMap).sort();
    const last7Keys = sortedKeys.slice(-7);
    return last7Keys.map(k => ({
      month: k,
      Income: Number(monthlyMap[k].Income.toFixed(2)),
      Spending: Number(monthlyMap[k].Spending.toFixed(2))
    }));
  };

  const cashFlowData = getMonthlyCashFlow();

  // Account activity breakdown for Bar Chart
  const accountTotals = {};
  periodTransactions.forEach(t => {
    const acc = t.account || 'Other Account';
    if (!accountTotals[acc]) accountTotals[acc] = { rawName: acc, Spending: 0, Income: 0 };
    if (t.type === 'expense' && !isTransferCategory(t.category)) {
      accountTotals[acc].Spending += Number(t.amount || 0);
    } else if (t.type === 'income' && !isTransferCategory(t.category)) {
      accountTotals[acc].Income += Number(t.amount || 0);
    }
  });

  const accountChartData = Object.values(accountTotals)
    .map(a => ({
      account: a.rawName.replace(/\s*\(\.\.\.\d+\)/, ''),
      fullName: a.rawName,
      Spending: Number(a.Spending.toFixed(2)),
      Income: Number(a.Income.toFixed(2))
    }))
    .filter(a => a.Spending > 0 || a.Income > 0)
    .sort((a, b) => b.Spending - a.Spending)
    .slice(0, 6);

  // Top 5 Expense Categories with Progress Percentage
  const topCategories = pieData.slice(0, 5).map((c, idx) => ({
    ...c,
    color: PIE_COLORS[idx % PIE_COLORS.length],
    percentage: totalSpending > 0 ? ((c.value / totalSpending) * 100).toFixed(1) : '0'
  }));

  // Asset Allocation breakdown by Asset Type
  const assetTypeTotals = {};
  const visibleAssets = (assetsList || []).filter(a => a && !a.hideFromDashboard);

  visibleAssets.forEach(a => {
    const type = a.type || 'Other';
    const usdVal = getUsdAssetValue(a);
    assetTypeTotals[type] = (assetTypeTotals[type] || 0) + usdVal;
  });

  const totalAssetUsd = visibleAssets.reduce((sum, a) => sum + getUsdAssetValue(a), 0);

  const ASSET_TYPE_COLORS = {
    'Real Estate': '#2563EB',
    'Fixed Deposit (FD)': '#10B981',
    'Cash / Bank Account': '#059669',
    'Mutual Funds': '#6366F1',
    'Investments / Stocks': '#8B5CF6',
    'Workplace Solutions Shares': '#0D9488',
    '401(k)': '#9333EA',
    'Pension': '#0284C7',
    'Vehicles': '#F97316',
    'Crypto': '#F59E0B',
    'Precious Metals': '#EC4899',
    'Other': '#64748B'
  };

  const assetAllocationData = Object.entries(assetTypeTotals)
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
      percentage: totalAssetUsd > 0 ? ((value / totalAssetUsd) * 100).toFixed(1) : '0',
      color: ASSET_TYPE_COLORS[name] || '#6558D3'
    }))
    .sort((a, b) => b.value - a.value);

  const needsReviewCount = transactions.filter(t => t.category === 'Needs review').length;

  return (
    <div className="page-wrapper">
      {/* Date Period Selector Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC' }}>Dashboard</h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>Personal financial metrics and visual analytics overview</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1E293B', padding: '6px 12px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <Calendar size={16} color="#6558D3" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>Period:</span>
          <select
            className="form-select"
            style={{ minHeight: '36px', padding: '4px 10px', fontSize: '13px', border: 'none', backgroundColor: 'transparent', fontWeight: 700, color: '#F8FAFC', cursor: 'pointer' }}
            value={selectedPeriod || 'all-time'}
            onChange={(e) => onPeriodChange(e.target.value)}
          >
            <option value="all-time">All time</option>
            <option value="this-month">This month</option>
            <option value="last-month">Last month</option>
            <option value="last-3-months">Last 3 months</option>
            <option value="last-6-months">Last 6 months</option>
            <option value="this-year">Current Year ({new Date().getFullYear()})</option>

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

      
      {/* Upcoming Obligations & Due Date Alerts Banner */}
      {(() => {
        const dueList = (accounts || []).filter(a => a.dueStatus === 'overdue' || a.dueStatus === 'due_today' || a.dueStatus === 'due_soon' || a.dueStatus === 'upcoming_15');
        if (dueList.length === 0) return null;

        return (
          <div style={{
            backgroundColor: '#0F172A',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '28px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🔔</span>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                  Upcoming Bills, Mortgages & Loan Due Dates ({dueList.length} Items)
                </h3>
              </div>
              <button
                onClick={() => onNavigate('accounts')}
                style={{ background: 'none', border: 'none', color: '#FBBF24', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                View Accounts & Loans Hub →
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {dueList.slice(0, 4).map(item => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#1E293B',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: item.dueStatus === 'due_soon' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #334155'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.institution}</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#F8FAFC' }}>{item.name}</div>
                    <div style={{ fontSize: '11.5px', color: '#FBBF24', marginTop: '2px' }}>
                      ${Number(item.paymentAmount).toLocaleString()} • Due {item.nextDueDate}
                    </div>
                  </div>

                  <button
                    onClick={() => onMarkAccountPaid && onMarkAccountPaid(item.id)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#F59E0B',
                      color: '#F8FAFC',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Paid ✓
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 4 Summary Cards */}
      <div className="grid-4" style={{ marginBottom: '28px' }}>
        {/* Net Worth */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#1E293B', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '16px', padding: '20px' }}>
          <div>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase' }}>Net Worth</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={18} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: isNetWorthSet ? '#FFFFFF' : '#94A3B8', margin: '4px 0 8px 0' }}>
              {isNetWorthSet ? `$${netWorthValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not set'}
            </div>
          </div>
          <div style={{ paddingTop: '10px', borderTop: '1px solid #334155', fontSize: '12px', color: '#CBD5E1' }}>
            {isNetWorthSet ? (
              <span>Total Assets: <strong style={{ color: '#34D399' }}>${totalAssetsVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            ) : (
              <button
                style={{ background: 'none', border: 'none', color: '#FBBF24', fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => onNavigate('settings')}
              >
                Configure in Settings <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Income */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#1E293B', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '20px' }}>
          <div>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#34D399', textTransform: 'uppercase' }}>Income</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={18} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#10B981', margin: '4px 0 8px 0' }}>
              ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ paddingTop: '10px', borderTop: '1px solid #334155', fontSize: '12px', color: '#CBD5E1' }}>
            {periodTransactions.length > 0 ? `${periodTransactions.filter(t => t.type === 'income').length} income transaction(s)` : 'No trend yet'}
          </div>
        </div>

        {/* Spending */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#1E293B', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '16px', padding: '20px' }}>
          <div>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#F87171', textTransform: 'uppercase' }}>Spending</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(244, 63, 94, 0.2)', color: '#F43F5E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingDown size={18} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#F87171', margin: '4px 0 8px 0' }}>
              ${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ paddingTop: '10px', borderTop: '1px solid #334155', fontSize: '12px', color: '#CBD5E1' }}>
            {periodTransactions.length > 0 ? `${periodTransactions.filter(t => t.type === 'expense').length} expense transaction(s)` : 'No trend yet'}
          </div>
        </div>

        {/* Savings Rate */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#1E293B', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '16px', padding: '20px' }}>
          <div>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#818CF8', textTransform: 'uppercase' }}>Savings Rate</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818CF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PiggyBank size={18} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: savingsRate >= 0 ? '#34D399' : '#F87171', margin: '4px 0 8px 0' }}>
              {savingsRate.toFixed(1)}%
            </div>
          </div>
          <div style={{ paddingTop: '10px', borderTop: '1px solid #334155', fontSize: '12px', color: '#CBD5E1' }}>
            Formula: ((Income - Expense) / Income)
          </div>
        </div>
      </div>

      {/* Row 1: Cash Flow Area Chart (Full Width) */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Cash Flow Trend</h3>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>Multi-month income vs expenses</span>
          </div>
        </div>
        {cashFlowData.length > 0 ? (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip formatter={(val) => `$${val}`} />
                <Area type="monotone" dataKey="Income" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="Spending" stroke="#F97316" strokeWidth={2.5} fillOpacity={1} fill="url(#expenseGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state" style={{ minHeight: '230px' }}>
            <p className="empty-state-text">Import or add transactions to see cash flow trends.</p>
          </div>
        )}
      </div>

      {/* Row 2: Dedicated Full-Width Spending by Category Chart */}
      <div className="card" style={{ marginBottom: '28px', padding: '24px' }}>
        <div className="card-header" style={{ marginBottom: '20px' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Spending by Category</h3>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>Categorized expense distribution and proportional share</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, backgroundColor: 'rgba(244, 63, 94, 0.2)', color: '#F87171', padding: '6px 14px', borderRadius: '20px' }}>
            Total: ${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {pieData.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
            {/* Donut Chart */}
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `$${val.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {topCategories.map(cat => (
                <div key={cat.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cat.color, display: 'inline-block' }} />
                      <span style={{ fontWeight: 700, color: '#F8FAFC' }}>{cat.name}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#CBD5E1' }}>
                      ${cat.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>({cat.percentage}%)</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ minHeight: '230px' }}>
            <p className="empty-state-text">No category spending data available for this period.</p>
          </div>
        )}
      </div>

      {/* Row 3: Asset Allocation by Portfolio Type */}
      <div className="card" style={{ marginBottom: '28px', padding: '24px' }}>
        <div className="card-header" style={{ marginBottom: '20px' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Asset Allocation by Portfolio Type</h3>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>Net worth distribution across asset holdings in Equivalent USD ($)</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34D399', padding: '6px 14px', borderRadius: '20px' }}>
            Total Assets: ${totalAssetUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
        </div>

        {assetAllocationData.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
            {/* Donut Chart */}
            <div style={{ width: '100%', height: 290 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetAllocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {assetAllocationData.map((entry, index) => (
                      <Cell key={`cell-asset-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `$${val.toLocaleString()} USD`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Asset Type Breakdown Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {assetAllocationData.map(asset => (
                <div key={asset.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: asset.color, display: 'inline-block' }} />
                      <span style={{ fontWeight: 700, color: '#F8FAFC' }}>{asset.name}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#CBD5E1' }}>
                      ${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>({asset.percentage}%)</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${asset.percentage}%`,
                        backgroundColor: asset.color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ minHeight: '200px' }}>
            <p className="empty-state-text">No asset holdings recorded yet. Add assets in Assets Portfolio tab to view allocation breakdown.</p>
          </div>
        )}
      </div>

      {/* Row 3: Account Volume Bar Chart & AI Insight */}
      <div className="grid-3">
        {/* Account Activity Bar Chart */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Spending Volume by Account</h3>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Total expenses per linked bank / credit account</span>
            </div>
          </div>

          {accountChartData.length > 0 ? (
            <div style={{ width: '100%', height: 270 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accountChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="account" stroke="#64748B" fontSize={11} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                  <Tooltip formatter={(val) => `$${val.toLocaleString()}`} />
                  <Bar dataKey="Spending" fill="#6558D3" radius={[6, 6, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ minHeight: '230px' }}>
              <p className="empty-state-text">No account activity recorded for this period.</p>
            </div>
          )}
        </div>

        {/* Ledgerly AI Insight Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ backgroundColor: '#0F172A', color: 'white', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#A78BFA' }}>
              <Sparkles size={22} />
              <span style={{ fontWeight: 800, fontSize: '16px' }}>Ledgerly AI Insight</span>
            </div>
            <p style={{ fontSize: '14px', color: '#E2E8F0', lineHeight: '1.6', margin: 0 }}>
              {needsReviewCount > 0
                ? `You have ${needsReviewCount} transaction(s) categorized as "Needs review". Categorize them in Transactions to keep budget analytics accurate.`
                : 'All current transactions are categorized. Your financial ledger is healthy and up to date!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
