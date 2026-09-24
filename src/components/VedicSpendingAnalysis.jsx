import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart as PieChartIcon,
  Sparkles,
  RefreshCw,
  Calendar,
  ExternalLink,
  Coins,
  ShieldCheck,
  TrendingUp,
  Award,
  Layers,
  BarChart3,
  Sliders,
  CheckCircle2,
  Clock,
  ArrowRight
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
  CartesianGrid,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';

export const ASHTA_LAKSHMI_CONFIG = {
  dhanya: {
    id: 'dhanya',
    english: 'Dhanya Lakshmi',
    sanskrit: 'धान्यलक्ष्मी',
    domain: 'Nourishment & Vitality',
    desc: 'Groceries, dining, organic food, wellness & vitality',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    icon: '🌾',
    vedicTargetPct: 25
  },
  gaja: {
    id: 'gaja',
    english: 'Gaja Lakshmi',
    sanskrit: 'गजलक्ष्मी',
    domain: 'Sovereignty & Mobility',
    desc: 'Housing, rent, mortgage, vehicles, gas & utilities',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    icon: '🐘',
    vedicTargetPct: 25
  },
  dhana: {
    id: 'dhana',
    english: 'Dhana Lakshmi',
    sanskrit: 'धनलक्ष्मी',
    domain: 'Capital & Financial Wealth',
    desc: 'Investments, debt reduction, savings & liquidity',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    icon: '💰',
    vedicTargetPct: 15
  },
  dhairya: {
    id: 'dhairya',
    english: 'Dhairya Lakshmi',
    sanskrit: 'धैर्यलक्ष्मी',
    domain: 'Resilience & Protection',
    desc: 'Health, life, auto insurance & emergency safety reserves',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    icon: '🛡️',
    vedicTargetPct: 10
  },
  santana: {
    id: 'santana',
    english: 'Santana Lakshmi',
    sanskrit: 'सन्तानलक्ष्मी',
    domain: 'Family & Generational Continuity',
    desc: 'Children, family welfare, schooling, elder care & succession',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    borderColor: 'rgba(236, 72, 153, 0.35)',
    icon: '👶',
    vedicTargetPct: 10
  },
  vidya: {
    id: 'vidya',
    english: 'Vidya Lakshmi',
    sanskrit: 'विद्यालक्ष्मी',
    domain: 'Knowledge & Skill Mastery',
    desc: 'Books, courses, tuition, intellectual journals & creative arts',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
    icon: '📚',
    vedicTargetPct: 5
  },
  vijaya: {
    id: 'vijaya',
    english: 'Vijaya Lakshmi',
    sanskrit: 'विजयलक्ष्मी',
    domain: 'Career & Professional Triumph',
    desc: 'Work equipment, productivity tools, conferences & career tools',
    color: '#F97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.35)',
    icon: '🏆',
    vedicTargetPct: 5
  },
  adi: {
    id: 'adi',
    english: 'Adi Lakshmi',
    sanskrit: 'आदिलक्ष्मी',
    domain: 'Foundations & Philanthropy',
    desc: 'Charity (Dāna), spiritual retreats, sanctuary & mindful rest',
    color: '#14B8A6',
    bgColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: 'rgba(20, 184, 166, 0.35)',
    icon: '🪷',
    vedicTargetPct: 5
  }
};

// Default mapping for Primary Dhana Expense Categories
export const DEFAULT_CATEGORY_LAKSHMI_MAP = {
  'Groceries & Organic Pantry': 'dhanya',
  'Dining & Social Outings': 'dhanya',
  'Health & Preventative Wellness': 'dhanya',
  'Housing & Living Space': 'gaja',
  'Transportation & Mobility': 'gaja',
  'Utilities & Connectivity': 'gaja',
  'Insurance & Risk Armor': 'dhairya',
  'Investments & Capital Growth': 'dhana',
  'Debt Servicing & Payoff': 'dhana',
  'Family & Childcare': 'santana',
  'Education & Skill Mastery': 'vidya',
  'Professional Tools & Enterprise': 'vijaya',
  'Charity & Philanthropy (Dāna)': 'adi',
  'Leisure, Travel & Personal Care': 'adi',
  'Living & General Expenses': 'gaja',
  // Fallbacks for standard categories
  'Housing': 'gaja',
  'Groceries': 'dhanya',
  'Dining': 'dhanya',
  'Transportation': 'gaja',
  'Utilities': 'gaja',
  'Subscriptions': 'gaja',
  'Insurance': 'dhairya',
  'Health': 'dhanya',
  'Entertainment': 'adi',
  'Shopping': 'dhana',
  'Travel': 'adi',
  'Personal Care': 'adi',
  'Education': 'vidya',
  'Needs review': 'dhanya',
  'Other': 'gaja'
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function VedicSpendingPage() {
  const [transactions, setTransactions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // View state: 'month' vs 'year'
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'year'
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [chartTab, setChartTab] = useState('donut'); // 'donut' | 'radar' | 'target'

  // Category-level Lakshmi mapping stored in localStorage
  const [categoryLakshmiMap, setCategoryLakshmiMap] = useState(() => {
    try {
      const saved = localStorage.getItem('ashta_lakshmi_category_mapping_v2');
      if (saved) return { ...DEFAULT_CATEGORY_LAKSHMI_MAP, ...JSON.parse(saved) };
    } catch (e) {}
    return { ...DEFAULT_CATEGORY_LAKSHMI_MAP };
  });

  const handleUpdateCategoryLakshmi = (categoryName, newLakshmi) => {
    const updated = { ...categoryLakshmiMap, [categoryName]: newLakshmi };
    setCategoryLakshmiMap(updated);
    try {
      localStorage.setItem('ashta_lakshmi_category_mapping_v2', JSON.stringify(updated));
    } catch (e) {}
  };

  // Fetch transactions from Dhana Lakshmi (:3002)
  const fetchDhanaData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:3002/api/state');
      if (res.ok) {
        const data = await res.json();
        const txs = data.transactions || [];
        setTransactions(txs);
        setIsConnected(true);
      } else {
        throw new Error('Non-200 response');
      }
    } catch (e) {
      console.warn('Could not reach Dhana Lakshmi on 3002; using sample assessment dataset', e);
      setIsConnected(false);
      // Fallback sample data
      setTransactions([
        { id: '1', date: '2026-08-20', merchant: 'Whole Foods Market', category: 'Groceries & Organic Pantry', amount: 485.50, type: 'expense' },
        { id: '2', date: '2026-08-22', merchant: 'Chase Home Lending', category: 'Housing & Living Space', amount: 2485.00, type: 'expense' },
        { id: '3', date: '2026-08-23', merchant: 'Tesla Finance Auto Loan', category: 'Transportation & Mobility', amount: 540.00, type: 'expense' },
        { id: '4', date: '2026-08-24', merchant: 'State Farm Insurance', category: 'Insurance & Risk Armor', amount: 175.00, type: 'expense' },
        { id: '5', date: '2026-08-25', merchant: 'Vanguard Index Fund Allocation', category: 'Investments & Capital Growth', amount: 1000.00, type: 'expense' },
        { id: '6', date: '2026-08-26', merchant: "O'Reilly & Coursera Deep Learning", category: 'Education & Skill Mastery', amount: 120.00, type: 'expense' },
        { id: '7', date: '2026-08-27', merchant: 'AWS Cloud & JetBrains Tools', category: 'Professional Tools & Enterprise', amount: 145.00, type: 'expense' },
        { id: '8', date: '2026-08-28', merchant: 'Sanskrit Heritage & Temple Dāna', category: 'Charity & Philanthropy (Dāna)', amount: 250.00, type: 'expense' },
        { id: '9', date: '2026-08-29', merchant: 'Children STEM Summer Workshop', category: 'Family & Childcare', amount: 320.00, type: 'expense' },
        { id: '10', date: '2026-08-15', merchant: 'Comcast & Mobile Utility', category: 'Utilities & Connectivity', amount: 165.00, type: 'expense' },
        { id: '11', date: '2026-08-18', merchant: 'Starbucks & Local Bistro', category: 'Dining & Social Outings', amount: 210.00, type: 'expense' },
        { id: '12', date: '2026-08-12', merchant: 'CVS & Preventive Wellness', category: 'Health & Preventative Wellness', amount: 85.00, type: 'expense' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDhanaData();
  }, []);

  // Filter genuine expenses
  const allExpenses = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'expense') return false;

      const lowerCat = String(t.category || '').toLowerCase();
      // Exclude transfers and credit card repayments from expense analytics
      if (lowerCat.includes('credit card payment') || lowerCat.includes('transfer') || lowerCat.includes('cash withdrawal')) {
        return false;
      }
      return true;
    });
  }, [transactions]);

  // Discover available months and years from transaction dates
  const { availableMonths, availableYears } = useMemo(() => {
    const monthSet = new Set();
    const yearSet = new Set();

    allExpenses.forEach(t => {
      if (t.date && t.date.length >= 7) {
        const ym = t.date.slice(0, 7);
        const y = t.date.slice(0, 4);
        if (/^\d{4}-\d{2}$/.test(ym)) monthSet.add(ym);
        if (/^\d{4}$/.test(y)) yearSet.add(y);
      }
    });

    const sortedMonths = Array.from(monthSet).sort().reverse();
    const sortedYears = Array.from(yearSet).sort().reverse();

    return {
      availableMonths: sortedMonths.length > 0 ? sortedMonths : ['2026-08', '2026-07', '2026-06'],
      availableYears: sortedYears.length > 0 ? sortedYears : ['2026', '2025']
    };
  }, [allExpenses]);

  // Set default selected month and year if not in set
  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableMonths, availableYears]);

  // Filter expenses based on active view mode (Month or Year)
  const periodExpenses = useMemo(() => {
    if (viewMode === 'month') {
      return allExpenses.filter(t => t.date && t.date.startsWith(selectedMonth));
    }
    return allExpenses.filter(t => t.date && t.date.startsWith(selectedYear));
  }, [allExpenses, viewMode, selectedMonth, selectedYear]);

  // Club spending by Primary Expense Category
  const clubbedCategories = useMemo(() => {
    const catMap = {};

    periodExpenses.forEach(t => {
      // Use primaryExpenseCategory if present, else fallback to category
      const catName = t.primaryExpenseCategory || t.category || 'Living & General Expenses';
      if (!catMap[catName]) {
        catMap[catName] = {
          name: catName,
          totalAmount: 0,
          txCount: 0
        };
      }
      catMap[catName].totalAmount += Number(t.amount || 0);
      catMap[catName].txCount += 1;
    });

    const totalOutflow = Object.values(catMap).reduce((sum, c) => sum + c.totalAmount, 0);

    return Object.values(catMap).map(c => {
      const mappedLakshmiKey = categoryLakshmiMap[c.name] || 'dhanya';
      const lakshmiCfg = ASHTA_LAKSHMI_CONFIG[mappedLakshmiKey] || ASHTA_LAKSHMI_CONFIG.dhanya;
      const monthlyAvg = viewMode === 'year' ? c.totalAmount / 12 : c.totalAmount;

      return {
        ...c,
        mappedLakshmiKey,
        lakshmiCfg,
        percentage: totalOutflow > 0 ? (c.totalAmount / totalOutflow) * 100 : 0,
        monthlyAvg
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [periodExpenses, categoryLakshmiMap, viewMode]);

  const totalPeriodOutflow = useMemo(() => {
    return clubbedCategories.reduce((sum, c) => sum + c.totalAmount, 0);
  }, [clubbedCategories]);

  // Aggregate by Ashta Lakshmi based on the clubbed categories
  const lakshmiBreakdown = useMemo(() => {
    const totals = {};
    Object.keys(ASHTA_LAKSHMI_CONFIG).forEach(k => {
      totals[k] = { ...ASHTA_LAKSHMI_CONFIG[k], totalAmount: 0, categoriesCount: 0 };
    });

    clubbedCategories.forEach(c => {
      const k = c.mappedLakshmiKey;
      if (!totals[k]) {
        totals[k] = { ...ASHTA_LAKSHMI_CONFIG.dhanya, id: k, totalAmount: 0, categoriesCount: 0 };
      }
      totals[k].totalAmount += c.totalAmount;
      totals[k].categoriesCount += 1;
    });

    const sum = Object.values(totals).reduce((acc, l) => acc + l.totalAmount, 0);

    return Object.values(totals).map(l => ({
      ...l,
      percentage: sum > 0 ? (l.totalAmount / sum) * 100 : 0
    })).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [clubbedCategories]);

  const topLakshmi = lakshmiBreakdown[0] || ASHTA_LAKSHMI_CONFIG.dhanya;

  // Vidya vs Gaja ratio
  const vidyaAmount = lakshmiBreakdown.find(l => l.id === 'vidya')?.totalAmount || 0;
  const gajaAmount = lakshmiBreakdown.find(l => l.id === 'gaja')?.totalAmount || 0;
  const vidyaGajaRatio = gajaAmount > 0 ? ((vidyaAmount / gajaAmount) * 100).toFixed(1) : '0';

  // Dharma (Adi) giving rate
  const adiAmount = lakshmiBreakdown.find(l => l.id === 'adi')?.totalAmount || 0;
  const dharmaRate = totalPeriodOutflow > 0 ? ((adiAmount / totalPeriodOutflow) * 100).toFixed(1) : '0';

  // Comparison data for Radar & Bar charts
  const comparisonData = useMemo(() => {
    return Object.keys(ASHTA_LAKSHMI_CONFIG).map(k => {
      const cfg = ASHTA_LAKSHMI_CONFIG[k];
      const actual = lakshmiBreakdown.find(l => l.id === k);
      const actualPct = actual ? Number(actual.percentage.toFixed(1)) : 0;
      return {
        dimension: cfg.english.replace(' Lakshmi', ''),
        sanskrit: cfg.sanskrit,
        Actual: actualPct,
        VedicTarget: cfg.vedicTargetPct,
        fullMark: 35
      };
    });
  }, [lakshmiBreakdown]);

  // Format month label (e.g. 2026-08 -> August 2026)
  const formatMonthLabel = (ym) => {
    if (!ym || ym.length < 7) return ym;
    const parts = ym.split('-');
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${MONTH_NAMES[mIdx] || parts[1]} ${parts[0]}`;
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', color: '#F8FAFC' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '20px',
        padding: '28px 32px',
        marginBottom: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '800px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(245, 158, 11, 0.2)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#FBBF24',
            marginBottom: '10px'
          }}>
            <Sparkles size={13} />
            CATEGORY-LEVEL VEDIC SPENDING AGGREGATION MATRIX
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'white', margin: '0 0 8px 0', fontFamily: "'Cinzel', serif" }}>
            Ashta Lakshmi Spending Audit & Allocation Hub
          </h1>
          <p style={{ fontSize: '13.5px', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
            Spending is clubbed by **Expense Category** across months or full years. Each expense category is mapped to its corresponding Ashta Lakshmi dimension to evaluate your life-balance capital equilibrium.
          </p>
        </div>

        {/* Source Connection Pill */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0F172A',
            border: '1px solid #334155',
            padding: '6px 14px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 800
          }}>
            <span style={{ color: isConnected ? '#10B981' : '#F59E0B' }}>
              {isConnected ? '● Connected to Dhana Lakshmi (:3002)' : '● Offline Sample Data'}
            </span>
            <button
              onClick={fetchDhanaData}
              title="Refresh transactions from Dhana Lakshmi server"
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
            >
              <RefreshCw size={13} />
            </button>
          </div>

          <a
            href="http://127.0.0.1:3002#spending"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#FBBF24',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            <span>Open Dhana Primary Expense Ledger</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Period Selection & View Toggle Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '16px 22px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Month View vs Year View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
            Aggregation View:
          </span>
          <div style={{ display: 'inline-flex', backgroundColor: '#0F172A', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
            <button
              onClick={() => setViewMode('month')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === 'month' ? '#F59E0B' : 'transparent',
                color: viewMode === 'month' ? '#0F172A' : '#94A3B8',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              📅 Month View
            </button>
            <button
              onClick={() => setViewMode('year')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === 'year' ? '#F59E0B' : 'transparent',
                color: viewMode === 'year' ? '#0F172A' : '#94A3B8',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              📆 Year View
            </button>
          </div>
        </div>

        {/* Dynamic Period Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={18} color="#FBBF24" />
          {viewMode === 'month' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#CBD5E1' }}>Select Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  backgroundColor: '#0F172A',
                  border: '1px solid #475569',
                  borderRadius: '10px',
                  padding: '7px 14px',
                  color: '#F8FAFC',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {availableMonths.map(m => (
                  <option key={m} value={m} style={{ background: '#0F172A', color: '#F8FAFC' }}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#CBD5E1' }}>Select Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  backgroundColor: '#0F172A',
                  border: '1px solid #475569',
                  borderRadius: '10px',
                  padding: '7px 14px',
                  color: '#F8FAFC',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {availableYears.map(y => (
                  <option key={y} value={y} style={{ background: '#0F172A', color: '#F8FAFC' }}>
                    Calendar Year {y}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 4 Summary Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', marginBottom: '28px' }}>
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>
            {viewMode === 'month' ? `${formatMonthLabel(selectedMonth)} Outflow` : `Year ${selectedYear} Outflow`}
          </span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: 'white', margin: '4px 0' }}>
            ${Math.round(totalPeriodOutflow).toLocaleString()}
          </div>
          <span style={{ fontSize: '11px', color: '#64748B' }}>Across {clubbedCategories.length} expense categories</span>
        </div>

        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Dominant Lakshmi Pillar</span>
          <div style={{ fontSize: '19px', fontWeight: 900, color: topLakshmi.color, margin: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{topLakshmi.icon}</span>
            <span>{topLakshmi.english}</span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            ${Math.round(topLakshmi.totalAmount).toLocaleString()} ({topLakshmi.percentage.toFixed(1)}% of budget)
          </span>
        </div>

        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Vidya vs. Gaja Ratio</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: Number(vidyaGajaRatio) > 20 ? '#10B981' : '#F59E0B', margin: '4px 0' }}>
            {vidyaGajaRatio}%
          </div>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            Learning (${Math.round(vidyaAmount).toLocaleString()}) / Mobility & Housing
          </span>
        </div>

        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Dharma & Giving Rate (Adi)</span>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#14B8A6', margin: '4px 0' }}>
            {dharmaRate}%
          </div>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            ${Math.round(adiAmount).toLocaleString()} dedicated to Dāna & Sanctuary
          </span>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div style={{
        background: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 900, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChartIcon size={20} color="#FBBF24" />
              Ashta Lakshmi Spending Pattern ({viewMode === 'month' ? formatMonthLabel(selectedMonth) : `Year ${selectedYear}`})
            </h3>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>Aggregated across all clubbed categories for the active period</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setChartTab('donut')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: chartTab === 'donut' ? '1px solid #F59E0B' : '1px solid #475569',
                backgroundColor: chartTab === 'donut' ? 'rgba(245, 158, 11, 0.2)' : '#0F172A',
                color: chartTab === 'donut' ? '#FBBF24' : '#94A3B8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Donut View
            </button>
            <button
              onClick={() => setChartTab('radar')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: chartTab === 'radar' ? '1px solid #F59E0B' : '1px solid #475569',
                backgroundColor: chartTab === 'radar' ? 'rgba(245, 158, 11, 0.2)' : '#0F172A',
                color: chartTab === 'radar' ? '#FBBF24' : '#94A3B8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Vedic Radar
            </button>
            <button
              onClick={() => setChartTab('target')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: chartTab === 'target' ? '1px solid #F59E0B' : '1px solid #475569',
                backgroundColor: chartTab === 'target' ? 'rgba(245, 158, 11, 0.2)' : '#0F172A',
                color: chartTab === 'target' ? '#FBBF24' : '#94A3B8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Actual vs Target
            </button>
          </div>
        </div>

        {/* Chart Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '28px', alignItems: 'center' }}>
          <div style={{ height: '320px', width: '100%' }}>
            {chartTab === 'donut' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={lakshmiBreakdown.filter(l => l.totalAmount > 0)}
                    dataKey="totalAmount"
                    nameKey="english"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={115}
                    paddingAngle={3}
                  >
                    {lakshmiBreakdown.filter(l => l.totalAmount > 0).map((entry) => (
                      <Cell key={`cell-${entry.id}`} fill={entry.color} stroke="#1E293B" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`$${Number(val).toLocaleString()} (${((Number(val)/totalPeriodOutflow)*100).toFixed(1)}%)`, 'Outflow']}
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#F8FAFC' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            {chartTab === 'radar' && (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius={105} data={comparisonData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="dimension" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis stroke="#475569" angle={30} domain={[0, 35]} />
                  <Radar name="Actual %" dataKey="Actual" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.4} />
                  <Radar name="Vedic Target %" dataKey="VedicTarget" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                  <Legend />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#F8FAFC' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}

            {chartTab === 'target' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="dimension" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94A3B8" unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#F8FAFC' }} />
                  <Legend />
                  <Bar dataKey="Actual" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="VedicTarget" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 8-Pillar Breakdown Side Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '6px' }}>
            {lakshmiBreakdown.map(item => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{item.english}</span>
                      <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: "'Cinzel', serif" }}>({item.sanskrit})</span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>{item.categoriesCount} Categories Mapped</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 900, color: item.color }}>
                    ${Math.round(item.totalAmount).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#CBD5E1', fontWeight: 700 }}>
                    {item.percentage.toFixed(1)}% of outflows
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category-Level Ashta Lakshmi Allocation Matrix Table */}
      <div style={{
        backgroundColor: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'white', margin: 0 }}>
              Clubbed Expense Categories & Ashta Lakshmi Mapping Matrix
            </h3>
            <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>
              Showing {clubbedCategories.length} expense categories clubbed for {viewMode === 'month' ? formatMonthLabel(selectedMonth) : `Year ${selectedYear}`}
            </span>
          </div>

          <span style={{ fontSize: '11.5px', color: '#FBBF24', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            💡 Mapping changes here apply globally across all months & years
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 20px' }}>Expense Category</th>
                <th style={{ padding: '14px 20px' }}>Mapped Ashta Lakshmi Dimension</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Period Total ($)</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>% of Outflow</th>
                {viewMode === 'year' && (
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Monthly Avg Burn</th>
                )}
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Tx Count</th>
              </tr>
            </thead>
            <tbody>
              {clubbedCategories.map((c) => {
                const lakshmi = c.lakshmiCfg;

                return (
                  <tr
                    key={c.name}
                    style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}
                  >
                    <td style={{ padding: '14px 20px', fontWeight: 800, color: '#F8FAFC' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: lakshmi.color }} />
                        <span>{c.name}</span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 20px' }}>
                      <select
                        value={c.mappedLakshmiKey}
                        onChange={(e) => handleUpdateCategoryLakshmi(c.name, e.target.value)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${lakshmi.borderColor}`,
                          backgroundColor: lakshmi.bgColor,
                          color: lakshmi.color,
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        {Object.keys(ASHTA_LAKSHMI_CONFIG).map(k => (
                          <option key={k} value={k} style={{ background: '#0F172A', color: '#F8FAFC' }}>
                            {ASHTA_LAKSHMI_CONFIG[k].icon} {ASHTA_LAKSHMI_CONFIG[k].english} ({ASHTA_LAKSHMI_CONFIG[k].sanskrit})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 900, color: 'white' }}>
                      ${Math.round(c.totalAmount).toLocaleString()}
                    </td>

                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700, color: '#CBD5E1' }}>
                      {c.percentage.toFixed(1)}%
                    </td>

                    {viewMode === 'year' && (
                      <td style={{ padding: '14px 20px', textAlign: 'right', color: '#94A3B8', fontWeight: 600 }}>
                        ${Math.round(c.monthlyAvg).toLocaleString()}/mo
                      </td>
                    )}

                    <td style={{ padding: '14px 20px', textAlign: 'right', color: '#64748B', fontSize: '12px' }}>
                      {c.txCount} txs
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
