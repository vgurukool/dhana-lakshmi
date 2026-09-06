import fs from 'fs';
import path from 'path';
import { parsePDFBankStatement } from './pdfParser.js';

const uploadsDir = './storage/bucket/uploads';
const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));

console.log(`=== TESTING ACCOUNT NUMBER EXTRACTION ON ${files.length} STATEMENTS ===\n`);

for (const f of files) {
  const buf = fs.readFileSync(path.join(uploadsDir, f));
  const res = await parsePDFBankStatement(buf);
  const sampleAcc = res.transactions[0] ? res.transactions[0].account : 'No transactions extracted';
  console.log(`File: ${f}`);
  console.log(`Extracted Account Value: "${sampleAcc}"`);
  console.log(`Transactions Extracted Count: ${res.transactions.length}\n`);
}
