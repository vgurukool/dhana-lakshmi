import http from 'http';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING AUTOMATED API VERIFICATION ===');

  // Pre-wipe database to ensure clean test state
  await request('DELETE', '/api/state', { confirmation: 'DELETE ALL LEDGERLY DATA' });

  // Test 1: Initial state
  console.log('1. Testing GET /api/state...');
  const stateRes = await request('GET', '/api/state');
  console.log('Status:', stateRes.status);
  console.log('Transactions length:', stateRes.body.transactions.length);
  console.log('Documents length:', stateRes.body.documents.length);
  console.log('Selected period:', stateRes.body.settings.selectedPeriod);
  console.log('Net worth configured:', stateRes.body.settings.netWorthConfigured);

  if (stateRes.body.transactions.length !== 0) throw new Error('Initial transactions must be empty!');
  if (stateRes.body.documents.length !== 0) throw new Error('Initial documents must be empty!');

  // Test 2: Add Transaction & Duplicate Detection
  console.log('\n2. Testing POST /api/transactions...');
  const txPayload = {
    date: '2026-08-20',
    merchant: 'Test Supermarket',
    amount: 45.50,
    type: 'expense',
    category: 'Groceries',
    account: 'Main Checking',
    tags: ['test', 'food']
  };
  const addRes1 = await request('POST', '/api/transactions', txPayload);
  console.log('Inserted count:', addRes1.body.insertedCount);
  console.log('Duplicate count:', addRes1.body.duplicateCount);

  console.log('Testing Duplicate insertion...');
  const addRes2 = await request('POST', '/api/transactions', txPayload);
  console.log('Inserted count:', addRes2.body.insertedCount);
  console.log('Duplicate count:', addRes2.body.duplicateCount);
  if (addRes2.body.duplicateCount !== 1) throw new Error('Duplicate fingerprint detection failed!');

  // Test 3: Inline Patch Category
  console.log('\n3. Testing PATCH /api/transactions/:id...');
  const insertedTxId = addRes1.body.inserted[0].id;
  const patchRes = await request('PATCH', `/api/transactions/${insertedTxId}`, { category: 'Dining' });
  console.log('Updated category:', patchRes.body.category);
  if (patchRes.body.category !== 'Dining') throw new Error('Inline category update failed!');

  // Test 4: Preferences update
  console.log('\n4. Testing PUT /api/preferences...');
  const prefRes = await request('PUT', '/api/preferences', { assets: 25000, liabilities: 5000, netWorthConfigured: true });
  console.log('Net worth configured setting:', prefRes.body.netWorthConfigured);
  console.log('Assets setting:', prefRes.body.assets);

  // Test 5: Drive Sync GET and POST
  console.log('\n5. Testing GET & POST /api/drive-sync...');
  const syncGetRes = await request('GET', '/api/drive-sync');
  console.log('Drive folder name:', syncGetRes.body.folderName);
  console.log('Schedule:', syncGetRes.body.schedule);

  const syncPostRes = await request('POST', '/api/drive-sync', {
    transactions: [
      { date: '2026-08-22', merchant: 'Drive Utility Co', amount: 120.00, type: 'expense', account: 'Drive import' }
    ]
  });
  console.log('Sync status:', syncPostRes.body.status);
  console.log('Sync imported count:', syncPostRes.body.importedCount);

  // Test 6: Complete Data Wipe
  console.log('\n6. Testing DELETE /api/state Data Wipe...');
  const wipeRes = await request('DELETE', '/api/state', { confirmation: 'DELETE ALL LEDGERLY DATA' });
  console.log('Wipe status code:', wipeRes.status);
  console.log('Wipe response body:', wipeRes.body);

  if (wipeRes.status !== 200) throw new Error('Wipe returned non-200 status: ' + JSON.stringify(wipeRes.body));

  console.log('Drive reset timestamp:', wipeRes.body.state.settings.driveResetAt);

  // Verify wiped state
  const finalStateRes = await request('GET', '/api/state');
  console.log('\nFinal state verify - transactions:', finalStateRes.body.transactions.length);
  console.log('Final state verify - net worth configured:', finalStateRes.body.settings.netWorthConfigured);

  if (finalStateRes.body.transactions.length !== 0) throw new Error('Wipe failed to clear transactions!');
  if (finalStateRes.body.settings.netWorthConfigured !== false) throw new Error('Wipe failed to reset net worth!');

  console.log('\n=== ALL API VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
