import React, { useState } from 'react';
import { RefreshCw, Upload, Plus, Sparkles, Coins, Bell, AlertCircle, CheckCircle2, X } from 'lucide-react';

export function Header({
  keycloak,
  activeTab,
  accounts = [],
  onOpenAddEntry,
  onOpenImport,
  onOpenDriveSync,
  onMarkAccountPaid,
  onNavigateTab
}) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const titles = {
    dashboard: 'Financial Overview & Net Worth',
    spending: 'Spending & Expense Analytics',
    accounts: 'Accounts, Loans & Recurring Due Notifications',
    transactions: 'Transactions Ledger',
    assets: 'Asset Portfolio & Valuations',
    recurring: 'Recurring Payments',
    subscriptions: 'Active Subscriptions',
    budgets: 'Monthly Budgets',
    goals: 'Financial Goals',
    documents: 'Document Vault & Statements',
    rules: 'Categorization Rules & Tags',
    settings: 'Settings & Preferences'
  };

  const dueSoonList = accounts.filter(a => a.dueStatus === 'overdue' || a.dueStatus === 'due_today' || a.dueStatus === 'due_soon');

  return (
    <header className="top-header" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
      <div className="header-title-area">
        <div className="mobile-logo-title">
          <Coins size={22} color="#FBBF24" />
          <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 800, color: '#F8FAFC' }}>DHANA LAKSHMI</span>
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#F8FAFC', margin: 0 }}>
            {titles[activeTab] || 'Dhana Lakshmi'}
          </h1>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>
            श्रीं ह्रीं क्लीं • Material Abundance & Righteous Wealth (Artha)
          </span>
        </div>
      </div>

      <div className="header-actions" style={{ position: 'relative' }}>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsAlertOpen(!isAlertOpen)}
            style={{ position: 'relative', padding: '6px 10px' }}
            title="View Upcoming Payment Due Notifications"
          >
            <Bell size={16} color={dueSoonList.length > 0 ? '#FBBF24' : '#94A3B8'} />
            {dueSoonList.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#F59E0B',
                color: '#F8FAFC',
                fontSize: '10px',
                fontWeight: 900,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)'
              }}>
                {dueSoonList.length}
              </span>
            )}
          </button>

          {/* Floating Due Notification Drawer */}
          {isAlertOpen && (
            <div style={{
              position: 'absolute',
              top: '46px',
              right: 0,
              width: '360px',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '14px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              zIndex: 100,
              padding: '16px',
              color: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} color="#FBBF24" />
                  <strong style={{ fontSize: '13px' }}>Due Date Notifications</strong>
                </div>
                <button onClick={() => setIsAlertOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              {dueSoonList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: '#94A3B8' }}>
                  <CheckCircle2 size={24} color="#34D399" style={{ margin: '0 auto 6px auto', display: 'block' }} />
                  All payments and obligations are up to date!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {dueSoonList.map(item => (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: '#1E293B',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#F8FAFC' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#FBBF24' }}>
                          ${Number(item.paymentAmount).toLocaleString()} • Due {item.nextDueDate}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onMarkAccountPaid(item.id);
                          setIsAlertOpen(false);
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#F59E0B',
                          color: '#F8FAFC',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        Paid ✓
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: '1px solid #1E293B', paddingTop: '10px', marginTop: '10px', textAlign: 'center' }}>
                <button
                  onClick={() => {
                    setIsAlertOpen(false);
                    onNavigateTab('accounts');
                  }}
                  style={{ background: 'none', border: 'none', color: '#60A5FA', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Manage All Accounts & Obligations →
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="btn btn-secondary btn-sm" onClick={onOpenDriveSync}>
          <RefreshCw size={15} />
          <span className="hide-mobile">Drive sync</span>
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onOpenImport}>
          <Upload size={15} />
          <span className="hide-mobile">Import Statements</span>
        </button>
        <button className="btn btn-primary btn-sm" onClick={onOpenAddEntry}>
          <Plus size={15} />
          <span>Add entry</span>
        </button>
        {keycloak && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '10px', paddingLeft: '10px', borderLeft: '1px solid #334155' }}>
            <span style={{ fontSize: '12px', color: '#38BDF8', fontWeight: 600 }}>
              👤 {keycloak.tokenParsed?.given_name || keycloak.tokenParsed?.firstName || keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || 'Ayush'}
            </span>
            <button
              onClick={() => keycloak.logout({ redirectUri: window.location.origin })}
              title="Sign Out of Keycloak SSO"
              style={{
                background: '#EF4444',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '6px',
                color: 'white',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
