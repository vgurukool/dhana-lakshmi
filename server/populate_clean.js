import fs from 'fs';
import path from 'path';
import { wipeAllData, saveTransaction, saveDocumentRecord, getState } from './db.js';
import { parsePDFBankStatement } from './pdfParser.js';

const state = getState();
const docs = state.documents;

console.log(`Preserving ${docs.length} document metadata records.`);

wipeAllData();

for (const doc of docs) {
  saveDocumentRecord(doc);
  const fullPath = path.join(process.cwd(), 'storage', 'bucket', doc.objectKey);
  if (fs.existsSync(fullPath)) {
    const buf = fs.readFileSync(fullPath);
    const res = await parsePDFBankStatement(buf);
    for (const t of res.transactions) {
      saveTransaction(t);
    }
  }
}

const newState = getState();
console.log('\n=== CLEAN RE-POPULATED DB TRANSACTIONS ===');
console.log('Total Transactions Count in DB:', newState.transactions.length);
