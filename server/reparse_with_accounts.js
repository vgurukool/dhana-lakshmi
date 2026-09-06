import fs from 'fs';
import path from 'path';
import { wipeAllData, saveTransaction, saveDocumentRecord, getState } from './db.js';
import { parsePDFBankStatement } from './pdfParser.js';

const uploadsDir = path.join(process.cwd(), 'storage', 'bucket', 'uploads');
const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));

console.log(`Re-parsing ${files.length} uploaded statement files with exact account numbers...`);

const currentState = getState();
const existingDocs = currentState.documents;

// Save current settings/documents before re-parse
wipeAllData();

for (const doc of existingDocs) {
  saveDocumentRecord(doc);
}

let totalExtracted = 0;
let totalInserted = 0;

for (const f of files) {
  const fullPath = path.join(uploadsDir, f);
  const buf = fs.readFileSync(fullPath);
  const res = await parsePDFBankStatement(buf);
  for (const t of res.transactions) {
    const s = saveTransaction(t);
    if (!s.duplicate) totalInserted++;
  }
  totalExtracted += res.transactions.length;
}

const newState = getState();
console.log(`\n=== RE-PARSE SUCCESS ===`);
console.log('Total Extracted:', totalExtracted);
console.log('Total Inserted into DB:', totalInserted);
console.log('Final DB Transactions Count:', newState.transactions.length);

const uniqueAccounts = Array.from(new Set(newState.transactions.map(t => t.account)));
console.log('\nUNIQUE ACCOUNTS CURRENTLY IN TRANSACTIONS TABLE:');
console.log(uniqueAccounts);
