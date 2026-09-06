import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { saveTransaction } from './db.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const bucketDir = './storage/bucket/uploads';
const files = fs.readdirSync(bucketDir);

console.log(`Found ${files.length} uploaded PDF files in storage/bucket/uploads:`);

for (const file of files) {
  console.log(`\n--- PARSING FILE: ${file} ---`);
  const fullPath = path.join(bucketDir, file);
  const buf = fs.readFileSync(fullPath);
  try {
    const data = await pdfParse(buf);
    const text = data.text || '';
    console.log(`Text length: ${text.length} chars`);
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const dateRegex = /\b(\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})\b/i;
    const amountRegex = /\d{1,3}(?:,\d{3})*\.\d{2}/;

    let matchCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (dateRegex.test(line) && amountRegex.test(line)) {
        console.log(`Line [${i}]: ${line}`);
        matchCount++;
      }
    }
    console.log(`Matched transaction lines: ${matchCount}`);
  } catch (err) {
    console.error('Error reading PDF:', err);
  }
}
