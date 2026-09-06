import Papa from 'papaparse';

export function parseCSVString(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false
  });

  if (!parsed.data || parsed.data.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = Object.keys(parsed.data[0]);
  return { headers, rows: parsed.data };
}

export function autoDetectMapping(headers) {
  const mapping = {
    date: '',
    merchant: '',
    amount: '',
    debit: '',
    credit: '',
    category: '',
    account: ''
  };

  const lowerHeaders = headers.map(h => h.toLowerCase());

  headers.forEach((h, idx) => {
    const lh = lowerHeaders[idx];
    if (!mapping.date && (lh.includes('date') || lh.includes('posted') || lh.includes('time'))) {
      mapping.date = h;
    }
    if (!mapping.merchant && (lh.includes('merchant') || lh.includes('description') || lh.includes('payee') || lh.includes('name') || lh.includes('memo'))) {
      mapping.merchant = h;
    }
    if (!mapping.amount && (lh === 'amount' || lh.includes('transaction amount'))) {
      mapping.amount = h;
    }
    if (!mapping.debit && (lh.includes('debit') || lh.includes('withdrawal') || lh.includes('charge'))) {
      mapping.debit = h;
    }
    if (!mapping.credit && (lh.includes('credit') || lh.includes('deposit') || lh.includes('payment'))) {
      mapping.credit = h;
    }
    if (!mapping.category && (lh.includes('category') || lh.includes('type'))) {
      mapping.category = h;
    }
    if (!mapping.account && (lh.includes('account') || lh.includes('card'))) {
      mapping.account = h;
    }
  });

  return mapping;
}

export function mapCSVRowToTransaction(row, mapping, defaultAccount = 'Imported account') {
  const dateVal = row[mapping.date] || new Date().toISOString().split('T')[0];
  let formattedDate = dateVal;
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toISOString().split('T')[0];
    }
  } catch {
    formattedDate = new Date().toISOString().split('T')[0];
  }

  const merchantVal = (row[mapping.merchant] || row[mapping.description] || 'Unknown Merchant').trim();

  let amount = 0;
  let type = 'expense';

  if (mapping.debit && row[mapping.debit] && String(row[mapping.debit]).trim() !== '') {
    const val = parseFloat(String(row[mapping.debit]).replace(/[^0-9.-]/g, ''));
    if (!isNaN(val) && val > 0) {
      amount = val;
      type = 'expense';
    }
  }

  if (mapping.credit && row[mapping.credit] && String(row[mapping.credit]).trim() !== '') {
    const val = parseFloat(String(row[mapping.credit]).replace(/[^0-9.-]/g, ''));
    if (!isNaN(val) && val > 0) {
      amount = val;
      type = 'income';
    }
  }

  if (amount === 0 && mapping.amount && row[mapping.amount] !== undefined) {
    const rawVal = String(row[mapping.amount]).replace(/[^0-9.-]/g, '');
    const val = parseFloat(rawVal);
    if (!isNaN(val)) {
      if (val < 0) {
        amount = Math.abs(val);
        type = 'expense';
      } else {
        amount = val;
        type = 'income';
      }
    }
  }

  const category = (mapping.category && row[mapping.category]) ? String(row[mapping.category]).trim() : 'Needs review';
  const account = (mapping.account && row[mapping.account]) ? String(row[mapping.account]).trim() : defaultAccount;

  return {
    date: formattedDate,
    merchant: merchantVal,
    amount: Math.abs(amount),
    type,
    category: category || 'Needs review',
    account: account || defaultAccount,
    tags: ['CSV Import'],
    source: 'csv',
    receipt: false
  };
}
