import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const buf = fs.readFileSync('./storage/bucket/uploads/doc_1787514675364_m4q5vzs9u-chase_checking_account.pdf');
const parser = new PDFParse({ data: buf });
await parser.load();
const textData = await parser.getText();
const lines = textData.text.split(/\r?\n/);

console.log('=== DEBUGGING CHASE PDF LINES ===');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.includes('Payroll') || l.includes('Tmobile') || l.includes('Zelle') || l.includes('Card Purchase')) {
    console.log(`Line ${i}:`, JSON.stringify(l));
    const matches = l.match(/([+-]?\$?\s*\d{1,3}(?:,\d{3})*\.\d{2})/g);
    console.log(` -> Matches:`, matches);
  }
}
