import fs from 'fs';
import path from 'path';
import { wipeAllData, saveTransaction, saveDocumentRecord, getState } from './db.js';
import { parsePDFBankStatement } from './pdfParser.js';

const uploadsDir = path.join(process.cwd(), 'storage', 'bucket', 'uploads');
const files = fs.readdirSync(uploadsDir);

console.log(`Clearing false-positive transactions and re-parsing ${files.length} uploaded statement files...`);

const currentState = getState();
const existingDocs = currentState.documents;

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
console.log(`\n=== CLEAN RE-POPULATED DB SUCCESS ===`);
console.log('Total Extracted:', totalExtracted);
console.log('Total Inserted into D1 DB:', totalInserted);
console.log('Final DB Transactions Count:', newState.transactions.length);

const payrollTxs = newState.transactions.filter(t => t.merchant.includes('Payroll'));
console.log('\nVERIFIED PAYROLL TRANSACTIONS IN DB:');
for (const p of payrollTxs) {
  console.log(`${p.date} | ${p.merchant} | $${p.amount.toFixed(2)} (${p.type})`);
}
