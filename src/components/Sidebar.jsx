import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Building2,
  ReceiptText,
  Repeat,
  CreditCard,
  PieChart,
  Target,
  FileText,
  Sliders,
  Settings,
  ShieldCheck,
  Landmark,
  Coins
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'spending', label: 'Spending', icon: PieChart },
  { id: 'income', label: 'Income', icon: TrendingUp },
  { id: 'accounts', label: 'Accounts & Loans', icon: Building2 },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'assets', label: 'Assets', icon: Landmark },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'budgets', label: 'Budgets', icon: PieChart },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'bank-connectors', label: 'Bank Connectors', icon: ShieldCheck },
  { id: 'rules', label: 'Rules & Tags', icon: Sliders },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export function Sidebar({ activeTab, setActiveTab, settings = {}, accounts = [] }) {
  const visibleTabs = settings?.visibleTabs || {};

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (item.id === 'settings' || item.id === 'accounts' || item.id === 'spending' || item.id === 'income') return true;
    return visibleTabs[item.id] !== false;
  });

  const dueSoonCount = accounts.filter(a => a.dueStatus === 'overdue' || a.dueStatus === 'due_today' || a.dueStatus === 'due_soon').length;

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ height: '76px', padding: '0 20px' }}>
        <a href="#dashboard" className="logo" onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
          <div className="logo-icon">
            <Coins size={22} color="#0B0F19" />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 900, color: '#F8FAFC', margin: 0, fontFamily: "'Cinzel', serif" }}>
              DHANA LAKSHMI
            </h1>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#FBBF24', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>
              Vedic Financial Wealth
            </span>
          </div>
        </a>
      </div>

      <nav className="sidebar-nav">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={18} />
                <span>{item.label}</span>
              </div>
              {item.id === 'accounts' && dueSoonCount > 0 && (
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.25)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                  {dueSoonCount} Due
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid #1E293B', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', color: '#94A3B8' }}>
          Port: <strong style={{ color: '#FBBF24' }}>3002</strong> • FastAPI
        </div>
      </div>
    </aside>
  );
}
