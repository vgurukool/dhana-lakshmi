import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
const storageBucketDir = path.join(__dirname, '..', 'storage', 'bucket');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(storageBucketDir)) {
  fs.mkdirSync(storageBucketDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ledgerly.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      merchant TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Needs review',
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      account TEXT NOT NULL DEFAULT 'Imported account',
      tags TEXT NOT NULL DEFAULT '[]',
      receipt INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL,
      fingerprint TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      name TEXT PRIMARY KEY,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      whenText TEXT NOT NULL,
      thenText TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      size INTEGER NOT NULL,
      objectKey TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      value REAL NOT NULL,
      hideFromDashboard INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
  `);

  try {
    db.exec(`ALTER TABLE assets ADD COLUMN currency TEXT DEFAULT 'USD'`);
  } catch {}

  initSettingsIfMissing();
}

function initSettingsIfMissing() {
  const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');

  const defaultCategories = [
    'Housing', 'Groceries', 'Shopping', 'Dining', 'Transportation',
    'Utilities', 'Subscriptions', 'Insurance', 'Health', 'Entertainment',
    'Credit Card Payment', 'Cash Withdrawal', 'Transfer', 'Income', 'Needs review', 'Other'
  ];
  const defaultAccounts = ['Main Checking', 'Everyday Visa', 'Rewards Card', 'Cash'];

  const setSetting = (key, val) => {
    const existing = getSetting.get(key);
    if (!existing) {
      db.prepare('INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, ?)').run(
        key,
        JSON.stringify(val),
        new Date().toISOString()
      );
    }
  };

  setSetting('categories', defaultCategories);
  setSetting('accounts', defaultAccounts);
  setSetting('goals', []);
  setSetting('budgets', []);
  setSetting('subscriptions', []);
  setSetting('recurring', []);
  setSetting('dismissedPatterns', []);
  setSetting('selectedPeriod', 'all-time');
  setSetting('assets', 0);
  setSetting('liabilities', 0);
  setSetting('netWorthConfigured', false);
  setSetting('driveSyncInfo', {
    folderName: 'Ledgerly Financial Inbox',
    folderId: 'folder-ledgerly-inbox-12345',
    folderUrl: 'https://drive.google.com/drive/folders/ledgerly-inbox',
    lastSyncedAt: null,
    schedule: { time: '08:00', timezone: 'CDT', cadence: 'daily' },
    status: 'idle',
    lastCounts: { imported: 0, duplicate: 0, filesStored: 0, review: 0, errors: 0 }
  });
  setSetting('processedFileIds', []);

  // Ensure Credit Card Payment, Cash Withdrawal & Transfer are always in categories list
  const catRow = getSetting.get('categories');
  if (catRow) {
    try {
      let cats = JSON.parse(catRow.value);
      let changed = false;
      if (!cats.includes('Credit Card Payment')) {
        cats.splice(cats.length - 2, 0, 'Credit Card Payment');
        changed = true;
      }
      if (!cats.includes('Cash Withdrawal')) {
        cats.splice(cats.length - 2, 0, 'Cash Withdrawal');
        changed = true;
      }
      if (!cats.includes('Transfer')) {
        cats.splice(cats.length - 2, 0, 'Transfer');
        changed = true;
      }
      if (changed) {
        db.prepare('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)').run(
          'categories',
          JSON.stringify(cats),
          new Date().toISOString()
        );
      }
    } catch {}
  }
  setSetting('driveResetAt', null);
  setSetting('freshStart', true);
}

export function getState() {
  const transactions = db.prepare('SELECT * FROM transactions ORDER BY date DESC, createdAt DESC LIMIT 5000').all();
  const parsedTransactions = transactions.map(t => ({
    ...t,
    tags: JSON.parse(t.tags || '[]'),
    receipt: Boolean(t.receipt)
  }));

  const tagsRows = db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
  const rulesRows = db.prepare('SELECT * FROM rules ORDER BY createdAt DESC').all();
  const rules = rulesRows.map(r => ({ ...r, enabled: Boolean(r.enabled) }));

  const settingsRows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  for (const row of settingsRows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  const documents = db.prepare('SELECT * FROM documents ORDER BY createdAt DESC LIMIT 100').all();
  const assetsList = getAssets();

  return {
    transactions: parsedTransactions,
    tags: tagsRows,
    rules,
    settings,
    documents,
    assetsList
  };
}

export function syncAssetsSetting() {
  const row = db.prepare('SELECT SUM(value) as total FROM assets WHERE hideFromDashboard = 0').get();
  const visibleSum = row && row.total ? Number(row.total) : 0;
  updatePreferences({
    assets: visibleSum,
    netWorthConfigured: true
  });
}

export function getAssets() {
  const rows = db.prepare('SELECT * FROM assets ORDER BY createdAt DESC').all();
  return rows.map(r => ({
    ...r,
    hideFromDashboard: Boolean(r.hideFromDashboard)
  }));
}

export function saveAsset(asset) {
  const id = asset.id || `asset_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const name = String(asset.name || 'Untitled Asset').trim();
  const type = String(asset.type || 'Cash / Bank Account').trim();
  const currency = String(asset.currency || 'USD').trim();
  const value = parseFloat(asset.value) || 0;
  const hideFromDashboard = asset.hideFromDashboard ? 1 : 0;
  const createdAt = asset.createdAt || new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO assets (id, name, type, currency, value, hideFromDashboard, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      currency = excluded.currency,
      value = excluded.value,
      hideFromDashboard = excluded.hideFromDashboard
  `);
  stmt.run(id, name, type, currency, value, hideFromDashboard, createdAt);

  syncAssetsSetting();

  const updated = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  return {
    ...updated,
    hideFromDashboard: Boolean(updated.hideFromDashboard)
  };
}

export function patchAsset(id, updates) {
  const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  if (!existing) return null;

  const newName = updates.name !== undefined ? String(updates.name).trim() : existing.name;
  const newType = updates.type !== undefined ? String(updates.type).trim() : existing.type;
  const newCurrency = updates.currency !== undefined ? String(updates.currency).trim() : (existing.currency || 'USD');
  const newValue = updates.value !== undefined ? parseFloat(updates.value) : existing.value;
  const newHide = updates.hideFromDashboard !== undefined ? (updates.hideFromDashboard ? 1 : 0) : existing.hideFromDashboard;

  db.prepare('UPDATE assets SET name = ?, type = ?, currency = ?, value = ?, hideFromDashboard = ? WHERE id = ?').run(
    newName,
    newType,
    newCurrency,
    newValue,
    newHide,
    id
  );

  syncAssetsSetting();

  const updated = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  return {
    ...updated,
    hideFromDashboard: Boolean(updated.hideFromDashboard)
  };
}

export function deleteAsset(id) {
  const result = db.prepare('DELETE FROM assets WHERE id = ?').run(id);
  syncAssetsSetting();
  return result.changes > 0;
}

export function evaluateRuleMatch(merchantText, whenText, operator = 'OR') {
  if (!merchantText || !whenText) return false;
  const lowerMerch = String(merchantText).toLowerCase();
  const rawWhen = String(whenText).trim();
  const opUpper = String(operator || 'OR').toUpperCase();

  if (opUpper === 'AND') {
    const terms = rawWhen.split(/,|\bAND\b/i).map(t => t.trim().toLowerCase()).filter(Boolean);
    return terms.length > 0 && terms.every(term => lowerMerch.includes(term));
  } else {
    // Default OR operator logic
    const terms = rawWhen.split(/,|\bOR\b/i).map(t => t.trim().toLowerCase()).filter(Boolean);
    return terms.length > 0 && terms.some(term => lowerMerch.includes(term));
  }
}

export function computeFingerprint(date, merchant, amount, account) {
  const cleanMerchant = (merchant || '').trim().toLowerCase();
  const cleanAccount = (account || '').trim().toLowerCase();
  const formattedAmount = Number(amount).toFixed(2);
  return `${date}|${cleanMerchant}|${formattedAmount}|${cleanAccount}`;
}

export function saveTransaction(t) {
  const id = t.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const date = t.date;
  const merchant = (t.merchant || '').trim();
  const amount = Math.abs(Number(t.amount));
  const type = t.type === 'income' ? 'income' : 'expense';
  const account = (t.account || 'Imported account').trim();
  const category = (t.category || 'Needs review').trim();
  const rawTags = Array.isArray(t.tags) ? t.tags : [];
  const normalizedTags = Array.from(new Set(rawTags.map(x => String(x).trim()).filter(Boolean)));
  const receipt = t.receipt ? 1 : 0;
  const source = t.source || 'manual';
  const createdAt = t.createdAt || new Date().toISOString();

  const fingerprint = computeFingerprint(date, merchant, amount, account);

  // Check duplicate fingerprint
  const existing = db.prepare('SELECT id FROM transactions WHERE fingerprint = ?').get(fingerprint);
  if (existing) {
    return { duplicate: true, existingId: existing.id };
  }

  // Check matching rules after duplicate check from settings table
  let finalCategory = category;
  let finalTags = [...normalizedTags];
  const settingsRulesRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('rules');
  if (settingsRulesRow && settingsRulesRow.value) {
    try {
      const userRules = JSON.parse(settingsRulesRow.value).filter(r => r.enabled !== false);
      for (const rule of userRules) {
        if (rule.whenText && evaluateRuleMatch(merchant, rule.whenText, rule.operator)) {
          if (rule.thenText) {
            if (rule.thenText.startsWith('Category:')) {
              finalCategory = rule.thenText.replace('Category:', '').trim();
            } else if (rule.thenText.startsWith('Tag:')) {
              const tagToSet = rule.thenText.replace('Tag:', '').trim();
              if (!finalTags.includes(tagToSet)) finalTags.push(tagToSet);
            } else {
              finalCategory = rule.thenText.trim();
            }
          }
        }
      }
    } catch {}
  }

  const stmt = db.prepare(`
    INSERT INTO transactions (id, date, merchant, category, amount, type, account, tags, receipt, source, fingerprint, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, date, merchant, finalCategory, amount, type, account, JSON.stringify(finalTags), receipt, source, fingerprint, createdAt);

  // Ensure tags exist in tags table
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, createdAt) VALUES (?, ?)');
  for (const tag of finalTags) {
    insertTag.run(tag, new Date().toISOString());
  }

  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  return {
    duplicate: false,
    transaction: {
      ...row,
      tags: JSON.parse(row.tags),
      receipt: Boolean(row.receipt)
    }
  };
}

export function patchTransaction(id, updates) {
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  if (!row) return null;

  let newCategory = row.category;
  let newTags = JSON.parse(row.tags);

  if (updates.category !== undefined) {
    newCategory = updates.category.trim();
  }

  if (updates.tags !== undefined) {
    const raw = Array.isArray(updates.tags) ? updates.tags : [];
    newTags = Array.from(new Set(raw.map(x => String(x).trim()).filter(Boolean)));
  }

  db.prepare('UPDATE transactions SET category = ?, tags = ? WHERE id = ?').run(
    newCategory,
    JSON.stringify(newTags),
    id
  );

  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, createdAt) VALUES (?, ?)');
  for (const tag of newTags) {
    insertTag.run(tag, new Date().toISOString());
  }

  const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  return {
    ...updated,
    tags: JSON.parse(updated.tags),
    receipt: Boolean(updated.receipt)
  };
}

export function deleteTransaction(id) {
  const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return result.changes > 0;
}

export function applyRulesToAllTransactions() {
  const settingsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('rules');
  if (!settingsRow || !settingsRow.value) return 0;

  let rules = [];
  try {
    rules = JSON.parse(settingsRow.value).filter(r => r.enabled !== false);
  } catch {
    return 0;
  }

  if (rules.length === 0) return 0;

  const txs = db.prepare('SELECT id, merchant, category, tags FROM transactions').all();
  let updatedCount = 0;

  for (const tx of txs) {
    let newCategory = tx.category;
    let changed = false;

    for (const r of rules) {
      if (r.whenText && evaluateRuleMatch(tx.merchant, r.whenText, r.operator)) {
        if (r.thenText) {
          let targetCat = r.thenText;
          if (r.thenText.startsWith('Category:')) {
            targetCat = r.thenText.replace('Category:', '').trim();
          }
          if (targetCat && newCategory !== targetCat) {
            newCategory = targetCat;
            changed = true;
          }
        }
      }
    }

    if (changed) {
      db.prepare('UPDATE transactions SET category = ? WHERE id = ?').run(newCategory, tx.id);
      updatedCount++;
    }
  }

  return updatedCount;
}

export function deduplicateTransactionsInDb() {
  const rows = db.prepare('SELECT id, fingerprint, createdAt FROM transactions ORDER BY createdAt ASC').all();
  const seenFingerprints = new Set();
  let deletedCount = 0;

  for (const r of rows) {
    if (seenFingerprints.has(r.fingerprint)) {
      db.prepare('DELETE FROM transactions WHERE id = ?').run(r.id);
      deletedCount++;
    } else {
      seenFingerprints.add(r.fingerprint);
    }
  }

  // Perform Fuzzy Deduplication (handles PDF vs CSV merchant name variations)
  function cleanName(m) {
    return String(m || '')
      .toLowerCase()
      .replace(/\b(houston|tx|bellevue|wa|card|auto|pay|mobile|www|com|inc|llc)\b/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function isSimilarMerchant(m1, m2) {
    const c1 = cleanName(m1);
    const c2 = cleanName(m2);
    if (!c1 || !c2) return false;
    return c1.includes(c2) || c2.includes(c1) || c1 === c2;
  }

  const txs = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all();
  const duplicatesToDelete = new Set();

  for (let i = 0; i < txs.length; i++) {
    const t1 = txs[i];
    if (duplicatesToDelete.has(t1.id)) continue;

    for (let j = i + 1; j < txs.length; j++) {
      const t2 = txs[j];
      if (duplicatesToDelete.has(t2.id)) continue;

      const sameAccount = t1.account === t2.account;
      const sameAmount = Math.abs(t1.amount - t2.amount) < 0.01;
      
      const d1 = new Date(t1.date).getTime();
      const d2 = new Date(t2.date).getTime();
      const dateDiffDays = Math.abs(d1 - d2) / (1000 * 3600 * 24);

      if (sameAccount && sameAmount && dateDiffDays <= 3) {
        if (isSimilarMerchant(t1.merchant, t2.merchant)) {
          if (t1.category === 'Needs review' && t2.category !== 'Needs review') {
            db.prepare('UPDATE transactions SET category = ? WHERE id = ?').run(t2.category, t1.id);
          }
          duplicatesToDelete.add(t2.id);
        }
      }
    }
  }

  if (duplicatesToDelete.size > 0) {
    const ids = Array.from(duplicatesToDelete);
    const placeholders = ids.map(() => '?').join(',');
    const res = db.prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`).run(...ids);
    deletedCount += res.changes;
  }

  return deletedCount;
}

export function updatePreferences(prefs) {
  const setSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)');
  const now = new Date().toISOString();

  for (const [key, val] of Object.entries(prefs)) {
    if (val !== undefined) {
      setSetting.run(key, JSON.stringify(val), now);
    }
  }

  return getState().settings;
}

export function saveDocumentRecord(doc) {
  const stmt = db.prepare(`
    INSERT INTO documents (id, filename, mimeType, size, objectKey, status, source, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(doc.id, doc.filename, doc.mimeType, doc.size, doc.objectKey, doc.status, doc.source, doc.createdAt);
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id);
}

export function deleteDocumentRecord(id) {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  if (!row) return false;

  if (row.objectKey) {
    const fullPath = path.join(storageBucketDir, row.objectKey);
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch {}
    }
  }

  // Delete document record
  const result = db.prepare('DELETE FROM documents WHERE id = ?').run(id);

  // Purge document transactions created by statement imports
  db.prepare("DELETE FROM transactions WHERE source = 'document' OR source = 'google-drive' OR source = ?").run(id);

  return result.changes > 0;
}

export function storeR2Object(objectKey, buffer) {
  const fullPath = path.join(storageBucketDir, objectKey);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, buffer);
}

export function wipeAllData() {
  db.exec(`
    DELETE FROM transactions;
    DELETE FROM tags;
    DELETE FROM rules;
    DELETE FROM settings;
    DELETE FROM documents;
  `);

  // Clear physical files in storage/bucket
  if (fs.existsSync(storageBucketDir)) {
    fs.rmSync(storageBucketDir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(storageBucketDir, 'uploads'), { recursive: true });
  fs.mkdirSync(path.join(storageBucketDir, 'drive-inbox'), { recursive: true });

  initSettingsIfMissing();

  const resetIso = new Date().toISOString();
  db.prepare('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)').run(
    'driveResetAt',
    JSON.stringify(resetIso),
    resetIso
  );
  db.prepare('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)').run(
    'freshStart',
    JSON.stringify(true),
    resetIso
  );

  return getState();
}

export { db, storageBucketDir };
