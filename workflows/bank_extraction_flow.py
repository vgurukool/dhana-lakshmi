"""
Prefect Workflow: Bank Statement Extraction Engine
Orchestrates Playwright headless extraction, document parsing, and database ingestion with full task tracing.
Features strict authentication checks, macOS Keychain auto-sign-in, and dual download/popup PDF capture.
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

WORKFLOW_DIR = Path(__file__).parent
BASE_DIR = WORKFLOW_DIR.parent
SERVER_DIR = BASE_DIR / "server"
DATA_DIR = BASE_DIR / "data"
STATEMENTS_DIR = DATA_DIR / "statements"
DRIVE_INBOX_DIR = BASE_DIR / "storage" / "bucket" / "drive-inbox"

sys.path.insert(0, str(SERVER_DIR))

from prefect import task, flow, get_run_logger
from playwright.async_api import async_playwright
from bank_connectors import (
    get_bank_config,
    get_bank_profile_dir,
    update_connection_status,
    STEALTH_JS,
    BANK_REGISTRY
)
from keychain import get_keychain_credential
from pdf_parser import parse_pdf_bank_statement
import db

# -------------------------------------------------------------
# Task 1: Load Credentials & Validate Persistent Session
# -------------------------------------------------------------
@task(name="Validate Bank Profile & Credentials", retries=1)
def validate_bank_session_task(bank_id: str) -> Dict[str, Any]:
    logger = get_run_logger()
    bank_id = str(bank_id).replace("conn_", "").lower()
    
    config = get_bank_config(bank_id)
    if not config:
        raise ValueError(f"Bank ID '{bank_id}' is not registered in Dhana Lakshmi.")

    profile_dir = get_bank_profile_dir(bank_id)
    session_file = DATA_DIR / "bank_sessions" / f"{bank_id}_session.json"
    
    has_profile = any(profile_dir.iterdir()) if profile_dir.exists() else False
    has_session = (session_file.exists() and session_file.stat().st_size > 50) or has_profile
    
    kc = get_keychain_credential(bank_id)
    logger.info(f"🏦 Target Institution: {config['name']} ({config['country']})")
    if kc and kc.get("username"):
        logger.info(f"🔐 Found macOS Keychain credentials for user: {kc['username'][:3]}***")
    else:
        logger.info("ℹ️ No macOS Keychain credentials found. Using saved browser session.")

    return {
        "bank_id": bank_id,
        "name": config["name"],
        "country": config["country"],
        "loginUrl": config.get("loginUrl"),
        "statementsUrl": config.get("statementsUrl"),
        "profileDir": str(profile_dir),
        "hasSession": has_session,
        "hasKeychain": bool(kc and kc.get("username")),
        "userFieldSelector": config.get("userFieldSelector"),
        "passFieldSelector": config.get("passFieldSelector")
    }

# -------------------------------------------------------------
# Task 2: Playwright Headless Statement Downloader
# -------------------------------------------------------------
@task(name="Playwright Headless Statement Downloader", retries=1, retry_delay_seconds=3)
async def playwright_download_task(bank_info: Dict[str, Any]) -> List[str]:
    logger = get_run_logger()
    bank_id = bank_info["bank_id"]
    bank_name = bank_info["name"]
    profile_dir = Path(bank_info["profileDir"])
    stmts_url = bank_info.get("statementsUrl") or bank_info.get("loginUrl")
    
    bank_downloads_dir = STATEMENTS_DIR / bank_id
    bank_downloads_dir.mkdir(parents=True, exist_ok=True)
    DRIVE_INBOX_DIR.mkdir(parents=True, exist_ok=True)

    downloaded_files = []
    logger.info(f"🌐 Launching headless browser with profile: {profile_dir}...")

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

    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            str(profile_dir),
            accept_downloads=True,
            viewport={"width": 1280, "height": 850},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            **launch_kwargs
        )
        await context.add_init_script(STEALTH_JS)
        page = await context.new_page()

        logger.info(f"👉 Navigating to {bank_name} ({stmts_url})...")
        try:
            await page.goto(stmts_url, timeout=50000, wait_until="domcontentloaded")
            await page.wait_for_timeout(5000)
        except Exception as ne:
            logger.warning(f"Navigation warning: {ne}")

        curr_url = page.url.lower()
        title = await page.title()
        logger.info(f"📍 Landed URL: {page.url} | Title: '{title}'")

        # Check if landed on unauthenticated login page
        is_authenticated = any(k in curr_url for k in ["myaccounts", "dashboard", "e-delivery", "statements/overview", "portfolio", "accountstatement"]) and "smauthreason" not in curr_url
        is_login_page = not is_authenticated and (any(k in curr_url for k in ["login", "signin", "sign-in", "smauthreason", "es/"]) or any(k in title.lower() for k in ["sign in", "log in", "iniciar", "bank of america", "chase online"]))

        if is_login_page and not is_authenticated:
            logger.info("🔑 Landed on login screen — checking for macOS Keychain credentials...")
            kc = get_keychain_credential(bank_id)
            if not kc or not kc.get("username") or not kc.get("password"):
                await context.close()
                raise RuntimeError(
                    f"Authentication required for {bank_name}. Please click '+ Set' under Mac Keychain on the {bank_name} card to store your credentials, or click 'Refresh 2FA Login' in Dhana Lakshmi."
                )

            logger.info(f"✨ Auto-filling {bank_name} credentials from macOS Keychain...")
            u_sel = "#onlineId1, #userId-input, input[name='onlineId'], input[name='userId'], input[name='username'], input[id*='user']"
            p_sel = "#passcode1, #password-input, input[name='passcode'], input[name='password'], input[type='password']"
            
            try:
                if await page.locator(u_sel).first.is_visible():
                    await page.locator(u_sel).first.fill(kc["username"])
                if await page.locator(p_sel).first.is_visible():
                    await page.locator(p_sel).first.fill(kc["password"])

                # Submit form
                submit_sel = "#signIn, button[type='submit'], #signin-button, a[name='enter-online-id'], button:has-text('Sign In'), button:has-text('Iniciar una sesión')"
                submit_elem = page.locator(submit_sel).first
                if await submit_elem.is_visible():
                    await submit_elem.click()
                    logger.info("🚀 Submitted sign-in credentials, waiting for dashboard...")
                    await page.wait_for_timeout(8000)
            except Exception as auto_err:
                logger.warning(f"Keychain sign-in error: {auto_err}")

        # Navigate directly to statements tab once authenticated
        if "myaccounts" in page.url.lower() and "e-delivery" not in page.url.lower() and "statements" not in page.url.lower():
            logger.info("👉 Navigating to Statements & Documents tab...")
            stmt_nav = page.locator("a:has-text('Statements & Documents'), a:has-text('Statements'), a:has-text('e-Delivery')").first
            if await stmt_nav.is_visible():
                await stmt_nav.click()
                await page.wait_for_timeout(4000)

        # Scan for Statement Download Elements (strictly inside authenticated portal)
        candidate_selectors = [
            "a[href*='viewStatement.go']",
            "a:has-text('View statement (PDF)')",
            "a:has-text('Download PDF')",
            "button:has-text('Download PDF')",
            "a:has-text('View PDF')",
            "a:has-text('Download Statement')",
            "button:has-text('Download Statement')",
            "a[href*='.pdf']",
            "a[data-testid*='document-link']",
            "a[title*='Statement']",
            "a[id*='stmt']"
        ]

        logger.info("🔍 Scanning authenticated page for statement download buttons...")
        for sel in candidate_selectors:
            try:
                elems = await page.locator(sel).all()
                if elems and len(elems) > 0:
                    logger.info(f"✨ Found {len(elems)} matching statement elements for '{sel}'!")
                    for target in elems[:3]:
                        if await target.is_visible():
                            try:
                                async with page.expect_download(timeout=10000) as dl_info:
                                    await target.click()
                                download = await dl_info.value
                                filename = f"{bank_id}_statement_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                                out_path = bank_downloads_dir / filename
                                inbox_path = DRIVE_INBOX_DIR / filename
                                
                                await download.save_as(str(out_path))
                                with open(out_path, "rb") as sf, open(inbox_path, "wb") as df:
                                    df.write(sf.read())
                                    
                                downloaded_files.append(str(out_path))
                                logger.info(f"📥 Saved PDF Statement: {filename} ({out_path.stat().st_size} bytes)")
                                break
                            except Exception as click_err:
                                logger.info(f"Direct download note on '{sel}': {click_err}")
                if downloaded_files:
                    break
            except Exception:
                continue

        # Save diagnostic screenshot if 0 files downloaded
        if not downloaded_files:
            ss_path = f"/tmp/{bank_id}_no_statements_debug.png"
            await page.screenshot(path=ss_path, full_page=True)
            logger.warning(f"⚠️ No statements downloaded. Saved debug screenshot to: {ss_path}")

        await context.close()

    if not downloaded_files:
        raise RuntimeError(
            f"0 statement files downloaded for {bank_name}. Please verify you are logged into your account or click 'Refresh 2FA Login' on the {bank_name} card."
        )

    return downloaded_files

# -------------------------------------------------------------
# Task 3: Ingest & Parse Statements into Ledgerly Database
# -------------------------------------------------------------
@task(name="Parse Statements & Ingest into Ledgerly DB")
def parse_and_ingest_statements_task(downloaded_files: List[str], bank_info: Dict[str, Any]) -> Dict[str, Any]:
    logger = get_run_logger()
    bank_id = bank_info["bank_id"]
    bank_name = bank_info["name"]
    
    total_tx = 0
    imported_docs = []

    for fp in downloaded_files:
        file_bytes = open(fp, "rb").read()
        doc_id = f"doc_{int(datetime.now().timestamp()*1000)}"
        fname = Path(fp).name
        
        doc_record = {
            "id": doc_id,
            "filename": fname,
            "type": "application/pdf",
            "size": len(file_bytes),
            "source": "prefect_playwright_workflow",
            "bank": bank_name,
            "account": bank_name,
            "url": f"/api/documents/{doc_id}/download",
            "createdAt": datetime.now().isoformat()
        }
        db.save_document(doc_record)
        imported_docs.append(doc_record)

        try:
            parsed = parse_pdf_bank_statement(file_bytes, {"account": bank_name})
            txs = parsed.get("transactions", [])
            for tx in txs:
                db.save_transaction(tx)
                total_tx += 1
            logger.info(f"📊 Parsed {len(txs)} transactions from {fname}")
        except Exception as pe:
            logger.warning(f"Error parsing PDF {fname}: {pe}")

    now_iso = datetime.now().isoformat()
    update_connection_status(
        bank_id,
        status="active",
        last_synced=now_iso,
        increment_downloads=len(downloaded_files)
    )

    logger.info(f"✅ Ingestion Complete: {len(downloaded_files)} statement(s) downloaded, {total_tx} transaction(s) recorded.")
    return {
        "bank_id": bank_id,
        "filesDownloaded": len(downloaded_files),
        "transactionsImported": total_tx,
        "documents": imported_docs,
        "lastSynced": now_iso
    }

# -------------------------------------------------------------
# Main Prefect Flow: extract_bank_statements_flow
# -------------------------------------------------------------
@flow(name="Bank Statement Extraction Flow", description="Playwright automated bank statement extraction with persistent session handling and ledger ingestion", log_prints=True)
async def extract_bank_statements_flow(bank_id: str) -> Dict[str, Any]:
    logger = get_run_logger()
    logger.info(f"🚀 Starting Prefect Bank Statement Extraction Flow for: {bank_id}")
    
    # 1. Validate credentials & profile
    bank_info = validate_bank_session_task(bank_id)
    
    # 2. Run Playwright headless downloader
    downloaded_files = await playwright_download_task(bank_info)
    
    # 3. Parse & Ingest into Ledgerly DB
    result = parse_and_ingest_statements_task(downloaded_files, bank_info)
    
    logger.info(f"🎉 Flow execution completed successfully for {bank_id}!")
    return result
