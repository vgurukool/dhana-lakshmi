import {
  initDb,
  getState,
  saveTransaction,
  patchTransaction,
  deleteTransaction,
  updatePreferences,
  saveDocumentRecord,
  storeR2Object,
  wipeAllData
} from './server/db.js';

async function runDirectVerification() {
  console.log('=== STARTING DIRECT IN-MEMORY DB & ENGINE VERIFICATION ===');

  // Step 1: Wipe DB to ensure clean initial state
  console.log('1. Wiping database...');
  wipeAllData();

  // Step 2: Test empty state contract
  console.log('2. Verifying Empty-Start Contract...');
  const state = getState();
  console.log('Transactions:', state.transactions.length);
  console.log('Documents:', state.documents.length);
  console.log('Selected period:', state.settings.selectedPeriod);
  console.log('Net worth configured:', state.settings.netWorthConfigured);

  if (state.transactions.length !== 0) throw new Error('Transactions must be empty!');
  if (state.documents.length !== 0) throw new Error('Documents must be empty!');
  if (state.settings.selectedPeriod !== 'all-time') throw new Error('Default period must be all-time!');
  if (state.settings.netWorthConfigured !== false) throw new Error('Net worth must be unconfigured!');

  // Step 3: Test Add Transaction & Fingerprint Duplicate Detection
  console.log('\n3. Verifying Add Transaction & Fingerprint Duplicate Detection...');
  const tx1 = {
    date: '2026-08-20',
    merchant: 'Target Superstore',
    amount: 54.20,
    type: 'expense',
    category: 'Shopping',
    account: 'Main Checking',
    tags: ['receipt', 'clothing']
  };

  const res1 = saveTransaction(tx1);
  console.log('Insert 1 duplicate:', res1.duplicate, 'ID:', res1.transaction?.id);
  if (res1.duplicate) throw new Error('First transaction insert failed!');

  const res2 = saveTransaction(tx1);
  console.log('Insert 2 duplicate:', res2.duplicate);
  if (!res2.duplicate) throw new Error('Fingerprint duplicate detection failed!');

  // Step 4: Test Inline Category Edit
  console.log('\n4. Verifying Inline Category Editing...');
  const patched = patchTransaction(res1.transaction.id, { category: 'Other' });
  console.log('Patched category:', patched.category);
  if (patched.category !== 'Other') throw new Error('Inline category edit failed!');

  // Step 5: Test Preferences Update (Net Worth Setup)
  console.log('\n5. Verifying Preferences & Net Worth Setup...');
  const updatedSettings = updatePreferences({
    assets: 40000,
    liabilities: 15000,
    netWorthConfigured: true
  });
  console.log('Net worth configured:', updatedSettings.netWorthConfigured);
  console.log('Assets:', updatedSettings.assets);
  if (updatedSettings.netWorthConfigured !== true) throw new Error('Net worth update failed!');

  // Step 6: Test Data Wipe
  console.log('\n6. Verifying Complete Data Wipe & driveResetAt...');
  const wiped = wipeAllData();
  console.log('Wiped transactions length:', wiped.transactions.length);
  console.log('Wiped net worth configured:', wiped.settings.netWorthConfigured);
  console.log('Wiped driveResetAt timestamp:', wiped.settings.driveResetAt);

  if (wiped.transactions.length !== 0) throw new Error('Wipe failed to clear transactions!');
  if (!wiped.settings.driveResetAt) throw new Error('Wipe failed to set driveResetAt!');

  console.log('\n=== ALL 100% SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runDirectVerification().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
