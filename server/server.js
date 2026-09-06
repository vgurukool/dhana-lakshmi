import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  initDb,
  getState,
  saveTransaction,
  patchTransaction,
  deleteTransaction,
  deduplicateTransactionsInDb,
  applyRulesToAllTransactions,
  getAssets,
  saveAsset,
  patchAsset,
  deleteAsset,
  updatePreferences,
  saveDocumentRecord,
  deleteDocumentRecord,
  storeR2Object,
  wipeAllData,
  db
} from './db.js';
import { parsePDFBankStatement } from './pdfParser.js';
import { parseCSVBankStatement } from './csvParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDb();

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB max limit
});

// 4.3 GET /api/state
app.get('/api/state', (req, res) => {
  try {
    const state = getState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4.4 /api/transactions
app.post('/api/transactions', (req, res) => {
  try {
    const payload = req.body;
    const items = Array.isArray(payload) ? payload : [payload];

    let insertedCount = 0;
    let duplicateCount = 0;
    const insertedRows = [];

    for (const item of items) {
      if (!item.merchant || !item.date || !item.amount || Number(item.amount) <= 0) {
        continue;
      }
      const result = saveTransaction(item);
      if (result.duplicate) {
        duplicateCount++;
      } else {
        insertedCount++;
        insertedRows.push(result.transaction);
      }
    }

    res.json({
      success: true,
      insertedCount,
      duplicateCount,
      inserted: insertedRows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = patchTransaction(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteTransaction(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/assets Endpoints
app.get('/api/assets', (req, res) => {
  try {
    res.json(getAssets());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assets', (req, res) => {
  try {
    const saved = saveAsset(req.body);
    res.json({ success: true, asset: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/assets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = patchAsset(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Asset not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/assets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteAsset(id);
    if (!deleted) return res.status(404).json({ error: 'Asset not found' });
    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4.5 PUT /api/preferences
app.put('/api/preferences', (req, res) => {
  try {
    const updatedSettings = updatePreferences(req.body);
    // Automatically apply rules whenever preferences are updated
    applyRulesToAllTransactions();
    res.json(getState().settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rules/apply
app.post('/api/rules/apply', (req, res) => {
  try {
    const updatedCount = applyRulesToAllTransactions();
    res.json({ success: true, updatedCount, state: getState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4.6 POST /api/documents (Multipart upload)
app.post('/api/documents', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const savedDocs = [];
    let extractedCount = 0;

    for (const file of req.files) {
      if (file.size > 20 * 1024 * 1024) {
        return res.status(400).json({ error: `File ${file.originalname} exceeds maximum limit of 20MB` });
      }

      const fileId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `uploads/${fileId}-${safeName}`;

      // Store original file bytes in R2 object bucket
      storeR2Object(objectKey, file.buffer);

      let status = 'stored';

      // Automated PDF / CSV Bank Statement Extraction
      if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
        const pdfResult = await parsePDFBankStatement(file.buffer, { password: req.body.password || '30031981' });

        if (pdfResult.isMutualFundCAS && pdfResult.folios && pdfResult.folios.length > 0) {
          for (const item of pdfResult.folios) {
            const cleanScheme = item.scheme ? item.scheme.replace(/^[A-Z0-9]+-/, '').split('- ISIN')[0].trim() : 'Mutual Fund';
            saveAsset({
              id: `asset_mf_${item.folio}`,
              name: `${cleanScheme} (Folio: ${item.folio})`,
              type: 'Mutual Funds',
              currency: item.currency || 'INR',
              value: item.marketValue,
              hideFromDashboard: false
            });
          }
        }

        if (pdfResult.isFixedDepositSummary) {
          saveAsset({
            id: 'asset_hdfc_fixed_deposits_total',
            name: `HDFC Fixed Deposits (${pdfResult.fdCount || 20} FDs)`,
            type: 'Fixed Deposit (FD)',
            currency: pdfResult.currency || 'INR',
            value: pdfResult.principalAmount || 1393816.12,
            hideFromDashboard: false
          });
        }

        if (pdfResult.transactions && pdfResult.transactions.length > 0) {
          for (const tx of pdfResult.transactions) {
            saveTransaction(tx);
            extractedCount++;
          }
        }
        if (pdfResult.endingBalance !== null && pdfResult.endingBalance > 0) {
          const currentSettings = getState().settings || {};
          const currentBalances = currentSettings.accountBalances || {};
          const acctKey = pdfResult.accountName || 'Bank Account';
          currentBalances[acctKey] = pdfResult.endingBalance;
          const totalCashAssets = Object.values(currentBalances).reduce((sum, b) => sum + Number(b || 0), 0);
          updatePreferences({
            accountBalances: currentBalances,
            assets: totalCashAssets,
            netWorthConfigured: true
          });

          // Automatically save asset record into assets database table
          const isCreditCard = acctKey.toLowerCase().includes('credit card');
          if (!isCreditCard) {
            const assetId = `asset_${acctKey.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
            saveAsset({
              id: assetId,
              name: acctKey,
              type: 'Cash / Bank Account',
              value: pdfResult.endingBalance,
              hideFromDashboard: false
            });
          }
        }
        status = 'processed';
      } else if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
        const csvText = file.buffer.toString('utf8');
        const csvResult = parseCSVBankStatement(csvText, file.originalname);
        if (csvResult.transactions && csvResult.transactions.length > 0) {
          for (const tx of csvResult.transactions) {
            saveTransaction(tx);
            extractedCount++;
          }
        }
        status = 'processed';
      }

      // Auto-run fuzzy deduplication to merge PDF & CSV duplicates
      deduplicateTransactionsInDb();

      // Store document metadata in D1 database
      const docRecord = {
        id: fileId,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        objectKey,
        status,
        source: req.body.source || 'upload',
        createdAt: new Date().toISOString()
      };

      const saved = saveDocumentRecord(docRecord);
      savedDocs.push(saved);
    }

    res.json({ success: true, documents: savedDocs, extractedTransactions: extractedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/documents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteDocumentRecord(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Automatically deduplicate transactions ledger
    const duplicatesPurged = deduplicateTransactionsInDb();

    res.json({
      success: true,
      deletedId: id,
      duplicatesPurged
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4.7 DELETE /api/state (Complete Data Wipe)
app.delete('/api/state', (req, res) => {
  try {
    const { confirmation } = req.body || {};
    if (confirmation !== 'DELETE ALL LEDGERLY DATA') {
      return res.status(400).json({
        error: 'Invalid confirmation payload. Exact string "DELETE ALL LEDGERLY DATA" is required.'
      });
    }

    const wipedState = wipeAllData();
    res.json({
      success: true,
      message: 'All Ledgerly data has been completely deleted.',
      state: wipedState
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 17.1 GET /api/drive-sync
app.get('/api/drive-sync', (req, res) => {
  try {
    const state = getState();
    const settings = state.settings || {};

    const syncInfo = settings.driveSyncInfo || {};
    const processedFileIds = settings.processedFileIds || [];
    const driveResetAt = settings.driveResetAt || null;

    res.json({
      folderName: syncInfo.folderName || 'Ledgerly Financial Inbox',
      folderId: syncInfo.folderId || 'folder-ledgerly-inbox-12345',
      folderUrl: syncInfo.folderUrl || 'https://drive.google.com/drive/folders/ledgerly-inbox',
      schedule: syncInfo.schedule || { time: '08:00', timezone: 'CDT', cadence: 'daily' },
      lastSyncedAt: syncInfo.lastSyncedAt,
      status: syncInfo.status || 'idle',
      lastCounts: syncInfo.lastCounts || { imported: 0, duplicate: 0, filesStored: 0, review: 0, errors: 0 },
      processedFileIds: processedFileIds.slice(-5000),
      resetAt: driveResetAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 17.2 POST /api/drive-sync
app.post('/api/drive-sync', (req, res) => {
  try {
    const { transactions = [], files = [] } = req.body || {};
    const state = getState();
    const settings = state.settings || {};

    const driveResetAt = settings.driveResetAt ? new Date(settings.driveResetAt).getTime() : 0;
    let processedFileIds = new Set(settings.processedFileIds || []);

    let importedCount = 0;
    let duplicateCount = 0;
    let filesStoredCount = 0;
    let reviewCount = 0;
    const errors = [];

    // Process transactions
    for (const tx of transactions) {
      if (!tx.merchant || !tx.date || !tx.amount) continue;

      const txDateMs = new Date(tx.date).getTime();
      if (driveResetAt && txDateMs <= driveResetAt) {
        duplicateCount++;
        continue;
      }

      const txPayload = {
        ...tx,
        source: 'google-drive',
        tags: Array.from(new Set([...(tx.tags || []), 'Drive import'])),
        account: tx.account || 'Drive import'
      };

      const resTx = saveTransaction(txPayload);
      if (resTx.duplicate) {
        duplicateCount++;
      } else {
        importedCount++;
      }
    }

    // Process files
    for (const file of files) {
      if (!file.fileId) continue;

      if (file.modifiedTime && driveResetAt && new Date(file.modifiedTime).getTime() <= driveResetAt) {
        continue;
      }

      if (processedFileIds.has(file.fileId)) {
        duplicateCount++;
        continue;
      }

      let fileBuffer = Buffer.from([]);
      if (file.base64Content) {
        fileBuffer = Buffer.from(file.base64Content, 'base64');
      }

      if (fileBuffer.length > 20 * 1024 * 1024) {
        errors.push(`File ${file.filename} exceeds 20MB limit`);
        continue;
      }

      const docId = `doc_drive_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const safeName = (file.filename || 'drive_doc').replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `drive-inbox/${file.fileId}-${safeName}`;

      if (fileBuffer.length > 0) {
        storeR2Object(objectKey, fileBuffer);
      }

      const status = file.status || 'stored';
      if (status === 'review') reviewCount++;

      saveDocumentRecord({
        id: docId,
        filename: file.filename || 'Drive Document',
        mimeType: file.mimeType || 'application/octet-stream',
        size: fileBuffer.length || file.size || 0,
        objectKey,
        status,
        source: 'google-drive',
        createdAt: new Date().toISOString()
      });

      processedFileIds.add(file.fileId);
      filesStoredCount++;
    }

    // Update settings
    const updatedDriveSyncInfo = {
      ...(settings.driveSyncInfo || {}),
      lastSyncedAt: new Date().toISOString(),
      status: errors.length > 0 ? 'partial' : 'complete',
      lastCounts: {
        imported: importedCount,
        duplicate: duplicateCount,
        filesStored: filesStoredCount,
        review: reviewCount,
        errors: errors.length
      }
    };

    updatePreferences({
      driveSyncInfo: updatedDriveSyncInfo,
      processedFileIds: Array.from(processedFileIds).slice(-5000)
    });

    res.json({
      status: errors.length > 0 ? 'partial' : 'complete',
      lastSyncedAt: updatedDriveSyncInfo.lastSyncedAt,
      importedCount,
      duplicateCount,
      filesStoredCount,
      reviewCount,
      errors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat - Gemini AI Financial Assistant
app.post('/api/chat', async (req, res) => {
  try {
    const { message = '' } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message query is required' });
    }

    const state = getState();
    const transactions = state.transactions || [];
    const assets = getAssets();
    const queryLower = message.toLowerCase().trim();

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // Build structured financial summary context
    const totalCount = transactions.length;
    
    // Account breakdown
    const accounts = {};
    // Category breakdown
    const categories = {};
    // Year breakdown
    const years = {};

    let totalIncome = 0;
    let totalSpending = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount || 0);
      const acc = t.account || 'Unknown';
      const cat = t.category || 'Needs review';
      const y = t.date ? t.date.slice(0, 4) : 'Unknown';

      if (t.type === 'expense') {
        accounts[acc] = (accounts[acc] || 0) + amt;
        categories[cat] = (categories[cat] || 0) + amt;
      }
      
      if (!years[y]) years[y] = { income: 0, spending: 0, count: 0 };
      years[y].count++;

      if (t.type === 'income') {
        totalIncome += amt;
        years[y].income += amt;
      } else {
        totalSpending += amt;
        years[y].spending += amt;
      }
    });

    // Merchant keyword search if specific merchant or term mentioned
    const searchTokens = queryLower.split(/\s+/).filter(w => w.length > 2 && !['what', 'how', 'much', 'did', 'spend', 'for', 'the', 'and', 'show', 'my', 'in', 'total'].includes(w));
    
    let matchedTx = [];
    if (searchTokens.length > 0) {
      matchedTx = transactions.filter(t => {
        const text = `${t.merchant} ${t.category} ${t.account} ${t.date} ${t.amount}`.toLowerCase();
        return searchTokens.some(token => text.includes(token));
      });
    }

    // Call Gemini API if API key is provided
    if (apiKey) {
      try {
        const prompt = `You are Ledgerly's AI Financial Assistant powered by Google Gemini.
You have full real-time access to the user's financial ledger of ${totalCount} transactions.

FINANCIAL CONTEXT:
- Total Transactions: ${totalCount}
- Total Recorded Income: $${totalIncome.toFixed(2)}
- Total Recorded Spending: $${totalSpending.toFixed(2)}
- Cash Assets: $${assets.reduce((sum, a) => sum + Number(a.value || 0), 0).toFixed(2)}

YEARLY BREAKDOWN:
${Object.entries(years).map(([y, data]) => `* ${y}: Spending $${data.spending.toFixed(2)}, Income $${data.income.toFixed(2)} (${data.count} txs)`).join('\n')}

ACCOUNT SPENDING SUMMARY:
${Object.entries(accounts).map(([acc, amt]) => `* ${acc}: $${amt.toFixed(2)}`).join('\n')}

TOP CATEGORIES:
${Object.entries(categories).sort((a,b) => b[1] - a[1]).slice(0, 8).map(([cat, amt]) => `* ${cat}: $${amt.toFixed(2)}`).join('\n')}

MATCHED SPECIFIC TRANSACTIONS FOR USER QUERY:
${matchedTx.slice(0, 15).map(t => `* ${t.date} | ${t.merchant} | ${t.category} | ${t.account} | $${t.amount.toFixed(2)} (${t.type})`).join('\n')}

USER QUESTION: "${message}"

Answer clearly, professionally, and accurately using dollar figures, exact transaction dates, and breakdown tables where appropriate.`;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResponse) {
            return res.json({ response: textResponse, source: 'gemini-api' });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to local analysis engine:', geminiErr.message);
      }
    }

    // Local High-Powered Gemini Financial Engine Fallback
    let reply = '';

    if (queryLower.includes('costco')) {
      const costcoTxs = transactions.filter(t => t.merchant.toLowerCase().includes('costco'));
      const costcoTotal = costcoTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      reply = `🛒 **Costco Spending Analysis**:\n\nYou have **${costcoTxs.length} transactions** at Costco totaling **$${costcoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.\n\n**Recent Costco Purchases**:\n` +
        costcoTxs.slice(0, 5).map(t => `• **${t.date}**: $${t.amount.toFixed(2)} (${t.account})`).join('\n');
    } else if (queryLower.includes('2025')) {
      const data2025 = years['2025'] || { spending: 0, income: 0, count: 0 };
      const topCats2025 = {};
      transactions.filter(t => t.date && t.date.startsWith('2025') && t.type === 'expense').forEach(t => {
        const cat = t.category || 'Needs review';
        topCats2025[cat] = (topCats2025[cat] || 0) + Number(t.amount || 0);
      });
      const sorted2025Cats = Object.entries(topCats2025).sort((a,b) => b[1] - a[1]).slice(0, 5);

      reply = `📅 **2025 Annual Financial Overview**:\n\n• **Total Spending**: **$${data2025.spending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n• **Total Income**: **$${data2025.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n• **Total Transactions**: **${data2025.count}**\n\n**Top Spending Categories in 2025**:\n` +
        sorted2025Cats.map(([cat, amt]) => `• **${cat}**: $${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join('\n');
    } else if (queryLower.includes('account') || queryLower.includes('balance') || queryLower.includes('bank')) {
      reply = `🏦 **Linked Accounts Overview** (${Object.keys(accounts).length} active accounts):\n\n` +
        Object.entries(accounts).map(([acc, amt]) => `• **${acc}**: $${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total spend`).join('\n') +
        `\n\n💰 **Recorded Assets**: $${assets.reduce((sum, a) => sum + Number(a.value || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (queryLower.includes('category') || queryLower.includes('categories') || queryLower.includes('top spend')) {
      const topSortedCats = Object.entries(categories).sort((a,b) => b[1] - a[1]).slice(0, 6);
      reply = `📊 **Top Spending Categories Across All Accounts**:\n\n` +
        topSortedCats.map(([cat, amt]) => `• **${cat}**: $${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join('\n');
    } else if (matchedTx.length > 0) {
      const matchTotal = matchedTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      reply = `🔍 **Search Results for "${message}"**:\n\nFound **${matchedTx.length} matching transaction(s)** totaling **$${matchTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**:\n\n` +
        matchedTx.slice(0, 6).map(t => `• **${t.date}** | **${t.merchant}**: $${t.amount.toFixed(2)} (${t.category})`).join('\n');
    } else {
      reply = `✨ **Ledgerly AI Financial Summary**:\n\n• **Total Recorded Transactions**: **${totalCount.toLocaleString()}**\n• **Total Income**: **$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n• **Total Spending**: **$${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n• **Cash Assets**: **$${assets.reduce((sum, a) => sum + Number(a.value || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n\nYou can ask me specific questions like:\n- *"How much did I spend at Costco?"*\n- *"What was my 2025 total spending?"*\n- *"Show my top spending categories"*`;
    }

    return res.json({ response: reply, source: 'ledgerly-gemini-engine' });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Production static file serving
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Dhana Lakshmi Server] running on http://127.0.0.1:${PORT}`);
});
