import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Zap,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Briefcase,
  Building2,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Percent,
  Sliders,
  DollarSign,
  Layers,
  Filter,
  RefreshCw,
  Info
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

export const INCOME_SOURCES = [
  { id: 'Salary & Wages', name: 'Salary & Wages', icon: '💼', defaultType: 'active', color: '#10B981', desc: 'Primary employment, base paycheck, W-2 direct deposit' },
  { id: 'Consulting & Freelance', name: 'Consulting & Freelance', icon: '🚀', defaultType: 'active', color: '#06B6D4', desc: '1099 contracts, client retainers, advisory services' },
  { id: 'Business & Venture Profits', name: 'Business & Venture Profits', icon: '🏢', defaultType: 'active', color: '#3B82F6', desc: 'Enterprise distributions, SaaS revenues, client billing' },
  { id: 'Bonus & Commissions', name: 'Bonus & Commissions', icon: '🎯', defaultType: 'active', color: '#6366F1', desc: 'Quarterly performance bonuses, sales commissions' },
  { id: 'Interest & HYSA', name: 'Interest & HYSA', icon: '🏦', defaultType: 'passive', color: '#F59E0B', desc: 'High-yield savings APY, CDs, treasury yield' },
  { id: 'Dividends & Capital Gains', name: 'Dividends & Capital Gains', icon: '📈', defaultType: 'passive', color: '#8B5CF6', desc: 'Stock dividends, ETF distributions, capital appreciation' },
  { id: 'Real Estate & Rental', name: 'Real Estate & Rental', icon: '🏠', defaultType: 'passive', color: '#EC4899', desc: 'Rental income, Airbnb bookings, REIT dividends' },
  { id: 'Royalties & Digital Assets', name: 'Royalties & Digital Assets', icon: '👑', defaultType: 'passive', color: '#A855F7', desc: 'Book royalties, courses, digital templates, software IP' },
  { id: 'Cashback, Points & Rewards', name: 'Cashback, Points & Rewards', icon: '🎁', defaultType: 'passive', color: '#14B8A6', desc: 'Credit card cash back, statement rebates' },
  { id: 'Tax Refunds & Govt Credits', name: 'Tax Refunds & Govt Credits', icon: '🏛️', defaultType: 'passive', color: '#EAB308', desc: 'IRS tax return refunds, state rebates' },
  { id: 'Gifts, Transfers & Other', name: 'Gifts, Transfers & Other', icon: '🔄', defaultType: 'active', color: '#94A3B8', desc: 'Personal gifts, reimbursements, miscellaneous inflows' }
];

const SOURCE_LOOKUP = {};
INCOME_SOURCES.forEach(s => { SOURCE_LOOKUP[s.name] = s; });

export function Income({
  transactions = [],
  accounts = [],
  onPatchTransaction,
  onSaveTransaction
}) {
  const [selectedPeriod, setSelectedPeriod] = useState('2026'); // 'all', '2026', '2025', 'last-90', 'last-30', or 'YYYY-MM'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'active', 'passive'
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [excludeTransfers, setExcludeTransfers] = useState(true);
  const [chartView, setChartView] = useState('split'); // 'split' (Donut) | 'sources' (Bar) | 'trend' (Stacked)

  // Add Income Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newInflowDate, setNewInflowDate] = useState(new Date().toISOString().split('T')[0]);
  const [newInflowMerchant, setNewInflowMerchant] = useState('');
  const [newInflowAmount, setNewInflowAmount] = useState('');
  const [newInflowSource, setNewInflowSource] = useState('Salary & Wages');
  const [newInflowType, setNewInflowType] = useState('active');
  const [newInflowAccount, setNewInflowAccount] = useState(accounts[0]?.name || 'Main Checking');

  // Available unique months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set();
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        const ym = t.date.substring(0, 7);
        if (/^\d{4}-\d{2}$/.test(ym)) {
          months.add(ym);
        }
      }
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Helper to check if an account is a Credit Card
  const isCreditCardAccount = (accountName) => {
    if (!accountName) return false;
    const lower = accountName.toLowerCase();
    return lower.includes('card') ||
           lower.includes('credit') ||
           lower.includes('citi') ||
           lower.includes('capital one') ||
           lower.includes('amex') ||
           lower.includes('sapphire') ||
           lower.includes('discover') ||
           lower.includes('visa') ||
           lower.includes('mastercard');
  };

  // Helper to identify internal account-to-account transfers and brokerage movements
  const isInternalTransfer = (merch, cat) => {
    const m = (merch || '').toLowerCase();
    const c = (cat || '').toLowerCase();

    // If it has explicit payroll or interest or dividend or tax refund keywords, it is genuine income
    if (
      m.includes('payroll') ||
      m.includes('salary') ||
      m.includes('direct dep') ||
      m.includes('bonus') ||
      m.includes('interest') ||
      m.includes('dividend') ||
      m.includes('tax ref') ||
      m.includes('treas 310') ||
      m.includes('irs treas')
    ) {
      return false;
    }

    // Otherwise check for transfer patterns
    if (c === 'transfer') return true;
    if (
      m.includes('online transfer') ||
      m.includes('transfer from') ||
      m.includes('transfer to') ||
      m.includes('cr-bkrg') ||
      m.includes('bkrg transfer') ||
      m.includes('brokerage transfer') ||
      m.includes('to chase') ||
      m.includes('from bofa') ||
      m.includes('from ayush')
    ) {
      return true;
    }

    return false;
  };

  // Filter raw transactions to strictly genuine depository inflows
  const allInflowTransactions = useMemo(() => {
    return transactions.filter(t => {
      const acc = t.account || '';
      const merch = (t.merchant || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();

      // 1. STRICT RULE: Credit card credits are payments or refunds, NEVER income!
      if (isCreditCardAccount(acc)) {
        return false;
      }

      // 2. Filter out bill payments, autopays, refunds, and return credits
      if (
        merch.includes('payment thank you') ||
        merch.includes('automatic payment') ||
        merch.includes('autopay') ||
        merch.includes('bill payment') ||
        merch.includes('refund') ||
        merch.includes('return') ||
        cat.includes('credit card payment')
      ) {
        return false;
      }

      // 3. Filter out internal account-to-account transfers (e.g. BofA to Chase, Brokerage CR-Bkrg)
      if (excludeTransfers && isInternalTransfer(merch, cat)) {
        return false;
      }

      // 4. Check if genuine inflow
      const isIncomeType = t.type === 'income' || t.amount < 0 || cat === 'income';
      if (!isIncomeType) return false;

      return true;
    }).map(t => {
      const src = t.incomeSource || SOURCE_LOOKUP[t.category]?.name || 'Salary & Wages';
      const def = SOURCE_LOOKUP[src] || SOURCE_LOOKUP['Salary & Wages'];
      const typ = t.incomeType || def.defaultType;
      const absAmount = Math.abs(Number(t.amount) || 0);

      return {
        ...t,
        amount: absAmount,
        incomeSource: src,
        incomeType: typ,
        sourceConfig: def
      };
    });
  }, [transactions, excludeTransfers]);

  // Filter by timeframe
  const filteredInflows = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    return allInflowTransactions.filter(t => {
      if (!t.date) return false;
      const txDate = new Date(t.date);

      if (selectedPeriod === '2026') {
        return t.date.startsWith('2026');
      } else if (selectedPeriod === '2025') {
        return t.date.startsWith('2025');
      } else if (selectedPeriod === 'last-30') {
        const diffDays = (now - txDate) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 30;
      } else if (selectedPeriod === 'last-90') {
        const diffDays = (now - txDate) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 90;
      } else if (selectedPeriod !== 'all') {
        // Must be a specific YYYY-MM
        return t.date.startsWith(selectedPeriod);
      }
      return true;
    });
  }, [allInflowTransactions, selectedPeriod]);

  // Expenses in the same period to calculate Financial Independence / Passive Coverage Ratio
  const periodExpensesTotal = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      if (t.type === 'income' || t.amount <= 0) return false;
      const cat = (t.category || '').toLowerCase();
      if (cat === 'credit card payment' || cat === 'transfer') return false;

      if (selectedPeriod === '2026') return t.date?.startsWith('2026');
      if (selectedPeriod === '2025') return t.date?.startsWith('2025');
      if (selectedPeriod === 'last-30') {
        const diffDays = (now - new Date(t.date)) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }
      if (selectedPeriod === 'last-90') {
        const diffDays = (now - new Date(t.date)) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 90;
      }
      if (selectedPeriod !== 'all') return t.date?.startsWith(selectedPeriod);
      return true;
    }).reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  }, [transactions, selectedPeriod]);

  // Active vs Passive Aggregation
  const { totalInflow, activeTotal, passiveTotal, activePercent, passivePercent, sourceBreakdown, monthlyTrendData } = useMemo(() => {
    let activeSum = 0;
    let passiveSum = 0;
    const sourceMap = {};

    INCOME_SOURCES.forEach(s => {
      sourceMap[s.name] = {
        name: s.name,
        icon: s.icon,
        color: s.color,
        type: s.defaultType,
        total: 0,
        count: 0
      };
    });

    // Monthly bucket map
    const monthMap = {};

    filteredInflows.forEach(t => {
      const amt = t.amount;
      if (t.incomeType === 'passive') {
        passiveSum += amt;
      } else {
        activeSum += amt;
      }

      if (!sourceMap[t.incomeSource]) {
        sourceMap[t.incomeSource] = {
          name: t.incomeSource,
          icon: '💰',
          color: '#10B981',
          type: t.incomeType,
          total: 0,
          count: 0
        };
      }
      sourceMap[t.incomeSource].total += amt;
      sourceMap[t.incomeSource].count += 1;

      // Group by month
      if (t.date && t.date.length >= 7) {
        const ym = t.date.substring(0, 7);
        if (!monthMap[ym]) {
          monthMap[ym] = { month: ym, active: 0, passive: 0, total: 0 };
        }
        if (t.incomeType === 'passive') {
          monthMap[ym].passive += amt;
        } else {
          monthMap[ym].active += amt;
        }
        monthMap[ym].total += amt;
      }
    });

    const total = activeSum + passiveSum;
    const actPct = total > 0 ? ((activeSum / total) * 100).toFixed(1) : 0;
    const pasPct = total > 0 ? ((passiveSum / total) * 100).toFixed(1) : 0;

    const sourcesArray = Object.values(sourceMap)
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);

    const trendArray = Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    return {
      totalInflow: total,
      activeTotal: activeSum,
      passiveTotal: passiveSum,
      activePercent: actPct,
      passivePercent: pasPct,
      sourceBreakdown: sourcesArray,
      monthlyTrendData: trendArray
    };
  }, [filteredInflows]);

  // Donut chart dataset for Active vs Passive
  const donutData = useMemo(() => {
    return [
      { name: 'Active Income', value: activeTotal, color: '#10B981', percent: activePercent },
      { name: 'Passive Income', value: passiveTotal, color: '#F59E0B', percent: passivePercent }
    ].filter(d => d.value > 0);
  }, [activeTotal, passiveTotal, activePercent, passivePercent]);

  // Passive coverage / Financial Independence Ratio
  const passiveCoverageRatio = periodExpensesTotal > 0
    ? ((passiveTotal / periodExpensesTotal) * 100).toFixed(1)
    : 0;

  // Filtered table rows
  const tableRows = useMemo(() => {
    return filteredInflows.filter(t => {
      if (typeFilter !== 'all' && t.incomeType !== typeFilter) return false;
      if (sourceFilter !== 'all' && t.incomeSource !== sourceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const merch = (t.merchant || '').toLowerCase();
        const src = (t.incomeSource || '').toLowerCase();
        const acc = (t.account || '').toLowerCase();
        if (!merch.includes(q) && !src.includes(q) && !acc.includes(q)) return false;
      }
      return true;
    });
  }, [filteredInflows, typeFilter, sourceFilter, searchQuery]);

  // Inline patch handlers
  const handleUpdateSource = (txId, newSource) => {
    const srcDef = SOURCE_LOOKUP[newSource] || SOURCE_LOOKUP['Salary & Wages'];
    if (onPatchTransaction) {
      onPatchTransaction(txId, {
        incomeSource: newSource,
        incomeType: srcDef.defaultType
      });
    }
  };

  const handleUpdateType = (txId, newType) => {
    if (onPatchTransaction) {
      onPatchTransaction(txId, {
        incomeType: newType
      });
    }
  };

  // Submit new manual income
  const handleSaveNewInflow = async (e) => {
    e.preventDefault();
    if (!newInflowAmount || isNaN(newInflowAmount) || Number(newInflowAmount) <= 0) {
      alert('Please enter a valid inflow amount.');
      return;
    }
    const cleanAmount = parseFloat(newInflowAmount);
    const newTx = {
      id: `tx_${Date.now()}_manual_income`,
      date: newInflowDate,
      merchant: newInflowMerchant || `${newInflowSource} Deposit`,
      category: 'Income',
      amount: cleanAmount,
      type: 'income',
      account: newInflowAccount,
      incomeSource: newInflowSource,
      incomeType: newInflowType,
      tags: ['Manual Inflow', 'Income Stream'],
      receipt: 0,
      source: 'manual'
    };

    if (onSaveTransaction) {
      await onSaveTransaction(newTx);
      setIsAddModalOpen(false);
      setNewInflowMerchant('');
      setNewInflowAmount('');
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', color: '#F8FAFC' }}>
      
      {/* Top Banner & Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '20px',
        padding: '24px 32px',
        marginBottom: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '680px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#34D399',
            marginBottom: '10px'
          }}>
            <Coins size={13} />
            DHANA INFLOW ENGINE
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'white', margin: '0 0 6px 0', fontFamily: "'Cinzel', serif" }}>
            Income Streams & Active vs Passive Breakdown
          </h1>
          <p style={{ fontSize: '13.5px', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
            Categorize your inflow streams by source (*Salary, Interest, Dividends, Rental, Freelance*) and track your financial freedom ratio through active vs passive cash flow intelligence.
          </p>
        </div>

        {/* Top Inflow Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              backgroundColor: '#10B981',
              border: 'none',
              color: '#F8FAFC',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Plus size={16} />
            Log Income Inflow
          </button>
        </div>
      </div>

      {/* Timeframe & Filter Bar */}
      <div style={{
        backgroundColor: '#1E293B',
        borderRadius: '16px',
        border: '1px solid #334155',
        padding: '14px 20px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Timeframe Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={14} /> Timeframe:
          </span>
          {[
            { id: '2026', label: '2026 (YTD)' },
            { id: '2025', label: '2025 (Full Year)' },
            { id: 'last-90', label: 'Last 90 Days' },
            { id: 'last-30', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriod(p.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: selectedPeriod === p.id ? '1px solid #10B981' : '1px solid #334155',
                backgroundColor: selectedPeriod === p.id ? 'rgba(16, 185, 129, 0.2)' : '#0F172A',
                color: selectedPeriod === p.id ? '#34D399' : '#94A3B8',
                fontWeight: selectedPeriod === p.id ? 800 : 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {p.label}
            </button>
          ))}

          {/* Month Selector Dropdown */}
          <select
            value={selectedPeriod.startsWith('20') && selectedPeriod.length === 7 ? selectedPeriod : ''}
            onChange={(e) => { if (e.target.value) setSelectedPeriod(e.target.value); }}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #334155',
              backgroundColor: '#0F172A',
              color: '#CBD5E1',
              fontWeight: 600,
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">Month View...</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Transfer Exclude Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#CBD5E1', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={excludeTransfers}
              onChange={(e) => setExcludeTransfers(e.target.checked)}
              style={{ accentColor: '#10B981', cursor: 'pointer' }}
            />
            <span>Filter out Card Payments & Internal Transfers</span>
          </label>
        </div>
      </div>

      {/* KPI Cards: Inflow Totals, Active vs Passive, Freedom Coverage */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', marginBottom: '28px' }}>
        
        {/* Total Inflow */}
        <div style={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
              Total Inflow ({selectedPeriod})
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}>
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#F8FAFC' }}>
            ${totalInflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginTop: '4px' }}>
            {filteredInflows.length} Total Inflow Events
          </span>
        </div>

        {/* Active Income */}
        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#34D399', textTransform: 'uppercase' }}>
              ⚡ Active Income
            </span>
            <span style={{ fontSize: '12px', fontWeight: 900, color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '6px' }}>
              {activePercent}%
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#10B981' }}>
            ${activeTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginTop: '4px' }}>
            Direct Labor, Salary & Consulting
          </span>
        </div>

        {/* Passive Income */}
        <div style={{ backgroundColor: '#1E293B', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase' }}>
              🌱 Passive Income
            </span>
            <span style={{ fontSize: '12px', fontWeight: 900, color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: '2px 8px', borderRadius: '6px' }}>
              {passivePercent}%
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#F59E0B' }}>
            ${passiveTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginTop: '4px' }}>
            Interest, Dividends, Real Estate & Yield
          </span>
        </div>

        {/* Passive Coverage / Financial Freedom Ratio */}
        <div style={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
              Freedom Coverage
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#A78BFA' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#A78BFA' }}>
            {passiveCoverageRatio}%
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginTop: '4px' }}>
            Passive Inflow ÷ Outflow (${periodExpensesTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} Expenses)
          </span>
        </div>
      </div>

      {/* Main Charts & Visualizations Section */}
      <div style={{
        backgroundColor: '#1E293B',
        borderRadius: '20px',
        border: '1px solid #334155',
        padding: '24px',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChartIcon size={20} color="#10B981" />
              Active vs. Passive Intelligence & Inflow Breakdown
            </h3>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>
              Visual distribution of capital generation sources for {selectedPeriod}
            </span>
          </div>

          {/* Chart View Switcher */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'split', label: 'Active vs Passive Split' },
              { id: 'sources', label: 'Sources Ranking' },
              { id: 'trend', label: 'Monthly Progression' }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setChartView(v.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: chartView === v.id ? '1px solid #10B981' : '1px solid #334155',
                  backgroundColor: chartView === v.id ? 'rgba(16, 185, 129, 0.25)' : '#0F172A',
                  color: chartView === v.id ? '#34D399' : '#94A3B8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Chart Display */}
        {chartView === 'split' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'center' }}>
            {/* Donut Chart */}
            <div style={{ height: '280px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Inflow']}
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '10px', color: '#F8FAFC' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Split Details Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Active Card */}
              <div style={{ backgroundColor: '#0F172A', border: '1px solid #10B98150', borderRadius: '14px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: '#10B981' }} />
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'white' }}>⚡ Active Income (Labor & Contracts)</span>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#10B981' }}>{activePercent}%</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#F8FAFC', marginBottom: '6px' }}>
                  ${activeTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: 0 }}>
                  Generated from active work, employment, contracts, and business operations.
                </p>
              </div>

              {/* Passive Card */}
              <div style={{ backgroundColor: '#0F172A', border: '1px solid #F59E0B50', borderRadius: '14px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: '#F59E0B' }} />
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'white' }}>🌱 Passive Income (Capital & Assets)</span>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#F59E0B' }}>{passivePercent}%</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#F8FAFC', marginBottom: '6px' }}>
                  ${passiveTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: 0 }}>
                  Generated from high-yield interest, dividends, rental cash flows, royalties, and capital yield.
                </p>
              </div>
            </div>
          </div>
        )}

        {chartView === 'sources' && (
          <div style={{ height: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sourceBreakdown}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 140, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94A3B8" tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <YAxis dataKey="name" type="category" stroke="#CBD5E1" tick={{ fontSize: 12, fill: '#CBD5E1' }} width={135} />
                <Tooltip
                  formatter={(val, name, item) => [`$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })} (${item.payload.type === 'passive' ? '🌱 Passive' : '⚡ Active'})`, 'Inflow']}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '10px', color: '#F8FAFC' }}
                />
                <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                  {sourceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.type === 'passive' ? '#F59E0B' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartView === 'trend' && (
          <div style={{ height: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyTrendData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94A3B8" tick={{ fill: '#94A3B8' }} />
                <YAxis stroke="#94A3B8" tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <Tooltip
                  formatter={(val, name) => [`$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, name === 'active' ? '⚡ Active' : '🌱 Passive']}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '10px', color: '#F8FAFC' }}
                />
                <Legend wrapperStyle={{ color: '#CBD5E1' }} formatter={(v) => (v === 'active' ? '⚡ Active Income' : '🌱 Passive Income')} />
                <Bar dataKey="active" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="passive" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Income Sources Summary Cards */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'white', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="#FBBF24" />
          Active Inflow Channels in {selectedPeriod}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {sourceBreakdown.map((src) => {
            const share = totalInflow > 0 ? ((src.total / totalInflow) * 100).toFixed(1) : 0;
            const isPassive = src.type === 'passive';

            return (
              <div
                key={src.name}
                style={{
                  backgroundColor: '#1E293B',
                  border: isPassive ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '14px',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{src.icon}</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'white' }}>{src.name}</span>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: isPassive ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: isPassive ? '#FBBF24' : '#34D399',
                    border: isPassive ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    {isPassive ? '🌱 PASSIVE' : '⚡ ACTIVE'}
                  </span>
                </div>

                <div style={{ fontSize: '20px', fontWeight: 900, color: '#F8FAFC', margin: '4px 0' }}>
                  ${src.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                  <span>{share}% of total inflow</span>
                  <span>{src.count} entries</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inflow Transactions Log Table */}
      <div style={{
        backgroundColor: '#1E293B',
        borderRadius: '20px',
        border: '1px solid #334155',
        padding: '24px'
      }}>
        {/* Table Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: 0 }}>
              Inflow Ledger ({tableRows.length} Transactions)
            </h3>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>
              Inspect and recategorize incoming cash flows
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search merchant or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '8px',
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  color: '#F8FAFC',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Type Filter Pill */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'all', label: 'All Inflows' },
                { id: 'active', label: '⚡ Active Only' },
                { id: 'passive', label: '🌱 Passive Only' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTypeFilter(t.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: typeFilter === t.id ? '1px solid #10B981' : '1px solid #334155',
                    backgroundColor: typeFilter === t.id ? 'rgba(16, 185, 129, 0.2)' : '#0F172A',
                    color: typeFilter === t.id ? '#34D399' : '#94A3B8',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Source Category Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0F172A',
                color: '#CBD5E1',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Sources</option>
              {INCOME_SOURCES.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Date</th>
                <th style={{ padding: '12px 14px' }}>Source / Description</th>
                <th style={{ padding: '12px 14px' }}>Account</th>
                <th style={{ padding: '12px 14px' }}>Income Channel (Source)</th>
                <th style={{ padding: '12px 14px' }}>Type</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Inflow Amount</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((tx) => {
                const isPassive = tx.incomeType === 'passive';

                return (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: '1px solid #334155',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0F172A'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 14px', color: '#94A3B8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {tx.date}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#F8FAFC' }}>
                      {tx.merchant}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#CBD5E1', fontSize: '12px' }}>
                      {tx.account || 'Checking'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {/* Inline Source Selector */}
                      <select
                        value={tx.incomeSource}
                        onChange={(e) => handleUpdateSource(tx.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#0F172A',
                          border: '1px solid #334155',
                          color: '#CBD5E1',
                          fontWeight: 700,
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        {INCOME_SOURCES.map(s => (
                          <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {/* Inline Active / Passive Toggle */}
                      <select
                        value={tx.incomeType}
                        onChange={(e) => handleUpdateType(tx.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: isPassive ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          border: isPassive ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                          color: isPassive ? '#FBBF24' : '#34D399',
                          fontWeight: 800,
                          fontSize: '11px',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="active">⚡ Active</option>
                        <option value="passive">🌱 Passive</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, color: '#10B981', fontSize: '14px', whiteSpace: 'nowrap' }}>
                      +${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}

              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                    No inflow transactions matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Income Inflow Modal */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#1E293B',
            borderRadius: '20px',
            border: '1px solid #10B98150',
            padding: '28px',
            width: '100%',
            maxWidth: '520px',
            color: '#F8FAFC',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coins size={20} color="#10B981" />
              Log New Income Inflow
            </h3>
            <p style={{ fontSize: '12.5px', color: '#94A3B8', marginBottom: '20px' }}>
              Add an incoming cash flow from salary, freelance, interest, or passive investments.
            </p>

            <form onSubmit={handleSaveNewInflow} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '4px' }}>
                  Date of Inflow
                </label>
                <input
                  type="date"
                  value={newInflowDate}
                  onChange={(e) => setNewInflowDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    color: '#F8FAFC',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '4px' }}>
                  Payer / Merchant Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp Payroll, High Yield Interest, Rental Tenant..."
                  value={newInflowMerchant}
                  onChange={(e) => setNewInflowMerchant(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    color: '#F8FAFC',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '4px' }}>
                    Inflow Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={newInflowAmount}
                    onChange={(e) => setNewInflowAmount(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      color: '#10B981',
                      fontWeight: 800,
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '4px' }}>
                    Deposit Account
                  </label>
                  <select
                    value={newInflowAccount}
                    onChange={(e) => setNewInflowAccount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id || acc.name} value={acc.name}>{acc.name}</option>
                    ))}
                    <option value="Checking">Checking Account</option>
                    <option value="Savings">High Yield Savings</option>
                    <option value="Brokerage">Brokerage Account</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '4px' }}>
                    Income Source Category
                  </label>
                  <select
                    value={newInflowSource}
                    onChange={(e) => {
                      setNewInflowSource(e.target.value);
                      const def = SOURCE_LOOKUP[e.target.value];
                      if (def) setNewInflowType(def.defaultType);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {INCOME_SOURCES.map(s => (
                      <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1', display: 'block', marginBottom: '4px' }}>
                    Income Type
                  </label>
                  <select
                    value={newInflowType}
                    onChange={(e) => setNewInflowType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      color: newInflowType === 'passive' ? '#FBBF24' : '#34D399',
                      fontWeight: 800,
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="active">⚡ Active (Labor)</option>
                    <option value="passive">🌱 Passive (Asset Yield)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #475569',
                    backgroundColor: 'transparent',
                    color: '#94A3B8',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#10B981',
                    color: '#F8FAFC',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Save Inflow Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
