"""
Generic Multi-Bank Statement Extractor & Session Manager
Supports US and International banks (Chase, Bank of America, Capital One, Citi, Amex, Wells Fargo, HDFC, SBI, ICICI, etc.)
Uses Playwright Persistent Browser Profiles & macOS Keychain for seamless 2FA and SiteMinder session persistence.
"""

import os
import json
import sqlite3
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any

from keychain import get_keychain_credential, get_keychain_status

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
SESSIONS_DIR = DATA_DIR / "bank_sessions"
PROFILES_DIR = DATA_DIR / "bank_profiles"
STATEMENTS_DIR = DATA_DIR / "statements"
DB_PATH = DATA_DIR / "ledgerly.db"

SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
PROFILES_DIR.mkdir(parents=True, exist_ok=True)
STATEMENTS_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------
# 1. Generic Bank Registry
# -------------------------------------------------------------
BANK_REGISTRY: Dict[str, Dict[str, Any]] = {
    "chase": {
        "id": "chase",
        "name": "JPMorgan Chase Bank",
        "category": "Banking & Credit Cards",
        "country": "US",
        "loginUrl": "https://secure01a.chase.com/web/auth/dashboard",
        "statementsUrl": "https://secure.chase.com/web/auth/dashboard#/dashboard/documents",
        "logo": "🏛️",
        "userFieldSelector": "#userId-input, input[name='userId'], input[id*='userId']",
        "passFieldSelector": "#password-input, input[name='password'], input[id*='password']",
        "statementKeywords": ["statements", "documents", "e-documents"]
    },
    "bofa": {
        "id": "bofa",
        "name": "Bank of America",
        "category": "Checking, Savings & Cards",
        "country": "US",
        "loginUrl": "https://secure.bankofamerica.com/myaccounts/brain/redirect.go?target=overview",
        "statementsUrl": "https://secure.bankofamerica.com/myaccounts/brain/redirect.go?target=statements",
        "logo": "🔴",
        "userFieldSelector": "#onlineId1, input[name='onlineId'], input[id*='onlineId']",
        "passFieldSelector": "#passcode1, input[name='passcode'], input[id*='passcode']",
        "statementKeywords": ["statements & documents", "statements", "e-delivery", "view statements"]
    },
    "capitalone": {
        "id": "capitalone",
        "name": "Capital One",
        "category": "Credit Cards & Banking",
        "country": "US",
        "loginUrl": "https://verified.capitalone.com/auth/signin",
        "statementsUrl": "https://verified.capitalone.com/auth/signin",
        "logo": "💳",
        "userFieldSelector": "#ods-input-0, input[name='username'], input[id*='user']",
        "passFieldSelector": "#ods-input-1, input[name='password'], input[id*='pass']",
        "statementKeywords": ["statements", "view statements", "documents"]
    },
    "citi": {
        "id": "citi",
        "name": "Citibank / Citi Cards",
        "category": "Credit Cards & Banking",
        "country": "US",
        "loginUrl": "https://online.citi.com/US/ag/documents",
        "statementsUrl": "https://online.citi.com/US/ag/documents",
        "logo": "🌐",
        "userFieldSelector": "#username, input[name='username'], input[id*='user']",
        "passFieldSelector": "#password, input[name='password'], input[id*='pass']",
        "statementKeywords": ["statements", "documents", "view statements"]
    },
    "amex": {
        "id": "amex",
        "name": "American Express",
        "category": "Cards & High Yield Savings",
        "country": "US",
        "loginUrl": "https://global.americanexpress.com/activity/statements",
        "statementsUrl": "https://global.americanexpress.com/activity/statements",
        "logo": "🛡️",
        "userFieldSelector": "#eliloUserID, input[name='UserID'], input[id*='user']",
        "passFieldSelector": "#eliloPassword, input[name='Password'], input[id*='pass']",
        "statementKeywords": ["statements", "activity", "download"]
    },
    "wellsfargo": {
        "id": "wellsfargo",
        "name": "Wells Fargo",
        "category": "Banking & Lending",
        "country": "US",
        "loginUrl": "https://connect.secure.wellsfargo.com/auth/login/present",
        "statementsUrl": "https://connect.secure.wellsfargo.com/auth/login/present",
        "logo": "🐎",
        "userFieldSelector": "#j_username, input[name='j_username'], input[id*='user']",
        "passFieldSelector": "#j_password, input[name='j_password'], input[id*='pass']",
        "statementKeywords": ["statements & documents", "view statements"]
    },
    "hdfc": {
        "id": "hdfc",
        "name": "HDFC Bank NetBanking",
        "category": "Savings, Salary & Cards",
        "country": "IN",
        "loginUrl": "https://netbanking.hdfcbank.com/netbanking/",
        "statementsUrl": "https://netbanking.hdfcbank.com/netbanking/entry",
        "logo": "🏢",
        "userFieldSelector": "input[name='fldLoginUserId'], input[id*='user']",
        "passFieldSelector": "input[name='fldPassword'], input[type='password']",
        "statementKeywords": ["enquire", "account statement", "download statement"]
    },
    "sbi": {
        "id": "sbi",
        "name": "State Bank of India (OnlineSBI)",
        "category": "Retail NetBanking & Cards",
        "country": "IN",
        "loginUrl": "https://retail.onlinesbi.sbi/retail/login.htm",
        "statementsUrl": "https://retail.onlinesbi.sbi/retail/accountstatement.htm",
        "logo": "🔵",
        "userFieldSelector": "#username, input[name='userName'], input[id*='user']",
        "passFieldSelector": "#label2, input[name='password'], input[id*='pass']",
        "statementKeywords": ["account statement", "my accounts", "e-statement"]
    },
    "icici": {
        "id": "icici",
        "name": "ICICI Bank Infinity",
        "category": "NetBanking & Credit Cards",
        "country": "IN",
        "loginUrl": "https://infinity.icicibank.com",
        "statementsUrl": "https://infinity.icicibank.com/corp/AuthenticationController",
        "logo": "🔶",
        "userFieldSelector": "#DUMMY_USER_ID, input[name='USER_ID'], input[id*='user']",
        "passFieldSelector": "#AuthenticationFG.ACCESS_CODE, input[type='password']",
        "statementKeywords": ["e-statement", "statement", "statements"]
    }
}

STEALTH_JS = '''
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
try { delete navigator.__proto__.webdriver; } catch (e) {}
window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
'''

# -------------------------------------------------------------
# 2. Database Schema & State Management
# -------------------------------------------------------------
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_bank_connections_table():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS bank_connections (
            id TEXT PRIMARY KEY,
            bank_id TEXT NOT NULL,
            name TEXT NOT NULL,
            country TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'disconnected',
            session_file TEXT,
            last_login TEXT,
            last_synced TEXT,
            download_count INTEGER DEFAULT 0,
            auto_sync_enabled INTEGER DEFAULT 1,
            custom_config TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )
    """)
    conn.commit()
    conn.close()

init_bank_connections_table()

def get_bank_profile_dir(bank_id: str) -> Path:
    p = PROFILES_DIR / bank_id
    p.mkdir(parents=True, exist_ok=True)
    return p

def inspect_session_expiry(bank_id: str) -> Dict[str, Any]:
    bank_id = str(bank_id).replace("conn_", "").lower()
    profile_dir = get_bank_profile_dir(bank_id)
    sess_file = SESSIONS_DIR / f"{bank_id}_session.json"
    
    # Check if profile dir has contents or session file exists
    has_profile = any(profile_dir.iterdir()) if profile_dir.exists() else False
    has_session = (sess_file.exists() and sess_file.stat().st_size > 50) or has_profile

    if not has_session:
        return {
            "hasSession": False,
            "status": "disconnected",
            "expiresAt": None,
            "daysRemaining": 0,
            "cookieCount": 0,
            "expirySummary": "Not connected"
        }

    # If session file exists, check cookies
    if sess_file.exists():
        try:
            data = json.loads(sess_file.read_text())
            cookies = data.get("cookies") or []
            now_ts = datetime.now().timestamp()
            valid_expiries = [c["expires"] for c in cookies if c.get("expires", -1) > now_ts]
            if valid_expiries:
                max_exp = max(valid_expiries)
                days_left = max(0, int((max_exp - now_ts) / 86400))
                status = "expiring_soon" if days_left <= 7 else "active"
                return {
                    "hasSession": True,
                    "status": status,
                    "expiresAt": datetime.fromtimestamp(max_exp).isoformat(),
                    "daysRemaining": days_left,
                    "cookieCount": len(cookies),
                    "expirySummary": f"{days_left} days remaining"
                }
        except Exception:
            pass

    # Default profile age calculation
    mtime = sess_file.stat().st_mtime if sess_file.exists() else (profile_dir.stat().st_mtime if profile_dir.exists() else datetime.now().timestamp())
    days_since = int((datetime.now().timestamp() - mtime) / 86400)
    days_left = max(0, 30 - days_since)
    status = "active" if days_left > 0 else "expired"
    if days_left <= 7 and days_left > 0:
        status = "expiring_soon"

    return {
        "hasSession": True,
        "status": status,
        "expiresAt": datetime.fromtimestamp(mtime + (30 * 86400)).isoformat(),
        "daysRemaining": days_left,
        "cookieCount": 50,
        "expirySummary": f"{days_left} days remaining" if days_left > 0 else "Session expired"
    }

def get_all_bank_connections() -> List[Dict[str, Any]]:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM bank_connections")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    existing_map = {r["bank_id"]: r for r in rows}
    results = []

    for bid, reg in BANK_REGISTRY.items():
        expiry_info = inspect_session_expiry(bid)
        keychain_info = get_keychain_status(bid)
        has_session = expiry_info["hasSession"]

        if bid in existing_map:
            row = existing_map[bid]
            curr_status = expiry_info["status"] if has_session else "disconnected"
            results.append({
                **reg,
                **row,
                "status": curr_status if row.get("status") != "syncing" else "syncing",
                "hasSession": has_session,
                "expiryInfo": expiry_info,
                "keychain": keychain_info
            })
        else:
            results.append({
                **reg,
                "bank_id": bid,
                "status": expiry_info["status"] if has_session else "disconnected",
                "last_login": None,
                "last_synced": None,
                "download_count": 0,
                "auto_sync_enabled": 1,
                "hasSession": has_session,
                "expiryInfo": expiry_info,
                "keychain": keychain_info
            })

    return results

def get_bank_config(bank_id: str) -> Optional[Dict[str, Any]]:
    bank_id = str(bank_id).replace("conn_", "").lower()
    if bank_id in BANK_REGISTRY:
        return BANK_REGISTRY[bank_id]
    
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM bank_connections WHERE bank_id = ?", (bank_id,))
    row = cur.fetchone()
    conn.close()
    if row:
        custom = json.loads(row["custom_config"] or "{}")
        return {
            "id": row["bank_id"],
            "name": row["name"],
            "country": row["country"],
            "loginUrl": custom.get("loginUrl", ""),
            "statementsUrl": custom.get("statementsUrl", ""),
            "logo": custom.get("logo", "🏦"),
            "statementKeywords": custom.get("statementKeywords", ["statements"])
        }
    return None

def update_connection_status(bank_id: str, status: str, last_login: Optional[str] = None, last_synced: Optional[str] = None, increment_downloads: int = 0):
    bank_id = str(bank_id).replace("conn_", "").lower()
    conn = get_db()
    cur = conn.cursor()
    now_iso = datetime.now().isoformat()
    
    cur.execute("SELECT * FROM bank_connections WHERE bank_id = ?", (bank_id,))
    existing = cur.fetchone()
    
    reg = BANK_REGISTRY.get(bank_id, {"name": bank_id.upper(), "country": "US"})
    sess_file = str(SESSIONS_DIR / f"{bank_id}_session.json")

    if existing:
        updates = ["status = ?", "updatedAt = ?"]
        params = [status, now_iso]
        if last_login:
            updates.append("last_login = ?")
            params.append(last_login)
        if last_synced:
            updates.append("last_synced = ?")
            params.append(last_synced)
        if increment_downloads > 0:
            updates.append("download_count = download_count + ?")
            params.append(increment_downloads)
        params.append(bank_id)
        cur.execute(f"UPDATE bank_connections SET {', '.join(updates)} WHERE bank_id = ?", params)
    else:
        cur.execute("""
            INSERT INTO bank_connections (id, bank_id, name, country, status, session_file, last_login, last_synced, download_count, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"conn_{bank_id}",
            bank_id,
            reg["name"],
            reg["country"],
            status,
            sess_file,
            last_login or now_iso,
            last_synced,
            increment_downloads,
            now_iso,
            now_iso
        ))
    conn.commit()
    conn.close()

# -------------------------------------------------------------
# 3. Interactive Playwright Auth with Persistent Profile & Keychain
# -------------------------------------------------------------
def run_interactive_auth_session(bank_id: str):
    bank_id = str(bank_id).replace("conn_", "").lower()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise ImportError("Playwright is not installed. Please run: pip install playwright && playwright install chromium")

    config = get_bank_config(bank_id)
    if not config:
        raise ValueError(f"Unknown bank ID: {bank_id}")

    profile_dir = get_bank_profile_dir(bank_id)
    session_file = SESSIONS_DIR / f"{bank_id}_session.json"
    login_url = config.get("loginUrl") or "https://www.google.com"

    keychain_creds = get_keychain_credential(bank_id)
    username = keychain_creds.get("username") if keychain_creds else None
    password = keychain_creds.get("password") if keychain_creds else None

    print(f"\n🚀 [Interactive Session] Launching browser profile for {config['name']}...")
    if username:
        print(f"🔐 Found macOS Keychain credential for user: {username[:3]}***")

    with sync_playwright() as p:
        launch_kwargs = {
            "headless": False,
            "ignore_default_args": ["--enable-automation"],
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--no-default-browser-check",
                "--no-first-run",
                "--disable-infobars"
            ]
        }
        if Path("/Applications/Google Chrome.app").exists():
            launch_kwargs["channel"] = "chrome"

        context = p.chromium.launch_persistent_context(
            str(profile_dir),
            viewport={"width": 1280, "height": 850},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            **launch_kwargs
        )
        context.add_init_script(STEALTH_JS)
        page = context.new_page()

        print(f"👉 Navigating to {config['name']} ({login_url})...")
        try:
            page.goto(login_url, timeout=60000, wait_until="domcontentloaded")
        except Exception as e:
            print(f"Initial navigation note: {e}")

        # Autofill Keychain credentials
        if username or password:
            try:
                page.wait_for_timeout(2000)
                u_sel = config.get("userFieldSelector")
                p_sel = config.get("passFieldSelector")
                if username and u_sel:
                    u_elem = page.locator(u_sel).first
                    if u_elem.is_visible():
                        u_elem.fill(username)
                        print(f"✨ Auto-filled username from macOS Keychain for {config['name']}")
                if password and p_sel:
                    p_elem = page.locator(p_sel).first
                    if p_elem.is_visible():
                        p_elem.fill(password)
                        print(f"✨ Auto-filled password from macOS Keychain for {config['name']}")
            except Exception as fe:
                print(f"Autofill note: {fe}")

        print("⏳ Waiting for user to complete login & 2FA on screen (timeout 300s)...")
        start_time = datetime.now()
        while (datetime.now() - start_time).total_seconds() < 300:
            try:
                if page.is_closed():
                    break
                curr_url = page.url.lower()
                if any(k in curr_url for k in ["dashboard", "myaccounts", "accounts", "portfolio", "overview", "entry", "accountstatement"]):
                    page.wait_for_timeout(4000)
                    break
            except Exception:
                break
            page.wait_for_timeout(2000)

        # Save cookies & storage state backup
        try:
            context.storage_state(path=str(session_file))
            print(f"✅ Saved persistent auth session to: {session_file}")
            update_connection_status(bank_id, "active", last_login=datetime.now().isoformat())
        except Exception as e:
            print(f"⚠️ Error saving session state: {e}")

        try:
            context.close()
        except Exception:
            pass

    return {
        "bank_id": bank_id,
        "name": config["name"],
        "status": "active",
        "expiryInfo": inspect_session_expiry(bank_id)
    }

# -------------------------------------------------------------
# 4. Headless Automated Statement Extractor
# -------------------------------------------------------------
async def run_headless_statement_extraction(bank_id: str) -> Dict[str, Any]:
    bank_id = str(bank_id).replace("conn_", "").lower()
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise ImportError("Playwright is not installed. Please run: pip install playwright && playwright install chromium")

    from pdf_parser import parse_pdf_bank_statement
    import db

    config = get_bank_config(bank_id)
    if not config:
        raise ValueError(f"Unknown bank ID: {bank_id}")

    profile_dir = get_bank_profile_dir(bank_id)
    session_file = SESSIONS_DIR / f"{bank_id}_session.json"
    bank_downloads_dir = STATEMENTS_DIR / bank_id
    bank_downloads_dir.mkdir(parents=True, exist_ok=True)
    drive_inbox_dir = BASE_DIR / "storage" / "bucket" / "drive-inbox"
    drive_inbox_dir.mkdir(parents=True, exist_ok=True)

    update_connection_status(bank_id, "syncing")
    downloaded_files = []
    imported_docs = []
    total_tx_imported = 0

    try:
        async with async_playwright() as p:
            launch_kwargs = {
                "headless": True,
                "ignore_default_args": ["--enable-automation"],
                "args": [
                    "--disable-blink-features=AutomationControlled",
                    "--no-default-browser-check",
                    "--no-first-run"
                ]
            }
            if Path("/Applications/Google Chrome.app").exists():
                launch_kwargs["channel"] = "chrome"

            context = await p.chromium.launch_persistent_context(
                str(profile_dir),
                accept_downloads=True,
                viewport={"width": 1280, "height": 850},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                **launch_kwargs
            )
            await context.add_init_script(STEALTH_JS)
            page = await context.new_page()

            # Handle PDF downloads opened via popups or new tabs
            async def handle_popup(popup_page):
                try:
                    await popup_page.wait_for_load_state("domcontentloaded", timeout=10000)
                    popup_url = popup_page.url
                    if ".pdf" in popup_url.lower() or "statement" in popup_url.lower():
                        content = await popup_page.content()
                        # If raw PDF or response
                        print(f"Captured statement popup URL: {popup_url}")
                except Exception as pe:
                    print(f"Popup handle note: {pe}")

            context.on("page", handle_popup)

            stmts_url = config.get("statementsUrl") or config.get("loginUrl")
            print(f"🌐 [Headless Extractor] Navigating to {config['name']} ({stmts_url})...")
            
            try:
                await page.goto(stmts_url, timeout=50000, wait_until="domcontentloaded")
                await page.wait_for_timeout(4000)
            except Exception as nav_err:
                print(f"Navigation note: {nav_err}")

            # Check if redirected to login / session expired
            curr_url = page.url.lower()
            if "login" in curr_url and "dashboard" not in curr_url and "overview" not in curr_url and "statement" not in curr_url:
                update_connection_status(bank_id, "expired")
                await context.close()
                return {
                    "bank_id": bank_id,
                    "status": "expired",
                    "error": "Session has expired. Please click 'Refresh 2FA Login' to re-authenticate."
                }

            # Multi-Selector Strategy for Statements
            candidate_selectors = [
                "a:has-text('Download PDF')",
                "button:has-text('Download PDF')",
                "a:has-text('View PDF')",
                "a:has-text('Download Statement')",
                "button:has-text('Download Statement')",
                "a:has-text('Download')",
                "a[href*='.pdf']",
                "a[href*='statement']",
                "a[href*='download']",
                "a[title*='Statement']",
                "a[id*='stmt']"
            ]

            print(f"🔍 Locating available statement links...")
            found_download = False

            for sel in candidate_selectors:
                try:
                    elems = await page.locator(sel).all()
                    if elems and len(elems) > 0:
                        print(f"Found {len(elems)} statement elements matching '{sel}'!")
                        target_elem = elems[0]
                        if await target_elem.is_visible():
                            try:
                                async with page.expect_download(timeout=15000) as download_info:
                                    await target_elem.click()
                                download = await download_info.value
                                filename = f"{bank_id}_statement_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                                local_path = bank_downloads_dir / filename
                                inbox_path = drive_inbox_dir / filename
                                await download.save_as(str(local_path))
                                with open(local_path, "rb") as sf, open(inbox_path, "wb") as df:
                                    df.write(sf.read())
                                downloaded_files.append(str(local_path))
                                found_download = True
                                break
                            except Exception as click_dl_err:
                                print(f"Download trigger note on {sel}: {click_dl_err}")
                except Exception:
                    continue

            await context.close()

        # Parse downloaded statements into Ledgerly DB
        for fp in downloaded_files:
            file_bytes = open(fp, "rb").read()
            doc_id = f"doc_{int(datetime.now().timestamp()*1000)}"
            fname = Path(fp).name
            
            doc_record = {
                "id": doc_id,
                "filename": fname,
                "type": "application/pdf",
                "size": len(file_bytes),
                "source": "automated_bank_connector",
                "bank": config["name"],
                "account": config["name"],
                "url": f"/api/documents/{doc_id}/download",
                "createdAt": datetime.now().isoformat()
            }
            db.save_document(doc_record)
            imported_docs.append(doc_record)

            try:
                parsed = parse_pdf_bank_statement(file_bytes, {"account": config["name"]})
                for tx in parsed.get("transactions", []):
                    db.save_transaction(tx)
                    total_tx_imported += 1
            except Exception as parse_e:
                print(f"Error parsing downloaded PDF: {parse_e}")

        now_iso = datetime.now().isoformat()
        update_connection_status(
            bank_id,
            status="active",
            last_synced=now_iso,
            increment_downloads=len(downloaded_files)
        )

        return {
            "bank_id": bank_id,
            "status": "success",
            "filesDownloaded": len(downloaded_files),
            "transactionsImported": total_tx_imported,
            "documents": imported_docs,
            "lastSynced": now_iso
        }

    except Exception as e:
        print(f"❌ Error during headless extraction for {bank_id}: {e}")
        update_connection_status(bank_id, "active")
        return {
            "bank_id": bank_id,
            "status": "error",
            "error": str(e)
        }

def disconnect_bank_session(bank_id: str):
    bank_id = str(bank_id).replace("conn_", "").lower()
    sess_file = SESSIONS_DIR / f"{bank_id}_session.json"
    if sess_file.exists():
        sess_file.unlink()
    profile_dir = get_bank_profile_dir(bank_id)
    if profile_dir.exists():
        import shutil
        shutil.rmtree(str(profile_dir), ignore_errors=True)
    update_connection_status(bank_id, "disconnected")
    return {"status": "disconnected", "bank_id": bank_id}
