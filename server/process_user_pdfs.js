import fs from 'fs';
import path from 'path';
import { parsePDFBankStatement } from './pdfParser.js';
import { saveTransaction, getState } from './db.js';

const bucketDir = './storage/bucket/uploads';
const files = fs.readdirSync(bucketDir);

console.log(`Processing ${files.length} uploaded PDF files in storage/bucket/uploads:`);

let totalExtracted = 0;
let totalInserted = 0;
let totalDuplicates = 0;

for (const file of files) {
  console.log(`\n--- PROCESSING FILE: ${file} ---`);
  const fullPath = path.join(bucketDir, file);
  const buf = fs.readFileSync(fullPath);

  const result = await parsePDFBankStatement(buf);
  console.log(`Text length: ${result.textLength} chars`);
  console.log(`Extracted transaction candidates: ${result.extractedCount}`);

  if (result.transactions && result.transactions.length > 0) {
    for (const tx of result.transactions) {
      const res = saveTransaction(tx);
      if (res.duplicate) {
        totalDuplicates++;
      } else {
        totalInserted++;
        console.log(` -> Inserted: ${tx.date} | ${tx.merchant} | $${tx.amount} (${tx.type})`);
      }
    }
    totalExtracted += result.extractedCount;
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total Extracted: ${totalExtracted}`);
console.log(`Total Inserted: ${totalInserted}`);
console.log(`Total Duplicates: ${totalDuplicates}`);

const state = getState();
console.log(`Current DB transactions count: ${state.transactions.length}`);
