export function parseCSVBankStatement(csvText, filename = '') {
  try {
    if (!csvText || !csvText.trim()) {
      return { transactions: [], accountName: 'Imported account', extractedCount: 0 };
    }

    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      return { transactions: [], accountName: 'Imported account', extractedCount: 0 };
    }

    // Helper to parse CSV line handling quotes
    const parseCSVLine = (lineStr) => {
      const result = [];
      let cur = '';
      let inQuotes = false;

      for (let i = 0; i < lineStr.length; i++) {
        const char = lineStr[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    // Find header row index (skips report title / metadata lines like Citi "Time period of report:")
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const parsedLine = parseCSVLine(lines[i]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const hasDate = parsedLine.some(h => h === 'date' || h.includes('date'));
      const hasDescOrAmount = parsedLine.some(h => h.includes('desc') || h.includes('amount') || h.includes('debit') || h.includes('merchant'));
      if (hasDate && hasDescOrAmount) {
        headerRowIdx = i;
        break;
      }
    }

    const header = parseCSVLine(lines[headerRowIdx]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Find column indexes
    let dateIdx = header.findIndex(h => h.includes('transactiondate') || h.includes('postingdate') || h === 'date' || h.includes('date'));
    let descIdx = header.findIndex(h => h.includes('description') || h.includes('merchant') || h.includes('payee') || h.includes('name'));
    let categoryIdx = header.findIndex(h => h.includes('category'));
    let amountIdx = header.findIndex(h => h === 'amount' || h.includes('amount'));
    let debitIdx = header.findIndex(h => h === 'debit' || h.includes('debit'));
    let creditIdx = header.findIndex(h => h === 'credit' || h.includes('credit'));
    let typeIdx = header.findIndex(h => h === 'type' || h.includes('transactiontype') || h.includes('details'));
    let cardNoIdx = header.findIndex(h => h.includes('cardno') || h.includes('cardnum') || h.includes('account'));

    if (dateIdx === -1) dateIdx = 0;
    if (descIdx === -1) descIdx = 1;

    // Detect card number from data rows if cardNoIdx exists
    let extractedLast4 = '';
    if (cardNoIdx !== -1 && lines.length > headerRowIdx + 1) {
      const firstRow = parseCSVLine(lines[headerRowIdx + 1]);
      if (firstRow[cardNoIdx]) {
        const digits = firstRow[cardNoIdx].replace(/[^0-9]/g, '');
        if (digits.length >= 4) {
          extractedLast4 = digits.slice(-4);
        }
      }
    }

    // Determine account name from card number, filename, or header
    let accountName = 'Imported account';
    const lowerFilename = (filename || '').toLowerCase();
    const fullTextLower = csvText.slice(0, 300).toLowerCase();

    if (extractedLast4) {
      accountName = `Citi Card (...${extractedLast4})`;
    } else if (fullTextLower.includes('citi') || lowerFilename.includes('citi') || fullTextLower.includes('time period of report') || lowerFilename.includes('year to date') || lowerFilename.includes('annual account summary') || lowerFilename.includes('from 202')) {
      accountName = 'Citi Card';
    } else if (lowerFilename.includes('1554')) {
      accountName = 'Credit Card (...1554)';
    } else if (lowerFilename.includes('2067')) {
      accountName = 'Credit Card (...2067)';
    } else if (lowerFilename.includes('5589')) {
      accountName = 'Chase Private Client Checking (...5589)';
    } else if (lowerFilename.includes('3810')) {
      accountName = 'Bank of America Savings (...3810)';
    } else if (lowerFilename.includes('7387')) {
      accountName = 'Savings Account (...7387)';
    } else if (lowerFilename.includes('capital') || lowerFilename.includes('transaction_download')) {
      accountName = 'Capital One Card';
    } else if (lowerFilename.includes('checking')) {
      accountName = 'Checking Account';
    } else if (lowerFilename.includes('credit') || lowerFilename.includes('card')) {
      accountName = 'Credit Card';
    }

    const extractedTransactions = [];
    let endingBalance = null;

    const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    for (let i = headerRowIdx + 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length <= Math.max(dateIdx, descIdx)) continue;

      const rawDate = cols[dateIdx];
      const rawDesc = cols[descIdx];
      const rawCategory = categoryIdx !== -1 ? cols[categoryIdx] : '';
      const rawType = typeIdx !== -1 ? cols[typeIdx] : '';

      if (!rawDate || !rawDesc) continue;

      // Extract amount and direction
      let numAmount = 0;
      let isIncome = false;

      if (debitIdx !== -1 && cols[debitIdx] && cols[debitIdx].trim()) {
        numAmount = parseFloat(cols[debitIdx].replace(/[^0-9.-]/g, ''));
        isIncome = false;
      } else if (creditIdx !== -1 && cols[creditIdx] && cols[creditIdx].trim()) {
        numAmount = parseFloat(cols[creditIdx].replace(/[^0-9.-]/g, ''));
        isIncome = numAmount > 0;
      } else if (amountIdx !== -1 && cols[amountIdx] && cols[amountIdx].trim()) {
        numAmount = parseFloat(cols[amountIdx].replace(/[^0-9.-]/g, ''));
        isIncome = numAmount > 0;
      }

      if (isNaN(numAmount) || numAmount === 0) continue;

      // Parse Date (MMM DD, YYYY or YYYY-MM-DD or MM/DD/YYYY)
      let isoDate = '2026-08-01';
      try {
        const rawDateTrim = rawDate.trim();
        const mmmMatch = rawDateTrim.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/);
        
        if (mmmMatch) {
          const mKey = mmmMatch[1].toLowerCase();
          if (monthMap[mKey]) {
            const m = monthMap[mKey];
            const d = String(parseInt(mmmMatch[2], 10)).padStart(2, '0');
            const y = mmmMatch[3];
            isoDate = `${y}-${m}-${d}`;
          }
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDateTrim)) {
          isoDate = rawDateTrim;
        } else {
          const dParts = rawDateTrim.split(/[/.-]/);
          if (dParts.length === 3) {
            let y = parseInt(dParts[2] || dParts[0], 10);
            if (y < 100) y += 2000;
            const m = String(parseInt(dParts[0], 10)).padStart(2, '0');
            const d = String(parseInt(dParts[1], 10)).padStart(2, '0');
            if (y >= 2010 && y <= 2035) {
              isoDate = `${y}-${m}-${d}`;
            }
          }
        }
      } catch {}

      // Clean Merchant Name
      let merchant = rawDesc
        .replace(/[^\w\s*.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!merchant || merchant.length < 2) continue;

      const lowerMerchant = merchant.toLowerCase();
      const lowerType = (rawType || '').toLowerCase();

      if (lowerType.includes('payment') || lowerMerchant.includes('citi autopay') || lowerMerchant.includes('payment thank you') || lowerMerchant.includes('mobile pymt')) {
        isIncome = true; // Credit Card Payment credit
      }

      const absAmount = Math.abs(numAmount);
      const type = isIncome ? 'income' : 'expense';

      // Auto-categorize
      let category = rawCategory && rawCategory.toLowerCase() !== 'other' ? rawCategory : (isIncome ? 'Income' : 'Needs review');
      if (lowerMerchant.includes('citi autopay') || lowerMerchant.includes('credit card payment') || lowerMerchant.includes('payment thank you')) {
        category = 'Credit Card Payment';
      } else if (lowerMerchant.includes('costco') || lowerMerchant.includes('walmart') || lowerMerchant.includes('kroger') || lowerMerchant.includes('grocers')) {
        category = 'Groceries';
      } else if (lowerMerchant.includes('lyft') || lowerMerchant.includes('uber')) {
        category = 'Transportation';
      } else if (lowerMerchant.includes('health') || lowerMerchant.includes('gohealth')) {
        category = 'Health & Fitness';
      } else if (lowerMerchant.includes('transfer') || lowerMerchant.includes('online transfer')) {
        category = 'Transfer';
      }

      extractedTransactions.push({
        date: isoDate,
        merchant,
        amount: absAmount,
        type,
        category,
        account: accountName,
        tags: ['CSV Import'],
        receipt: true,
        source: 'document'
      });
    }

    return {
      extractedCount: extractedTransactions.length,
      transactions: extractedTransactions,
      accountName,
      endingBalance
    };
  } catch (err) {
    console.error('CSV Parsing Error:', err.message);
    return {
      extractedCount: 0,
      transactions: [],
      accountName: 'Imported account',
      error: err.message
    };
  }
}
