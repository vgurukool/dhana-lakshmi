import fs from 'fs';
import path from 'path';
import { parsePDFBankStatement } from './pdfParser.js';

const uploadsDir = './storage/bucket/uploads';
const files = fs.readdirSync(uploadsDir);
const chaseFile = files.find(f => f.includes('chase_checking'));

if (chaseFile) {
  const buf = fs.readFileSync(path.join(uploadsDir, chaseFile));
  const res = await parsePDFBankStatement(buf);

  console.log(`=== EXTRACTED ${res.transactions.length} CLEAN TRANSACTIONS ===`);
  for (const t of res.transactions) {
    console.log(`${t.date} | ${t.merchant.padEnd(65)} | $${t.amount.toFixed(2).padStart(8)} (${t.type})`);
  }
} else {
  console.log('No Chase checking PDF found');
}
