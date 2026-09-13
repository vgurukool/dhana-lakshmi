import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AddEntryModal } from './components/AddEntryModal';
import { ImportModal } from './components/ImportModal';
import { DriveSyncModal } from './components/DriveSyncModal';
import { BankConnectorsModal } from './components/BankConnectorsModal';
import { AIChatModal } from './components/AIChatModal';

import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Recurring } from './pages/Recurring';
import { Subscriptions } from './pages/Subscriptions';
import { Budgets } from './pages/Budgets';
import { Goals } from './pages/Goals';
import { Documents } from './pages/Documents';
import { BankConnectors } from './pages/BankConnectors';
import { RulesAndTags } from './pages/RulesAndTags';
import { Settings } from './pages/Settings';
import { Assets } from './pages/Assets';
import { AccountsAndLoans } from './pages/AccountsAndLoans';
import { Spending } from './pages/Spending';
import { Income } from './pages/Income';
import { AddAccountModal } from './components/AddAccountModal';

export function App({ keycloak }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Application state from server D1 DB
  const [appState, setAppState] = useState({
    transactions: [],
    tags: [],
    rules: [],
    settings: {},
    documents: []
  });

  // Modal open states
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDriveSyncOpen, setIsDriveSyncOpen] = useState(false);
  const [isBankConnectorsOpen, setIsBankConnectorsOpen] = useState(false);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setAppState(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching state:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const handleSaveAccount = async (accData) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accData)
      });
      if (!res.ok) throw new Error('Failed to save account');
      await fetchState();
    } catch (e) {
      alert('Error saving account: ' + e.message);
    }
  };

  const handleDeleteAccount = async (accId) => {
    if (!window.confirm('Delete this financial account / loan record?')) return;
    try {
      const res = await fetch(`/api/accounts/${accId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete account');
      await fetchState();
    } catch (e) {
      alert('Error deleting account: ' + e.message);
    }
  };

  const handleMarkAccountPaid = async (accId) => {
    try {
      const res = await fetch(`/api/accounts/${accId}/pay`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to mark payment as paid');
      await fetchState();
    } catch (e) {
      alert('Error marking account as paid: ' + e.message);
    }
  };

  const handlePeriodChange = async (newPeriod) => {
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPeriod: newPeriod })
      });
      if (!res.ok) throw new Error('Failed to update period selection');
      const updatedSettings = await res.json();
      setAppState(prev => ({
        ...prev,
        settings: { ...prev.settings, ...updatedSettings }
      }));
    } catch (err) {
      alert('Error updating period: ' + err.message);
    }
  };

  const handleSaveTransaction = async (txData) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txData)
    });
    if (!res.ok) throw new Error('Failed to save transaction');
    const data = await res.json();
    await fetchState();
    return data;
  };

  const handleBatchImportTransactions = async (txArray) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txArray)
    });
    if (!res.ok) throw new Error('Failed batch import');
    const data = await res.json();
    await fetchState();
    return data;
  };

  const handlePatchTransaction = async (id, updates) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update transaction');
    await fetchState();
  };

  const handleDeleteTransaction = async (id) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete transaction');
    await fetchState();
  };

  const handleSavePreferences = async (newPrefs) => {
    const res = await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPrefs)
    });
    if (!res.ok) throw new Error('Failed to save preferences');
    const updatedSettings = await res.json();
    setAppState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updatedSettings }
    }));
  };

  const handleUploadDocuments = async (filesList) => {
    const formData = new FormData();
    filesList.forEach(file => formData.append('files', file));

    const res = await fetch('/api/documents', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Upload documents failed');
    const data = await res.json();
    await fetchState();
    return data;
  };

  const handleDeleteDocument = async (docId) => {
    const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
    await fetchState();
  };

  const handleWipeData = async () => {
    const res = await fetch('/api/state', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE ALL LEDGERLY DATA' })
    });
    if (!res.ok) throw new Error('Wipe data failed');
    const data = await res.json();
    setAppState(data.state);
  };

  const handleTriggerManualDriveSync = async () => {
    const res = await fetch('/api/drive-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: [], files: [] })
    });
    if (!res.ok) throw new Error('Drive sync failed');
    const data = await res.json();
    await fetchState();
    return data;
  };

  const handleSaveAsset = async (assetPayload) => {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assetPayload)
    });
    if (!res.ok) throw new Error('Failed to save asset');
    await fetchState();
  };

  const handlePatchAsset = async (id, updates) => {
    const res = await fetch(`/api/assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update asset');
    await fetchState();
  };

  const handleDeleteAsset = async (id) => {
    const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete asset');
    await fetchState();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', color: '#6558D3', fontWeight: 700, fontSize: '18px' }}>
        Loading Ledgerly state from D1 Database...
      </div>
    );
  }

  const { transactions = [], tags = [], rules = [], settings = {}, documents = [], assetsList = [] } = appState;
  const categories = settings.categories || ['Housing', 'Groceries', 'Shopping', 'Dining', 'Transportation', 'Utilities', 'Subscriptions', 'Insurance', 'Health', 'Entertainment', 'Income', 'Needs review', 'Other'];
  const accounts = settings.accounts || ['Main Checking', 'Everyday Visa', 'Rewards Card', 'Cash'];
  const selectedPeriod = settings.selectedPeriod || 'all-time';

  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} settings={settings} accounts={appState.accountsList || []} />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <Header
          keycloak={keycloak}
          activeTab={activeTab}
          accounts={appState.accountsList || []}
          onOpenAddEntry={() => setIsAddEntryOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenDriveSync={() => setIsDriveSyncOpen(true)}
            onOpenBankConnectors={() => setIsBankConnectorsOpen(true)}
          onMarkAccountPaid={handleMarkAccountPaid}
          onNavigateTab={setActiveTab}
        />

        {/* Dynamic Page Views */}
        {activeTab === 'dashboard' && (
          <Dashboard
            transactions={transactions}
            settings={settings}
            assetsList={assetsList}
            accounts={appState.accountsList || []}
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
            onNavigate={setActiveTab}
            onMarkAccountPaid={handleMarkAccountPaid}
          />
        )}

        {activeTab === 'spending' && (
          <Spending
            transactions={transactions}
            categories={categories}
            onPatchTransaction={handlePatchTransaction}
          />
        )}

        {activeTab === 'income' && (
          <Income
            transactions={transactions}
            accounts={accounts}
            onPatchTransaction={handlePatchTransaction}
            onSaveTransaction={handleSaveTransaction}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsAndLoans
            accounts={appState.accountsList || []}
            onOpenAddAccount={() => {
              setEditingAccount(null);
              setIsAddAccountOpen(true);
            }}
            onEditAccount={(acc) => {
              setEditingAccount(acc);
              setIsAddAccountOpen(true);
            }}
            onDeleteAccount={handleDeleteAccount}
            onMarkAccountPaid={handleMarkAccountPaid}
          />
        )}

        {activeTab === 'transactions' && (
          <Transactions
            transactions={transactions}
            categories={categories}
            accounts={accounts}
            tags={tags}
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
            onPatchTransaction={handlePatchTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenAddEntry={() => setIsAddEntryOpen(true)}
          />
        )}

        {activeTab === 'assets' && (
          <Assets
            assetsList={assetsList}
            settings={settings}
            onSaveAsset={handleSaveAsset}
            onPatchAsset={handlePatchAsset}
            onDeleteAsset={handleDeleteAsset}
          />
        )}

        {activeTab === 'recurring' && (
          <Recurring
            transactions={transactions}
            settings={settings}
            onSavePreferences={handleSavePreferences}
          />
        )}

        {activeTab === 'subscriptions' && (
          <Subscriptions
            transactions={transactions}
            settings={settings}
            onSavePreferences={handleSavePreferences}
          />
        )}

        {activeTab === 'budgets' && (
          <Budgets
            transactions={transactions}
            categories={categories}
            settings={settings}
            onSavePreferences={handleSavePreferences}
          />
        )}

        {activeTab === 'goals' && (
          <Goals
            settings={settings}
            onSavePreferences={handleSavePreferences}
          />
        )}

        {activeTab === 'bank-connectors' && (
          <BankConnectors onRefreshData={fetchState} />
        )}

        {activeTab === 'documents' && (
          <Documents
            documents={documents}
            settings={settings}
            onUploadDocuments={handleUploadDocuments}
            onDeleteDocument={handleDeleteDocument}
            onOpenDriveSync={() => setIsDriveSyncOpen(true)}
            onOpenBankConnectors={() => setIsBankConnectorsOpen(true)}
          />
        )}

        {activeTab === 'rules' && (
          <RulesAndTags
            rules={settings.rules || []}
            tags={tags}
            transactions={transactions}
            categories={categories}
            onSavePreferences={async (newPrefs) => {
              await handleSavePreferences(newPrefs);
              await fetch('/api/rules/apply', { method: 'POST' });
              await fetchState();
            }}
            onApplyRulesNow={async () => {
              const res = await fetch('/api/rules/apply', { method: 'POST' });
              const data = await res.json();
              await fetchState();
              return data;
            }}
            onPatchTransaction={handlePatchTransaction}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            settings={settings}
            categories={categories}
            accounts={accounts}
            tags={tags}
            onSavePreferences={handleSavePreferences}
            onWipeData={handleWipeData}
          />
        )}
      </main>
      <AddAccountModal
        isOpen={isAddAccountOpen}
        initialData={editingAccount}
        onClose={() => {
          setIsAddAccountOpen(false);
          setEditingAccount(null);
        }}
        onSaveAccount={handleSaveAccount}
      />


      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Global Modals */}
      <AddEntryModal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        onSave={handleSaveTransaction}
        categories={categories}
        accounts={accounts}
        tags={tags}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportTransactions={handleBatchImportTransactions}
        onUploadDocuments={handleUploadDocuments}
        accounts={accounts}
      />

      <BankConnectorsModal
        isOpen={isBankConnectorsOpen}
        onClose={() => setIsBankConnectorsOpen(false)}
        onRefreshData={fetchState}
      />

      <DriveSyncModal
        isOpen={isDriveSyncOpen}
        onClose={() => setIsDriveSyncOpen(false)}
        syncInfo={settings.driveSyncInfo}
        onTriggerManualSync={handleTriggerManualDriveSync}
      />

      {/* Floating Gemini AI Financial Assistant Chat Icon & Window */}
      <AIChatModal transactionsCount={appState.transactions.length} />
    </div>
  );
}
