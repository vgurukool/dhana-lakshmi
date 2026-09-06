import csv
import io
import re
from datetime import datetime

MONTH_MAP = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
}

def parse_csv_bank_statement(csv_text, filename=""):
    try:
        if not csv_text or not csv_text.strip():
            return {"transactions": [], "accountName": "Imported account", "extractedCount": 0}

        lines = [l.strip() for l in csv_text.splitlines() if l.strip()]
        if not lines:
            return {"transactions": [], "accountName": "Imported account", "extractedCount": 0}

        def parse_line(line_str):
            reader = csv.reader(io.StringIO(line_str))
            for row in reader:
                return [c.strip() for c in row]
            return []

        header_row_idx = 0
        for i in range(min(10, len(lines))):
            parsed = [re.sub(r'[^a-z0-9]', '', c.lower()) for c in parse_line(lines[i])]
            has_date = any('date' in c for c in parsed)
            has_desc_or_amt = any(('desc' in c or 'amount' in c or 'debit' in c or 'merchant' in c) for c in parsed)
            if has_date and has_desc_or_amt:
                header_row_idx = i
                break

        header = [re.sub(r'[^a-z0-9]', '', c.lower()) for c in parse_line(lines[header_row_idx])]

        def find_col(predicates):
            for p in predicates:
                for idx, h in enumerate(header):
                    if p(h):
                        return idx
            return -1

        date_idx = find_col([lambda h: 'transactiondate' in h, lambda h: 'postingdate' in h, lambda h: h == 'date', lambda h: 'date' in h])
        desc_idx = find_col([lambda h: 'description' in h, lambda h: 'merchant' in h, lambda h: 'payee' in h, lambda h: 'name' in h])
        category_idx = find_col([lambda h: 'category' in h])
        amount_idx = find_col([lambda h: h == 'amount', lambda h: 'amount' in h])
        debit_idx = find_col([lambda h: h == 'debit', lambda h: 'debit' in h])
        credit_idx = find_col([lambda h: h == 'credit', lambda h: 'credit' in h])
        type_idx = find_col([lambda h: h == 'type', lambda h: 'transactiontype' in h, lambda h: 'details' in h])
        card_no_idx = find_col([lambda h: 'cardno' in h, lambda h: 'cardnum' in h, lambda h: 'account' in h])

        if date_idx == -1: date_idx = 0
        if desc_idx == -1: desc_idx = 1

        extracted_last4 = ""
        if card_no_idx != -1 and len(lines) > header_row_idx + 1:
            first_row = parse_line(lines[header_row_idx + 1])
            if card_no_idx < len(first_row) and first_row[card_no_idx]:
                digits = re.sub(r'[^0-9]', '', first_row[card_no_idx])
                if len(digits) >= 4:
                    extracted_last4 = digits[-4:]

        account_name = "Imported account"
        lower_fn = filename.lower()
        full_text_lower = csv_text[:300].lower()

        if extracted_last4:
            account_name = f"Citi Card (...{extracted_last4})"
        elif 'citi' in full_text_lower or 'citi' in lower_fn or 'time period of report' in full_text_lower:
            account_name = "Citi Card"
        elif '1554' in lower_fn:
            account_name = "Credit Card (...1554)"
        elif '2067' in lower_fn:
            account_name = "Credit Card (...2067)"
        elif '5589' in lower_fn:
            account_name = "Chase Private Client Checking (...5589)"
        elif '3810' in lower_fn:
            account_name = "Bank of America Savings (...3810)"
        elif '7387' in lower_fn:
            account_name = "Savings Account (...7387)"
        elif 'capital' in lower_fn or 'transaction_download' in lower_fn:
            account_name = "Capital One Card"
        elif 'checking' in lower_fn:
            account_name = "Checking Account"
        elif 'credit' in lower_fn or 'card' in lower_fn:
            account_name = "Credit Card"

        extracted_transactions = []

        for i in range(header_row_idx + 1, len(lines)):
            cols = parse_line(lines[i])
            if len(cols) <= max(date_idx, desc_idx):
                continue

            raw_date = cols[date_idx] if date_idx < len(cols) else ""
            raw_desc = cols[desc_idx] if desc_idx < len(cols) else ""
            raw_cat = cols[category_idx] if (category_idx != -1 and category_idx < len(cols)) else ""
            raw_type = cols[type_idx] if (type_idx != -1 and type_idx < len(cols)) else ""

            if not raw_date or not raw_desc:
                continue

            num_amount = 0.0
            is_income = False

            if debit_idx != -1 and debit_idx < len(cols) and cols[debit_idx].strip():
                clean_num = re.sub(r'[^0-9.-]', '', cols[debit_idx])
                num_amount = float(clean_num) if clean_num else 0.0
                is_income = False
            elif credit_idx != -1 and credit_idx < len(cols) and cols[credit_idx].strip():
                clean_num = re.sub(r'[^0-9.-]', '', cols[credit_idx])
                num_amount = float(clean_num) if clean_num else 0.0
                is_income = num_amount > 0
            elif amount_idx != -1 and amount_idx < len(cols) and cols[amount_idx].strip():
                clean_num = re.sub(r'[^0-9.-]', '', cols[amount_idx])
                num_amount = float(clean_num) if clean_num else 0.0
                is_income = num_amount > 0

            if num_amount == 0.0:
                continue

            iso_date = "2026-08-01"
            try:
                raw_trim = raw_date.strip()
                mmm_match = re.match(r'^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$', raw_trim)
                if mmm_match:
                    m_key = mmm_match.group(1).lower()
                    if m_key in MONTH_MAP:
                        m_val = MONTH_MAP[m_key]
                        d_val = str(int(mmm_match.group(2))).zfill(2)
                        y_val = mmm_match.group(3)
                        iso_date = f"{y_val}-{m_val}-{d_val}"
                elif re.match(r'^\d{4}-\d{2}-\d{2}$', raw_trim):
                    iso_date = raw_trim
                else:
                    d_parts = re.split(r'[/.-]', raw_trim)
                    if len(d_parts) == 3:
                        y = int(d_parts[2] if len(d_parts[2]) == 4 else d_parts[0])
                        if y < 100: y += 2000
                        m = str(int(d_parts[0])).zfill(2)
                        d = str(int(d_parts[1])).zfill(2)
                        if 2010 <= y <= 2035:
                            iso_date = f"{y}-{m}-{d}"
            except Exception:
                pass

            merchant = re.sub(r'[^\w\s*.-]', ' ', raw_desc)
            merchant = re.sub(r'\s+', ' ', merchant).strip()
            if not merchant or len(merchant) < 2:
                continue

            lower_m = merchant.lower()
            lower_t = raw_type.lower()
            if 'payment' in lower_t or 'citi autopay' in lower_m or 'payment thank you' in lower_m or 'mobile pymt' in lower_m:
                is_income = True

            abs_amount = abs(num_amount)
            ttype = 'income' if is_income else 'expense'

            category = raw_cat if (raw_cat and raw_cat.lower() != 'other') else ('Income' if is_income else 'Needs review')
            if 'citi autopay' in lower_m or 'credit card payment' in lower_m or 'payment thank you' in lower_m:
                category = 'Credit Card Payment'
            elif any(k in lower_m for k in ['costco', 'walmart', 'kroger', 'grocers']):
                category = 'Groceries'
            elif 'lyft' in lower_m or 'uber' in lower_m:
                category = 'Transportation'
            elif 'health' in lower_m or 'gohealth' in lower_m:
                category = 'Health & Fitness'
            elif 'transfer' in lower_m or 'online transfer' in lower_m:
                category = 'Transfer'

            extracted_transactions.append({
                "date": iso_date,
                "merchant": merchant,
                "amount": abs_amount,
                "type": ttype,
                "category": category,
                "account": account_name,
                "tags": ['CSV Import'],
                "receipt": True,
                "source": 'document'
            })

        return {
            "extractedCount": len(extracted_transactions),
            "transactions": extracted_transactions,
            "accountName": account_name,
            "endingBalance": None
        }
    except Exception as e:
        return {
            "extractedCount": 0,
            "transactions": [],
            "accountName": "Imported account",
            "error": str(e)
        }
