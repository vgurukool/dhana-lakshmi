import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const uploadsDir = './storage/bucket/uploads';
const files = fs.readdirSync(uploadsDir);
const chaseFile = files.find(f => f.includes('chase_checking'));
const buf = fs.readFileSync(path.join(uploadsDir, chaseFile));

const parser = new PDFParse({ data: buf });
await parser.load();
const textData = await parser.getText();
const lines = textData.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

console.log('=== LINE 40-55 IN TEXT ===');
lines.forEach((l, idx) => {
  if (l.includes('07/06') || l.includes('29868004319') || l.includes('Interest Payment') || l.includes('Payroll')) {
    console.log(`Line ${idx}: ${JSON.stringify(l)}`);
  }
});
