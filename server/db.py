import os
import json
import sqlite3
import random
import string
import re
from pathlib import Path
from datetime import datetime

SERVER_DIR = Path(__file__).resolve().parent
ROOT_DIR = SERVER_DIR.parent
DATA_DIR = ROOT_DIR / "data"
STORAGE_BUCKET_DIR = ROOT_DIR / "storage" / "bucket"

DATA_DIR.mkdir(parents=True, exist_ok=True)
STORAGE_BUCKET_DIR.mkdir(parents=True, exist_ok=True)
(STORAGE_BUCKET_DIR / "uploads").mkdir(parents=True, exist_ok=True)
(STORAGE_BUCKET_DIR / "drive-inbox").mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "ledgerly.db"
DEFAULT_USER_ID = "66362f41-63af-4191-aeac-e9e7f362d946"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    return conn

def init_db():
    conn = get_db()
    with conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS transactions (
              id TEXT PRIMARY KEY,
              date TEXT NOT NULL,
              merchant TEXT NOT NULL,
              category TEXT NOT NULL DEFAULT 'Needs review',
              amount REAL NOT NULL,
              type TEXT NOT NULL,
              account TEXT NOT NULL DEFAULT 'Imported account',
              tags TEXT NOT NULL DEFAULT '[]',
              receipt INTEGER NOT NULL DEFAULT 0,
              source TEXT NOT NULL,
              fingerprint TEXT NOT NULL UNIQUE,
              createdAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tags (
              name TEXT PRIMARY KEY,
              createdAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS rules (
              id TEXT PRIMARY KEY,
              whenText TEXT NOT NULL,
              thenText TEXT NOT NULL,
              enabled INTEGER NOT NULL DEFAULT 1,
              createdAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updatedAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_settings (
              userId TEXT NOT NULL,
              key TEXT NOT NULL,
              value TEXT NOT NULL,
              updatedAt TEXT NOT NULL,
              PRIMARY KEY (userId, key)
            );

            CREATE TABLE IF NOT EXISTS documents (
              id TEXT PRIMARY KEY,
              filename TEXT NOT NULL,
              mimeType TEXT NOT NULL,
              size INTEGER NOT NULL,
              objectKey TEXT NOT NULL UNIQUE,
              status TEXT NOT NULL,
              source TEXT NOT NULL,
              createdAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS financial_accounts (
              id TEXT PRIMARY KEY,
              category TEXT NOT NULL,
              name TEXT NOT NULL,
              institution TEXT NOT NULL,
              accountNumberLast4 TEXT NOT NULL DEFAULT '',
              balance REAL NOT NULL DEFAULT 0,
              interestRate REAL NOT NULL DEFAULT 0,
              paymentAmount REAL NOT NULL DEFAULT 0,
              paymentFrequency TEXT NOT NULL DEFAULT 'monthly',
              dueDay INTEGER NOT NULL DEFAULT 1,
              nextDueDate TEXT NOT NULL,
              lastPaidDate TEXT,
              autoPay INTEGER NOT NULL DEFAULT 0,
              maturityDate TEXT NOT NULL DEFAULT '',
              coverageAmount REAL NOT NULL DEFAULT 0,
              notes TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'active',
              createdAt TEXT NOT NULL,
              updatedAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS assets (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              currency TEXT NOT NULL DEFAULT 'USD',
              value REAL NOT NULL,
              hideFromDashboard INTEGER NOT NULL DEFAULT 0,
              createdAt TEXT NOT NULL
            );
        """)
        try:
            conn.execute("ALTER TABLE assets ADD COLUMN currency TEXT DEFAULT 'USD'")
        except Exception:
            pass
        try:
            conn.execute("ALTER TABLE transactions ADD COLUMN ashtaLakshmi TEXT")
        except Exception:
            pass
        try:
            conn.execute("ALTER TABLE transactions ADD COLUMN primaryExpenseCategory TEXT")
        except Exception:
            pass
        try:
            conn.execute("ALTER TABLE transactions ADD COLUMN incomeSource TEXT")
        except Exception:
            pass
        try:
            conn.execute("ALTER TABLE transactions ADD COLUMN incomeType TEXT")
        except Exception:
            pass

        # Multi-tenant migration: add userId column to all data tables
        for table in ['transactions', 'financial_accounts', 'assets', 'documents', 'rules', 'tags']:
            try:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN userId TEXT NOT NULL DEFAULT '{DEFAULT_USER_ID}'")
            except Exception:
                pass

        # Migrate existing settings into user_settings for Ayush (DEFAULT_USER_ID)
        try:
            conn.execute("""
                INSERT OR IGNORE INTO user_settings (userId, key, value, updatedAt)
                SELECT ?, key, value, updatedAt FROM settings
            """, (DEFAULT_USER_ID,))
        except Exception as e:
            print(f"[DB INIT] user_settings migration notice: {e}")

        # Ensure composite uniqueness for transactions fingerprint per user
        try:
            conn.execute("UPDATE transactions SET fingerprint = ? || '|' || fingerprint WHERE userId = ? AND fingerprint NOT LIKE ? || '|%'",
                         (DEFAULT_USER_ID, DEFAULT_USER_ID, DEFAULT_USER_ID))
        except Exception:
            pass

    conn.close()
    init_user_settings_if_missing(DEFAULT_USER_ID)
    seed_initial_accounts_if_empty(DEFAULT_USER_ID)

def init_user_settings_if_missing(user_id=DEFAULT_USER_ID):
    conn = get_db()
    default_categories = [
        'Housing', 'Groceries', 'Shopping', 'Dining', 'Transportation',
        'Utilities', 'Subscriptions', 'Insurance', 'Health', 'Entertainment',
        'Credit Card Payment', 'Cash Withdrawal', 'Transfer', 'Income', 'Needs review', 'Other'
    ]
    default_accounts = ['Main Checking', 'Everyday Visa', 'Rewards Card', 'Cash']

    def set_setting_if_absent(k, v):
        cur = conn.cursor()
        cur.execute("SELECT value FROM user_settings WHERE userId = ? AND key = ?", (user_id, k))
        if not cur.fetchone():
            cur.execute("INSERT INTO user_settings (userId, key, value, updatedAt) VALUES (?, ?, ?, ?)",
                        (user_id, k, json.dumps(v), datetime.utcnow().isoformat() + "Z"))

    drive_sync_default = {
        'folderName': 'Ledgerly Financial Inbox',
        'folderId': '1MW88z2DRiIjgM-mDvGl-x4k576SAnZNq' if user_id == DEFAULT_USER_ID else '',
        'folderUrl': 'https://drive.google.com/drive/folders/1MW88z2DRiIjgM-mDvGl-x4k576SAnZNq' if user_id == DEFAULT_USER_ID else '',
        'lastSyncedAt': None,
        'schedule': {'time': '08:00', 'timezone': 'CDT', 'cadence': 'daily'},
        'status': 'idle',
        'lastCounts': {'imported': 0, 'duplicate': 0, 'filesStored': 0, 'review': 0, 'errors': 0}
    }

    with conn:
        set_setting_if_absent('categories', default_categories)
        set_setting_if_absent('accounts', default_accounts)
        set_setting_if_absent('goals', [])
        set_setting_if_absent('budgets', [])
        set_setting_if_absent('subscriptions', [])
        set_setting_if_absent('recurring', [])
        set_setting_if_absent('dismissedPatterns', [])
        set_setting_if_absent('selectedPeriod', 'all-time')
        set_setting_if_absent('assets', 0)
        set_setting_if_absent('liabilities', 0)
        set_setting_if_absent('netWorthConfigured', False)
        set_setting_if_absent('driveSyncInfo', drive_sync_default)
        set_setting_if_absent('processedFileIds', [])
        set_setting_if_absent('driveResetAt', None)
        set_setting_if_absent('freshStart', True)

    conn.close()

def init_settings_if_missing():
    init_user_settings_if_missing(DEFAULT_USER_ID)



def infer_primary_dhana_expense(category: str, merchant: str) -> str:
    cat = (category or '').strip().lower()
    mer = (merchant or '').strip().lower()

    # 1. Groceries & Organic Pantry
    if 'grocer' in cat or any(k in mer for k in ['grocer', 'supermarket', 'trader joe', 'whole foods', 'walmart', 'costco', 'kroger', 'parivar', 'patel', 'safeway', 'heb', 'aldi', 'sprouts', 'food market', 'market']):
        return 'Groceries & Organic Pantry'

    # 2. Dining & Social Outings
    if 'dining' in cat or any(k in mer for k in ['restaurant', 'cafe', 'coffee', 'starbucks', 'subway', 'chipotle', 'doordash', 'uber eats', 'grubhub', 'instacart', 'mcdonald', 'panera', 'pizza', 'diner', 'bistro', 'bar', 'bakery', 'taco', 'burger']):
        return 'Dining & Social Outings'

    # 3. Health & Preventative Wellness
    if any(k in cat for k in ['health', 'wellness', 'pharmacy', 'medical', 'fitness']) or any(k in mer for k in ['cvs', 'walgreens', 'pharmacy', 'clinic', 'hospital', 'doctor', 'dental', 'gym', 'fitness', 'yoga', 'gnc', 'vitamin', 'therapist', 'optometry']):
        return 'Health & Preventative Wellness'

    # 4. Housing & Living Space
    if any(k in cat for k in ['housing', 'rent', 'mortgage']) or any(k in mer for k in ['chase home', 'mortgage', 'landlord', 'realty', 'rent', 'home depot', 'lowes', 'ikea', 'hoa', 'property tax', 'apartment', 'realtor']):
        return 'Housing & Living Space'

    # 5. Transportation & Mobility
    if any(k in cat for k in ['transport', 'auto', 'vehicle', 'gas']) or any(k in mer for k in ['tesla', 'toyota', 'honda', 'shell', 'chevron', 'bp', 'exxon', 'fuel', 'gas', 'uber', 'lyft', 'parking', 'toll', 'hertz', 'enterprise', 'auto repair', 'valvoline', 'car wash', 'subway transit']):
        return 'Transportation & Mobility'

    # 6. Utilities & Connectivity
    if any(k in cat for k in ['utilities', 'electric', 'water', 'utility']) or any(k in mer for k in ['tmobile', 'verizon', 'att', 'electric', 'water', 'comcast', 'xfinity', 'spectrum', 'gas co', 'edison', 'pge', 'internet', 'power']):
        return 'Utilities & Connectivity'

    # 7. Insurance & Risk Armor
    if 'insurance' in cat or any(k in mer for k in ['geico', 'state farm', 'progressive', 'allstate', 'liberty mutual', 'life ins', 'health ins', 'blue cross', 'aetna', 'cigna', 'prudential', 'metlife', 'travelers']):
        return 'Insurance & Risk Armor'

    # 8. Investments & Capital Growth
    if any(k in cat for k in ['investment', 'brokerage', 'savings', '401k', 'ira']) or any(k in mer for k in ['fidelity', 'vanguard', 'schwab', 'robinhood', 'coinbase', 'etrade', 'merrill', 'wealthfront', 'deposit']):
        return 'Investments & Capital Growth'

    # 9. Debt Servicing & Payoff
    if any(k in cat for k in ['credit card payment', 'debt', 'interest', 'loan payment']) or any(k in mer for k in ['sofi', 'loan', 'interest paid', 'student loan', 'navient', 'nelnet', 'capital one payment', 'chase card payment', 'card payment']):
        return 'Debt Servicing & Payoff'

    # 10. Family & Childcare
    if any(k in cat for k in ['child', 'family', 'kids', 'baby', 'elder']) or any(k in mer for k in ['daycare', 'kindergarten', 'pediatric', 'toys r us', 'carter', 'baby', 'elder care', 'preschool', 'school tuition']):
        return 'Family & Childcare'

    # 11. Education & Skill Mastery
    if any(k in cat for k in ['education', 'learning', 'book', 'tuition', 'course']) or any(k in mer for k in ['udemy', 'coursera', 'book', 'kindle', 'audible', 'university', 'college', 'edx', 'oreilly', 'substack', 'medium', 'pluralsight', 'datacamp', 'masterclass']):
        return 'Education & Skill Mastery'

    # 12. Professional Tools & Enterprise
    if any(k in cat for k in ['professional', 'career', 'office', 'software', 'business']) or any(k in mer for k in ['aws', 'google cloud', 'microsoft', 'github', 'jetbrains', 'slack', 'zoom', 'apple store', 'dell', 'lenovo', 'linkedin', 'openai', 'anthropic', 'digitalocean']):
        return 'Professional Tools & Enterprise'

    # 13. Charity & Philanthropy (Dāna)
    if any(k in cat for k in ['charity', 'donation', 'temple', 'spiritual', 'dāna', 'dana']) or any(k in mer for k in ['charity', 'donation', 'red cross', 'unicef', 'temple', 'church', 'mandir', 'ashram', 'gofundme', 'foundation', 'salvation army', 'goodwill']):
        return 'Charity & Philanthropy (Dāna)'

    # 14. Leisure, Travel & Personal Care
    if any(k in cat for k in ['entertainment', 'travel', 'shopping', 'personal care', 'subscriptions']) or any(k in mer for k in ['netflix', 'spotify', 'hulu', 'disney', 'youtube', 'hbo', 'airline', 'hotel', 'airbnb', 'flight', 'theater', 'cinema', 'salon', 'barber', 'clothing', 'zara', 'nordstrom', 'nike', 'amazon', 'target']):
        return 'Leisure, Travel & Personal Care'

    # Fallback
    if 'shopping' in cat:
        return 'Leisure, Travel & Personal Care'
    return 'Living & General Expenses'

def infer_ashta_lakshmi(category: str, merchant: str) -> str:
    cat = (category or "").strip().lower()
    mer = (merchant or "").strip().lower()

    # 1. Dhanya Lakshmi (Nourishment, Food, Groceries, Dining, Health, Vitality)
    if any(k in cat for k in ["grocer", "dining", "food", "health", "wellness", "pharmacy", "medical", "fitness", "nutrition"]):
        return "dhanya"
    if any(k in mer for k in ["grocer", "supermarket", "trader joe", "whole foods", "walmart", "costco", "kroger", "restaurant", "cafe", "coffee", "starbucks", "subway", "chipotle", "doordash", "uber eats", "instacart", "pharmacy", "cvs", "walgreens", "gym", "yoga", "fitness", "parivar", "patel"]):
        return "dhanya"

    # 2. Dhana Lakshmi (Liquid Capital, Investments, Savings, Core Financials)
    if any(k in cat for k in ["investment", "savings", "brokerage", "credit card payment", "transfer", "interest", "banking"]):
        return "dhana"
    if any(k in mer for k in ["fidelity", "vanguard", "schwab", "robinhood", "coinbase", "deposit", "transfer", "interest paid", "dividend"]):
        return "dhana"

    # 3. Dhairya Lakshmi (Courage, Resilience, Insurance, Protection)
    if any(k in cat for k in ["insurance", "security", "emergency"]):
        return "dhairya"
    if any(k in mer for k in ["geico", "state farm", "progressive", "allstate", "liberty mutual", "life ins", "health ins", "prudential", "northwestern mutual"]):
        return "dhairya"

    # 4. Vidya Lakshmi (Knowledge, Education, Books, Skills, Creative Arts)
    if any(k in cat for k in ["education", "learning", "books", "tuition", "course", "skill", "training"]):
        return "vidya"
    if any(k in mer for k in ["udemy", "coursera", "book", "kindle", "audible", "university", "college", "school", "edx", "oreilly", "substack", "medium", "patreon", "learning"]):
        return "vidya"

    # 5. Santana Lakshmi (Family, Children, Childcare, Lineage, Elder Care)
    if any(k in cat for k in ["child", "family", "kids", "baby", "pediatric", "elder"]):
        return "santana"
    if any(k in mer for k in ["daycare", "kindergarten", "pediatric", "toys r us", "carter", "baby", "elder care", "senior", "preschool"]):
        return "santana"

    # 6. Vijaya Lakshmi (Career Triumph, Professional Tools, Hardware, Software)
    if any(k in cat for k in ["professional", "career", "office", "software", "business"]):
        return "vijaya"
    if any(k in mer for k in ["aws", "google cloud", "microsoft", "github", "jetbrains", "slack", "zoom", "apple store", "dell", "lenovo", "linkedin", "openai"]):
        return "vijaya"

    # 7. Adi Lakshmi (Spiritual Grounding, Charity, Dāna, Sanctuary, Peace)
    if any(k in cat for k in ["charity", "donation", "temple", "spiritual", "gift"]):
        return "adi"
    if any(k in mer for k in ["charity", "donation", "red cross", "unicef", "temple", "church", "mandir", "ashram", "gofundme", "foundation"]):
        return "adi"

    # 8. Gaja Lakshmi (Sovereignty, Housing, Mobility, Vehicles, Utilities, Estate)
    if any(k in cat for k in ["housing", "rent", "mortgage", "transport", "auto", "vehicle", "utilities", "electric", "gas", "water"]):
        return "gaja"
    if any(k in mer for k in ["chase home", "mortgage", "landlord", "tesla", "toyota", "honda", "shell", "chevron", "bp", "exxon", "fuel", "gas", "tmobile", "verizon", "att", "utility", "electric", "uber", "lyft"]):
        return "gaja"

    # Subscriptions & Shopping generic routing
    if "subscriptions" in cat:
        if any(k in mer for k in ["netflix", "spotify", "hulu", "disney", "youtube", "hbo"]):
            return "adi"
        if any(k in mer for k in ["nyt", "wsj", "economist"]):
            return "vidya"
        return "gaja"

    if "shopping" in cat:
        if any(k in mer for k in ["home depot", "lowes", "ikea"]):
            return "gaja"
        return "dhana"

    return "dhanya"


INCOME_SOURCE_CATEGORIES = [
    "Salary & Wages",
    "Consulting & Freelance",
    "Business & Venture Profits",
    "Bonus & Commissions",
    "Interest & HYSA",
    "Dividends & Capital Gains",
    "Real Estate & Rental",
    "Royalties & Digital Assets",
    "Cashback, Points & Rewards",
    "Tax Refunds & Govt Credits",
    "Gifts, Transfers & Other"
]

PASSIVE_INCOME_SOURCES = {
    "Interest & HYSA",
    "Dividends & Capital Gains",
    "Real Estate & Rental",
    "Royalties & Digital Assets",
    "Cashback, Points & Rewards",
    "Tax Refunds & Govt Credits"
}

def infer_income_source_and_type(category, merchant):
    cat = (category or "").lower()
    m = (merchant or "").lower()

    if any(k in m for k in ["payroll", "direct dep", "salary", "paycheck", "employer", "w-2", "jpmorgan chase b des:payroll", "adp", "gusto", "paychex"]):
        return ("Salary & Wages", "active")
    if any(k in m for k in ["interest", "int payment", "interest charge credit", "apy yield", "savings interest"]):
        return ("Interest & HYSA", "passive")
    if any(k in m for k in ["dividend", "fidelity", "vanguard", "schwab", "robinhood", "distribution", "capital gain", "etf", "morgan stanley"]):
        return ("Dividends & Capital Gains", "passive")
    if any(k in m for k in ["rent", "tenant", "airbnb", "lease", "property mgmt", "vrbo"]):
        return ("Real Estate & Rental", "passive")
    if any(k in m for k in ["consult", "freelance", "upwork", "fiverr", "stripe payout", "invoice", "client", "advisory"]):
        return ("Consulting & Freelance", "active")
    if any(k in m for k in ["bonus", "commission", "quarterly bonus", "incentive"]):
        return ("Bonus & Commissions", "active")
    if any(k in m for k in ["royalty", "gumroad", "patreon", "substack", "app store", "amazon kdp", "youtube", "creator"]):
        return ("Royalties & Digital Assets", "passive")
    if any(k in m for k in ["cashback", "cash back", "rewards credit", "bonus cash", "rakuten"]):
        return ("Cashback, Points & Rewards", "passive")
    if any(k in m for k in ["irs", "tax refund", "treasury", "state tax", "tax return"]):
        return ("Tax Refunds & Govt Credits", "passive")
    if any(k in m for k in ["zelle", "venmo", "paypal transfer", "wire deposit", "gift", "reimbursement", "deposit from"]):
        return ("Gifts, Transfers & Other", "active")

    # Fallback based on category
    if "payroll" in cat or "salary" in cat:
        return ("Salary & Wages", "active")
    if "interest" in cat:
        return ("Interest & HYSA", "passive")
    if "dividend" in cat or "investment" in cat:
        return ("Dividends & Capital Gains", "passive")
    if "rental" in cat or "real estate" in cat:
        return ("Real Estate & Rental", "passive")
    if "freelance" in cat or "consulting" in cat:
        return ("Consulting & Freelance", "active")

    return ("Salary & Wages", "active")

def get_state(user_id=DEFAULT_USER_ID):
    conn = get_db()
    cur = conn.cursor()

    # Ensure user settings exist
    cur.execute("SELECT count(*) FROM user_settings WHERE userId = ?", (user_id,))
    if cur.fetchone()[0] == 0:
        init_user_settings_if_missing(user_id)

    cur.execute("SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC, createdAt DESC LIMIT 5000", (user_id,))
    tx_rows = [dict(r) for r in cur.fetchall()]
    parsed_transactions = []
    for t in tx_rows:
        tags_raw = t.get("tags") or "[]"
        try:
            tags = json.loads(tags_raw)
        except Exception:
            tags = []
        ashta = t.get("ashtaLakshmi")
        if not ashta:
            ashta = infer_ashta_lakshmi(t.get("category"), t.get("merchant"))

        primary_expense = t.get("primaryExpenseCategory")
        if not primary_expense:
            primary_expense = infer_primary_dhana_expense(t.get("category"), t.get("merchant"))

        inc_source = t.get("incomeSource")
        inc_type = t.get("incomeType")
        if not inc_source or not inc_type:
            inferred_source, inferred_type = infer_income_source_and_type(t.get("category"), t.get("merchant"))
            if not inc_source:
                inc_source = inferred_source
            if not inc_type:
                inc_type = inferred_type

        parsed_transactions.append({
            **t,
            "tags": tags,
            "receipt": bool(t.get("receipt")),
            "ashtaLakshmi": ashta,
            "primaryExpenseCategory": primary_expense,
            "incomeSource": inc_source,
            "incomeType": inc_type
        })

    cur.execute("SELECT * FROM tags WHERE userId = ? ORDER BY name ASC", (user_id,))
    tags_rows = [dict(r) for r in cur.fetchall()]
    if not tags_rows:
        cur.execute("SELECT * FROM tags WHERE userId = ? ORDER BY name ASC", (DEFAULT_USER_ID,))
        tags_rows = [dict(r) for r in cur.fetchall()]

    cur.execute("SELECT * FROM rules WHERE userId = ? ORDER BY createdAt DESC", (user_id,))
    rules_rows = [dict(r) for r in cur.fetchall()]
    rules = [{**r, "enabled": bool(r.get("enabled", 1))} for r in rules_rows]

    cur.execute("SELECT * FROM user_settings WHERE userId = ?", (user_id,))
    settings_rows = cur.fetchall()
    settings = {}
    for r in settings_rows:
        val = r["value"]
        try:
            settings[r["key"]] = json.loads(val)
        except Exception:
            settings[r["key"]] = val

    cur.execute("SELECT * FROM documents WHERE userId = ? ORDER BY createdAt DESC LIMIT 100", (user_id,))
    documents = [dict(r) for r in cur.fetchall()]

    conn.close()
    assets_list = get_assets(user_id)

    return {
        "transactions": parsedTransactions_to_dict(parsed_transactions),
        "tags": tags_rows,
        "rules": rules,
        "settings": settings,
        "documents": documents,
        "assetsList": assets_list,
        "accountsList": get_financial_accounts(user_id)
    }

def parsedTransactions_to_dict(txs):
    return txs

def get_assets(user_id=DEFAULT_USER_ID):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM assets WHERE userId = ? ORDER BY createdAt DESC", (user_id,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return [{**r, "hideFromDashboard": bool(r.get("hideFromDashboard"))} for r in rows]

def sync_assets_setting(user_id=DEFAULT_USER_ID):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT SUM(value) as total FROM assets WHERE userId = ? AND hideFromDashboard = 0", (user_id,))
    row = cur.fetchone()
    visible_sum = float(row["total"]) if row and row["total"] is not None else 0.0
    conn.close()
    update_preferences({
        "assets": visible_sum,
        "netWorthConfigured": True
    }, user_id=user_id)

def save_asset(asset, user_id=DEFAULT_USER_ID):
    conn = get_db()
    id_val = asset.get("id") or f"asset_{int(datetime.now().timestamp()*1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=6))}"
    name = str(asset.get("name") or "Untitled Asset").strip()
    atype = str(asset.get("type") or "Cash / Bank Account").strip()
    currency = str(asset.get("currency") or "USD").strip()
    value = float(asset.get("value") or 0.0)
    hide = 1 if asset.get("hideFromDashboard") else 0
    created_at = asset.get("createdAt") or datetime.utcnow().isoformat() + "Z"

    with conn:
        conn.execute("""
            INSERT INTO assets (id, name, type, currency, value, hideFromDashboard, createdAt, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              type = excluded.type,
              currency = excluded.currency,
              value = excluded.value,
              hideFromDashboard = excluded.hideFromDashboard
        """, (id_val, name, atype, currency, value, hide, created_at, user_id))

    cur = conn.cursor()
    cur.execute("SELECT * FROM assets WHERE id = ? AND userId = ?", (id_val, user_id))
    row = dict(cur.fetchone())
    conn.close()

    sync_assets_setting(user_id)
    return {**row, "hideFromDashboard": bool(row.get("hideFromDashboard"))}

def patch_asset(id_val, updates, user_id=DEFAULT_USER_ID):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM assets WHERE id = ? AND userId = ?", (id_val, user_id))
    existing = cur.fetchone()
    if not existing:
        conn.close()
        return None
    existing = dict(existing)

    new_name = str(updates["name"]).strip() if "name" in updates else existing["name"]
    new_type = str(updates["type"]).strip() if "type" in updates else existing["type"]
    new_curr = str(updates["currency"]).strip() if "currency" in updates else (existing.get("currency") or "USD")
    new_val = float(updates["value"]) if "value" in updates else existing["value"]
    new_hide = (1 if updates["hideFromDashboard"] else 0) if "hideFromDashboard" in updates else existing["hideFromDashboard"]

    with conn:
        conn.execute("UPDATE assets SET name = ?, type = ?, currency = ?, value = ?, hideFromDashboard = ? WHERE id = ? AND userId = ?",
                     (new_name, new_type, new_curr, new_val, new_hide, id_val, user_id))

    cur.execute("SELECT * FROM assets WHERE id = ? AND userId = ?", (id_val, user_id))
    updated = dict(cur.fetchone())
    conn.close()

    sync_assets_setting(user_id)
    return {**updated, "hideFromDashboard": bool(updated.get("hideFromDashboard"))}

def delete_asset(id_val, user_id=DEFAULT_USER_ID):
    conn = get_db()
    with conn:
        res = conn.execute("DELETE FROM assets WHERE id = ? AND userId = ?", (id_val, user_id))
        changes = res.rowcount
    conn.close()
    sync_assets_setting(user_id)
    return changes > 0

def evaluate_rule_match(merchant_text, when_text, operator="OR"):
    if not merchant_text or not when_text:
        return False
    lower_merch = str(merchant_text).lower()
    raw_when = str(when_text).strip()
    op_upper = str(operator or "OR").upper()

    if op_upper == "AND":
        terms = [t.strip().lower() for t in re.split(r',|AND', raw_when, flags=re.IGNORECASE) if t.strip()]
        return len(terms) > 0 and all(term in lower_merch for term in terms)
    else:
        terms = [t.strip().lower() for t in re.split(r',|OR', raw_when, flags=re.IGNORECASE) if t.strip()]
        return len(terms) > 0 and any(term in lower_merch for term in terms)

def compute_fingerprint(date, merchant, amount, account, user_id=DEFAULT_USER_ID):
    clean_merchant = (merchant or "").strip().lower()
    clean_account = (account or "").strip().lower()
    formatted_amount = f"{float(amount):.2f}"
    uid = user_id or DEFAULT_USER_ID
    return f"{uid}|{date}|{clean_merchant}|{formatted_amount}|{clean_account}"

def save_transaction(t, user_id=DEFAULT_USER_ID):
    conn = get_db()
    id_val = t.get("id") or f"tx_{int(datetime.now().timestamp()*1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=9))}"
    date = str(t.get("date"))
    merchant = str(t.get("merchant") or "").strip()
    amount = abs(float(t.get("amount") or 0.0))
    ttype = "income" if t.get("type") == "income" else "expense"
    account = str(t.get("account") or "Imported account").strip()
    category = str(t.get("category") or "Needs review").strip()

    raw_tags = t.get("tags") if isinstance(t.get("tags"), list) else []
    normalized_tags = list(set(str(x).strip() for x in raw_tags if str(x).strip()))
    receipt = 1 if t.get("receipt") else 0
    source = str(t.get("source") or "manual")
    created_at = t.get("createdAt") or datetime.utcnow().isoformat() + "Z"

    fingerprint = compute_fingerprint(date, merchant, amount, account, user_id)

    cur = conn.cursor()
    cur.execute("SELECT id FROM transactions WHERE fingerprint = ? AND userId = ?", (fingerprint, user_id))
    existing = cur.fetchone()
    if existing:
        conn.close()
        return {"duplicate": True, "existingId": existing["id"]}

    # Rules matching
    final_category = category
    final_tags = list(normalized_tags)
    cur.execute("SELECT value FROM user_settings WHERE userId = ? AND key = 'rules'", (user_id,))
    rules_row = cur.fetchone()
    if rules_row and rules_row["value"]:
        try:
            user_rules = [r for r in json.loads(rules_row["value"]) if r.get("enabled") is not False]
            for rule in user_rules:
                if rule.get("whenText") and evaluate_rule_match(merchant, rule.get("whenText"), rule.get("operator")):
                    then_text = rule.get("thenText", "")
                    if then_text.startswith("Category:"):
                        final_category = then_text.replace("Category:", "").strip()
                    elif then_text.startswith("Tag:"):
                        tag_to_set = then_text.replace("Tag:", "").strip()
                        if tag_to_set not in final_tags:
                            final_tags.append(tag_to_set)
                    else:
                        final_category = then_text.strip()
        except Exception:
            pass

    income_src = t.get("incomeSource")
    income_typ = t.get("incomeType")
    if ttype == "income" and (not income_src or not income_typ):
        inf_src, inf_typ = infer_income_source_and_type(final_category, merchant)
        if not income_src:
            income_src = inf_src
        if not income_typ:
            income_typ = inf_typ

    with conn:
        conn.execute("""
            INSERT INTO transactions (id, date, merchant, category, amount, type, account, tags, receipt, source, fingerprint, createdAt, incomeSource, incomeType, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (id_val, date, merchant, final_category, amount, ttype, account, json.dumps(final_tags), receipt, source, fingerprint, created_at, income_src, income_typ, user_id))

        for tag in final_tags:
            conn.execute("INSERT OR IGNORE INTO tags (name, createdAt, userId) VALUES (?, ?, ?)", (tag, datetime.utcnow().isoformat() + "Z", user_id))

    cur.execute("SELECT * FROM transactions WHERE id = ? AND userId = ?", (id_val, user_id))
    row = dict(cur.fetchone())
    conn.close()

    try:
        row_tags = json.loads(row.get("tags") or "[]")
    except Exception:
        row_tags = []

    return {
        "duplicate": False,
        "transaction": {
            **row,
            "tags": row_tags,
            "receipt": bool(row.get("receipt"))
        }
    }

def patch_transaction(id_val, updates, user_id=DEFAULT_USER_ID):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM transactions WHERE id = ? AND userId = ?", (id_val, user_id))
    row = cur.fetchone()
    if not row:
        conn.close()
        return None
    row = dict(row)

    new_category = row["category"]
    try:
        new_tags = json.loads(row.get("tags") or "[]")
    except Exception:
        new_tags = []

    if "category" in updates:
        new_category = str(updates["category"]).strip()

    if "tags" in updates:
        raw = updates["tags"] if isinstance(updates["tags"], list) else []
        new_tags = list(set(str(x).strip() for x in raw if str(x).strip()))

    new_ashta = row.get("ashtaLakshmi")
    if "ashtaLakshmi" in updates:
        new_ashta = str(updates["ashtaLakshmi"]).strip().lower()

    new_primary = row.get("primaryExpenseCategory")
    if "primaryExpenseCategory" in updates:
        new_primary = str(updates["primaryExpenseCategory"]).strip()

    new_inc_source = row.get("incomeSource")
    if "incomeSource" in updates:
        new_inc_source = str(updates["incomeSource"]).strip()

    new_inc_type = row.get("incomeType")
    if "incomeType" in updates:
        new_inc_type = str(updates["incomeType"]).strip().lower()

    with conn:
        conn.execute("UPDATE transactions SET category = ?, tags = ?, ashtaLakshmi = ?, primaryExpenseCategory = ?, incomeSource = ?, incomeType = ? WHERE id = ? AND userId = ?",
                     (new_category, json.dumps(new_tags), new_ashta, new_primary, new_inc_source, new_inc_type, id_val, user_id))
        for tag in new_tags:
            conn.execute("INSERT OR IGNORE INTO tags (name, createdAt, userId) VALUES (?, ?, ?)", (tag, datetime.utcnow().isoformat() + "Z", user_id))

    cur.execute("SELECT * FROM transactions WHERE id = ? AND userId = ?", (id_val, user_id))
    updated = dict(cur.fetchone())
    conn.close()

    return {
        **updated,
        "tags": json.loads(updated.get("tags") or "[]"),
        "receipt": bool(updated.get("receipt")),
        "ashtaLakshmi": updated.get("ashtaLakshmi") or infer_ashta_lakshmi(updated.get("category"), updated.get("merchant")),
        "primaryExpenseCategory": updated.get("primaryExpenseCategory") or infer_primary_dhana_expense(updated.get("category"), updated.get("merchant")),
        "incomeSource": updated.get("incomeSource") or infer_income_source_and_type(updated.get("category"), updated.get("merchant"))[0],
        "incomeType": updated.get("incomeType") or infer_income_source_and_type(updated.get("category"), updated.get("merchant"))[1]
    }

def delete_transaction(id_val, user_id=DEFAULT_USER_ID):
    conn = get_db()
    with conn:
        res = conn.execute("DELETE FROM transactions WHERE id = ? AND userId = ?", (id_val, user_id))
        changes = res.rowcount
    conn.close()
    return changes > 0

def apply_rules_to_all_transactions(user_id=DEFAULT_USER_ID):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT value FROM user_settings WHERE userId = ? AND key = 'rules'", (user_id,))
    row = cur.fetchone()
    if not row or not row["value"]:
        conn.close()
        return 0

    try:
        rules = [r for r in json.loads(row["value"]) if r.get("enabled") is not False]
    except Exception:
        conn.close()
        return 0

    if not rules:
        conn.close()
        return 0

    cur.execute("SELECT id, merchant, category, tags FROM transactions WHERE userId = ?", (user_id,))
    txs = [dict(r) for r in cur.fetchall()]
    updated_count = 0

    with conn:
        for tx in txs:
            new_cat = tx["category"]
            changed = False
            for r in rules:
                if r.get("whenText") and evaluate_rule_match(tx.get("merchant"), r.get("whenText"), r.get("operator")):
                    then_text = r.get("thenText", "")
                    target_cat = then_text
                    if then_text.startswith("Category:"):
                        target_cat = then_text.replace("Category:", "").strip()
                    if target_cat and new_cat != target_cat:
                        new_cat = target_cat
                        changed = True

            if changed:
                conn.execute("UPDATE transactions SET category = ? WHERE id = ? AND userId = ?", (new_cat, tx["id"], user_id))
                updated_count += 1

    conn.close()
    return updated_count

def deduplicate_transactions_in_db(user_id=DEFAULT_USER_ID):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, fingerprint, createdAt FROM transactions WHERE userId = ? ORDER BY createdAt ASC", (user_id,))
    rows = [dict(r) for r in cur.fetchall()]
    seen = set()
    deleted_count = 0

    with conn:
        for r in rows:
            fp = r["fingerprint"]
            if fp in seen:
                conn.execute("DELETE FROM transactions WHERE id = ? AND userId = ?", (r["id"], user_id))
                deleted_count += 1
            else:
                seen.add(fp)

    # Fuzzy Deduplication (PDF vs CSV)
    def clean_name(m):
        m_str = str(m or '').lower()
        m_str = re.sub(r' (houston|tx|bellevue|wa|card|auto|pay|mobile|www|com|inc|llc) ', '', m_str)
        return re.sub(r'[^a-z0-9]', '', m_str)

    def is_similar_merchant(m1, m2):
        c1 = clean_name(m1)
        c2 = clean_name(m2)
        if not c1 or not c2:
            return False
        return (c1 in c2) or (c2 in c1) or (c1 == c2)

    cur.execute("SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC", (user_id,))
    txs = [dict(r) for r in cur.fetchall()]
    duplicates_to_delete = set()

    for i in range(len(txs)):
        t1 = txs[i]
        if t1["id"] in duplicates_to_delete:
            continue
        for j in range(i + 1, len(txs)):
            t2 = txs[j]
            if t2["id"] in duplicates_to_delete:
                continue
            same_account = t1.get("account") == t2.get("account")
            same_amount = abs(float(t1["amount"]) - float(t2["amount"])) < 0.01

            try:
                d1 = datetime.strptime(t1["date"][:10], "%Y-%m-%d")
                d2 = datetime.strptime(t2["date"][:10], "%Y-%m-%d")
                days_diff = abs((d1 - d2).days)
            except Exception:
                days_diff = 999

            if same_account and same_amount and days_diff <= 3:
                if is_similar_merchant(t1.get("merchant"), t2.get("merchant")):
                    if t1.get("category") == "Needs review" and t2.get("category") != "Needs review":
                        conn.execute("UPDATE transactions SET category = ? WHERE id = ? AND userId = ?", (t2["category"], t1["id"], user_id))
                    duplicates_to_delete.add(t2["id"])

    if duplicates_to_delete:
        with conn:
            for did in duplicates_to_delete:
                res = conn.execute("DELETE FROM transactions WHERE id = ? AND userId = ?", (did, user_id))
                deleted_count += res.rowcount

    conn.close()
    return deleted_count

def update_preferences(prefs, user_id=DEFAULT_USER_ID):
    conn = get_db()
    now_iso = datetime.utcnow().isoformat() + "Z"
    with conn:
        for k, v in prefs.items():
            if v is not None:
                conn.execute("INSERT OR REPLACE INTO user_settings (userId, key, value, updatedAt) VALUES (?, ?, ?, ?)",
                             (user_id, k, json.dumps(v), now_iso))
    conn.close()
    return get_state(user_id)["settings"]

def save_document_record(doc, user_id=DEFAULT_USER_ID):
    conn = get_db()
    with conn:
        conn.execute("""
            INSERT INTO documents (id, filename, mimeType, size, objectKey, status, source, createdAt, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (doc["id"], doc["filename"], doc["mimeType"], doc["size"], doc["objectKey"], doc["status"], doc["source"], doc["createdAt"], user_id))
    cur = conn.cursor()
    cur.execute("SELECT * FROM documents WHERE id = ? AND userId = ?", (doc["id"], user_id))
    res = dict(cur.fetchone())
    conn.close()
    return res

def delete_document_record(doc_id, user_id=DEFAULT_USER_ID):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM documents WHERE id = ? AND userId = ?", (doc_id, user_id))
    row = cur.fetchone()
    if not row:
        conn.close()
        return False
    row = dict(row)

    if row.get("objectKey"):
        file_path = STORAGE_BUCKET_DIR / row["objectKey"]
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass

    with conn:
        res = conn.execute("DELETE FROM documents WHERE id = ? AND userId = ?", (doc_id, user_id))
        changes = res.rowcount
        conn.execute("DELETE FROM transactions WHERE (source = 'document' OR source = 'google-drive' OR source = ?) AND userId = ?", (doc_id, user_id))

    conn.close()
    return changes > 0

def store_r2_object(object_key, buffer_bytes):
    full_path = STORAGE_BUCKET_DIR / object_key
    full_path.parent.mkdir(parents=True, exist_ok=True)
    with open(full_path, "wb") as f:
        f.write(buffer_bytes)

def wipe_all_data(user_id=DEFAULT_USER_ID):
    conn = get_db()
    with conn:
        conn.execute("DELETE FROM transactions WHERE userId = ?", (user_id,))
        conn.execute("DELETE FROM tags WHERE userId = ?", (user_id,))
        conn.execute("DELETE FROM rules WHERE userId = ?", (user_id,))
        conn.execute("DELETE FROM user_settings WHERE userId = ?", (user_id,))
        conn.execute("DELETE FROM documents WHERE userId = ?", (user_id,))
        conn.execute("DELETE FROM financial_accounts WHERE userId = ?", (user_id,))
        conn.execute("DELETE FROM assets WHERE userId = ?", (user_id,))
    conn.close()

    init_user_settings_if_missing(user_id)
    if user_id == DEFAULT_USER_ID:
        seed_initial_accounts_if_empty(user_id)

    reset_iso = datetime.utcnow().isoformat() + "Z"
    update_preferences({
        "driveResetAt": reset_iso,
        "freshStart": True
    }, user_id=user_id)

    return get_state(user_id)


# ================= FINANCIAL ACCOUNTS & RECURRING OBLIGATIONS =================

def seed_initial_accounts_if_empty(user_id=DEFAULT_USER_ID):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM financial_accounts WHERE userId = ?", (user_id,))
    if cur.fetchone()[0] == 0:
        now_str = datetime.utcnow().strftime("%Y-%m-%d")
        now_iso = datetime.utcnow().isoformat() + "Z"
        
        initial = [
            ('acc_mortgage_1', 'mortgage', 'Primary Residence 30-Yr Fixed', 'Chase Home Lending', '4912', 385400.0, 4.125, 2485.0, 'monthly', 1, '2026-10-01', '2026-09-01', 1, '2052-04-01', 0.0, 'P&I + Escrow (property taxes & hazard insurance). Semi-annual escrow review in October.', 'active', now_iso, now_iso, user_id),
            ('acc_auto_1', 'auto_loan', 'Model Y Long Range Auto Loan', 'Tesla Finance', '8103', 21800.0, 3.99, 540.0, 'monthly', 15, '2026-09-15', '2026-08-15', 1, '2028-06-15', 0.0, 'Low APR 60-mo term. Autopay linked to Main Checking.', 'active', now_iso, now_iso, user_id),
            ('acc_cc_1', 'credit_card', 'Chase Sapphire Reserve', 'JPMorgan Chase', '4920', 3450.0, 22.49, 150.0, 'monthly', 20, '2026-09-20', '2026-08-20', 1, '', 25000.0, 'Statement balance $3,450 (Credit limit $25k). Autopay full balance scheduled on 20th.', 'active', now_iso, now_iso, user_id),
            ('acc_cc_2', 'credit_card', 'American Express Gold Card', 'American Express', '8104', 1820.0, 20.99, 1820.0, 'monthly', 25, '2026-09-25', '2026-08-25', 1, '', 15000.0, 'Dining & travel card. Autopay configured to pay full statement balance.', 'active', now_iso, now_iso, user_id),
            ('acc_loan_1', 'personal_loan', 'Education Consolidation Loan', 'SoFi Lending Corp', '6720', 11500.0, 4.75, 285.0, 'monthly', 8, '2026-09-08', '2026-08-08', 1, '2027-11-01', 0.0, 'Fixed interest rate. 14 months remaining to full payoff.', 'active', now_iso, now_iso, user_id),
            ('acc_ins_1', 'insurance', 'Comprehensive Homeowners Policy', 'State Farm', '3921', 0.0, 0.0, 1420.0, 'annual', 15, '2026-11-15', '2025-11-15', 1, '2026-11-15', 650000.0, 'Dwelling $650k, Personal property $350k, Liability $500k. Paid annually.', 'active', now_iso, now_iso, user_id),
            ('acc_ins_2', 'insurance', 'Multi-Vehicle Full Coverage', 'GEICO Preferred', '4919', 0.0, 0.0, 175.0, 'monthly', 5, '2026-09-05', '2026-08-05', 1, '2027-02-01', 500000.0, '$500 deductible, collision + comprehensive + roadside assistance.', 'active', now_iso, now_iso, user_id),
            ('acc_ins_3', 'insurance', '20-Yr Level Term Life Insurance', 'Lincoln Financial Group', '1029', 0.0, 0.0, 68.0, 'monthly', 12, '2026-09-12', '2026-08-12', 1, '2042-08-01', 1000000.0, '$1,000,000 death benefit for family protection. Level premium guaranteed.', 'active', now_iso, now_iso, user_id)
        ]

        with conn:
            for acc in initial:
                conn.execute('''
                    INSERT INTO financial_accounts (
                      id, category, name, institution, accountNumberLast4, balance, interestRate,
                      paymentAmount, paymentFrequency, dueDay, nextDueDate, lastPaidDate, autoPay,
                      maturityDate, coverageAmount, notes, status, createdAt, updatedAt, userId
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', acc)
    conn.close()

def get_financial_accounts(user_id=DEFAULT_USER_ID):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM financial_accounts WHERE userId = ? ORDER BY nextDueDate ASC, dueDay ASC", (user_id,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    today_dt = datetime.strptime(today_str, "%Y-%m-%d")

    enriched = []
    for r in rows:
        next_due = r.get("nextDueDate") or today_str
        try:
            due_dt = datetime.strptime(next_due[:10], "%Y-%m-%d")
            days_diff = (due_dt - today_dt).days
        except Exception:
            days_diff = 30

        if days_diff < 0:
            due_status = 'overdue'
        elif days_diff == 0:
            due_status = 'due_today'
        elif days_diff <= 7:
            due_status = 'due_soon'
        elif days_diff <= 15:
            due_status = 'upcoming_15'
        else:
            due_status = 'upcoming'

        enriched.append({
            **r,
            "autoPay": bool(r.get("autoPay")),
            "daysUntilDue": days_diff,
            "dueStatus": due_status
        })

    return enriched

def save_financial_account(data, user_id=DEFAULT_USER_ID):
    conn = get_db()
    acc_id = data.get("id") or f"acc_{int(datetime.utcnow().timestamp()*1000)}"
    cat = str(data.get("category") or "bank").strip()
    name = str(data.get("name") or "Financial Account").strip()
    inst = str(data.get("institution") or "").strip()
    last4 = str(data.get("accountNumberLast4") or "").strip()
    balance = float(data.get("balance") or 0)
    rate = float(data.get("interestRate") or 0)
    payment = float(data.get("paymentAmount") or 0)
    freq = str(data.get("paymentFrequency") or "monthly").strip().lower()
    due_day = int(data.get("dueDay") or 1)
    next_due = str(data.get("nextDueDate") or datetime.utcnow().strftime("%Y-%m-%d")).strip()
    last_paid = data.get("lastPaidDate")
    autopay = 1 if data.get("autoPay") else 0
    maturity = str(data.get("maturityDate") or "").strip()
    coverage = float(data.get("coverageAmount") or 0)
    notes = str(data.get("notes") or "").strip()
    status = str(data.get("status") or "active").strip()
    now_iso = datetime.utcnow().isoformat() + "Z"
    created_at = data.get("createdAt") or now_iso

    with conn:
        conn.execute('''
            INSERT INTO financial_accounts (
              id, category, name, institution, accountNumberLast4, balance, interestRate,
              paymentAmount, paymentFrequency, dueDay, nextDueDate, lastPaidDate, autoPay,
              maturityDate, coverageAmount, notes, status, createdAt, updatedAt, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              category = excluded.category,
              name = excluded.name,
              institution = excluded.institution,
              accountNumberLast4 = excluded.accountNumberLast4,
              balance = excluded.balance,
              interestRate = excluded.interestRate,
              paymentAmount = excluded.paymentAmount,
              paymentFrequency = excluded.paymentFrequency,
              dueDay = excluded.dueDay,
              nextDueDate = excluded.nextDueDate,
              lastPaidDate = excluded.lastPaidDate,
              autoPay = excluded.autoPay,
              maturityDate = excluded.maturityDate,
              coverageAmount = excluded.coverageAmount,
              notes = excluded.notes,
              status = excluded.status,
              updatedAt = excluded.updatedAt
        ''', (
            acc_id, cat, name, inst, last4, balance, rate, payment, freq, due_day,
            next_due, last_paid, autopay, maturity, coverage, notes, status, created_at, now_iso, user_id
        ))
    conn.close()

    accounts = get_financial_accounts(user_id)
    for a in accounts:
        if a["id"] == acc_id:
            return a
    return {"id": acc_id, "name": name}

def patch_financial_account(acc_id, patch_data, user_id=DEFAULT_USER_ID):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM financial_accounts WHERE id = ? AND userId = ?", (acc_id, user_id))
    row = cur.fetchone()
    if not row:
        conn.close()
        return None
    curr = dict(row)
    curr.update(patch_data)
    curr["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    conn.close()
    return save_financial_account(curr, user_id)

def delete_financial_account(acc_id, user_id=DEFAULT_USER_ID):
    conn = get_db()
    with conn:
        res = conn.execute("DELETE FROM financial_accounts WHERE id = ? AND userId = ?", (acc_id, user_id))
        count = res.rowcount
    conn.close()
    return count > 0

def mark_account_paid(acc_id, user_id=DEFAULT_USER_ID):
    accounts = get_financial_accounts(user_id)
    target = None
    for a in accounts:
        if a["id"] == acc_id:
            target = a
            break
    if not target:
        return None

    freq = target.get("paymentFrequency") or "monthly"
    current_due_str = target.get("nextDueDate") or datetime.utcnow().strftime("%Y-%m-%d")
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    try:
        dt = datetime.strptime(current_due_str[:10], "%Y-%m-%d")
    except Exception:
        dt = datetime.utcnow()

    # Calculate next due date based on frequency
    year = dt.year
    month = dt.month
    day = dt.day

    if freq == 'monthly':
        if month == 12:
            month = 1
            year += 1
        else:
            month += 1
    elif freq == 'biweekly':
        from datetime import timedelta
        dt = dt + timedelta(days=14)
        year, month, day = dt.year, dt.month, dt.day
    elif freq == 'quarterly':
        month += 3
        if month > 12:
            month -= 12
            year += 1
    elif freq == 'semiannual':
        month += 6
        if month > 12:
            month -= 12
            year += 1
    elif freq == 'annual':
        year += 1

    # Keep day within month bounds
    import calendar
    max_day = calendar.monthrange(year, month)[1]
    safe_day = min(day, max_day)
    next_due_date = f"{year:04d}-{month:02d}-{safe_day:02d}"

    updated = patch_financial_account(acc_id, {
        "nextDueDate": next_due_date,
        "lastPaidDate": today_str
    }, user_id=user_id)

    return updated
