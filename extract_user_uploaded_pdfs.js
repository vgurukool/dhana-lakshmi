import fs from 'fs';
import path from 'path';
import { parsePDFBankStatement } from './server/pdfParser.js';
import { saveTransaction, getState } from './server/db.js';

const state = getState();
console.log(`Found ${state.documents.length} document records in D1 database.`);

let totalExtracted = 0;
let totalInserted = 0;

for (const doc of state.documents) {
  const fullPath = path.join(process.cwd(), 'storage', 'bucket', doc.objectKey);
  console.log(`\nParsing document: ${doc.filename} (${fullPath})...`);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found at ${fullPath}`);
    continue;
  }

  const buf = fs.readFileSync(fullPath);
  const result = await parsePDFBankStatement(buf);
  console.log(`Text length: ${result.textLength} chars | Extracted candidates: ${result.extractedCount}`);

  if (result.transactions && result.transactions.length > 0) {
    for (const tx of result.transactions) {
      const res = saveTransaction(tx);
      if (!res.duplicate) {
        totalInserted++;
      }
    }
    totalExtracted += result.extractedCount;
  }
}

console.log(`\n=== SUCCESS ===`);
console.log(`Total Extracted: ${totalExtracted}`);
console.log(`Total Inserted into Database: ${totalInserted}`);
const finalState = getState();
console.log(`Current Total Transactions in D1 DB: ${finalState.transactions.length}`);
