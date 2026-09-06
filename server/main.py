import os
import json
import re
from pathlib import Path
from typing import List, Optional, Union, Dict, Any
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db import (
    init_db, get_state, save_transaction, patch_transaction, delete_transaction,
    get_assets, save_asset, patch_asset, delete_asset, update_preferences,
    save_document_record, delete_document_record, store_r2_object, wipe_all_data,
    deduplicate_transactions_in_db, apply_rules_to_all_transactions, sync_assets_setting,
    get_financial_accounts, save_financial_account, patch_financial_account, delete_financial_account, mark_account_paid
)
from csv_parser import parse_csv_bank_statement
from pdf_parser import parse_pdf_bank_statement

init_db()

app = FastAPI(
    title="Dhana Lakshmi (Ledgerly) — Financial Engine API",
    description="Python FastAPI High-Performance Backend for Dhana Lakshmi Personal Finance Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Dhana Lakshmi Financial Platform",
        "framework": "FastAPI",
        "port": 3002
    }

# 4.3 GET /api/state
@app.get("/api/state")
def api_get_state():
    try:
        return get_state()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 4.35 /api/accounts (Financial Accounts, Loans & Obligations)
@app.get("/api/accounts")
def api_get_accounts():
    try:
        accounts = get_financial_accounts()
        return {"accounts": accounts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/accounts")
async def api_save_account(request: Request):
    try:
        data = await request.json()
        saved = save_financial_account(data)
        return {"success": True, "account": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/accounts/{account_id}")
async def api_patch_account(account_id: str, request: Request):
    try:
        patch_data = await request.json()
        updated = patch_financial_account(account_id, patch_data)
        if not updated:
            raise HTTPException(status_code=404, detail="Account not found")
        return {"success": True, "account": updated}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/accounts/{account_id}")
def api_delete_account(account_id: str):
    try:
        deleted = delete_financial_account(account_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Account not found")
        return {"success": True, "deletedId": account_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/accounts/{account_id}/pay")
def api_mark_account_paid(account_id: str):
    try:
        updated = mark_account_paid(account_id)
        if not updated:
            raise HTTPException(status_code=404, detail="Account not found")
        return {"success": True, "account": updated, "message": "Payment recorded and next due date advanced to next cycle."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4.4 /api/transactions
@app.post("/api/transactions")
async def api_save_transactions(request: Request):
    try:
        payload = await request.json()
        items = payload if isinstance(payload, list) else [payload]

        inserted_count = 0
        duplicate_count = 0
        inserted_rows = []

        for item in items:
            if not item.get("merchant") or not item.get("date") or not item.get("amount") or float(item.get("amount") or 0) <= 0:
                continue
            res = save_transaction(item)
            if res.get("duplicate"):
                duplicate_count += 1
            else:
                inserted_count += 1
                inserted_rows.append(res.get("transaction"))

        return {
            "success": True,
            "insertedCount": inserted_count,
            "duplicateCount": duplicate_count,
            "inserted": inserted_rows
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/transactions/{tx_id}")
async def api_patch_transaction(tx_id: str, request: Request):
    try:
        updates = await request.json()
        updated = patch_transaction(tx_id, updates)
        if not updated:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/transactions/{tx_id}")
def api_delete_transaction(tx_id: str):
    try:
        deleted = delete_transaction(tx_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return {"success": True, "deletedId": tx_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# /api/assets Endpoints
@app.get("/api/assets")
def api_get_assets():
    try:
        return get_assets()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/assets")
async def api_create_asset(request: Request):
    try:
        asset_data = await request.json()
        saved = save_asset(asset_data)
        return {"success": True, "asset": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/assets/{asset_id}")
async def api_patch_asset(asset_id: str, request: Request):
    try:
        updates = await request.json()
        updated = patch_asset(asset_id, updates)
        if not updated:
            raise HTTPException(status_code=404, detail="Asset not found")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/assets/{asset_id}")
def api_delete_asset(asset_id: str):
    try:
        deleted = delete_asset(asset_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Asset not found")
        return {"success": True, "deletedId": asset_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4.5 PUT /api/preferences
@app.put("/api/preferences")
async def api_update_preferences(request: Request):
    try:
        body = await request.json()
        update_preferences(body)
        apply_rules_to_all_transactions()
        return get_state()["settings"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/rules/apply
@app.post("/api/rules/apply")
def api_apply_rules():
    try:
        updated_count = apply_rules_to_all_transactions()
        return {"success": True, "updatedCount": updated_count, "state": get_state()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4.6 POST /api/documents (Multipart upload)
@app.post("/api/documents")
async def api_upload_documents(
    files: List[UploadFile] = File(...),
    password: Optional[str] = Form(None),
    source: Optional[str] = Form("upload")
):
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")

        saved_docs = []
        extracted_count = 0

        for file in files:
            file_bytes = await file.read()
            if len(file_bytes) > 20 * 1024 * 1024:
                raise HTTPException(status_code=400, detail=f"File {file.filename} exceeds 20MB limit")

            file_id = f"doc_{int(datetime.now().timestamp()*1000)}"
            safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', file.filename or "uploaded_file")
            object_key = f"uploads/{file_id}-{safe_name}"

            store_r2_object(object_key, file_bytes)
            status = "stored"

            # Parse PDF
            if (file.content_type == "application/pdf") or (file.filename and file.filename.lower().endswith(".pdf")):
                pdf_res = parse_pdf_bank_statement(file_bytes, {"password": password or "30031981"})

                if pdf_res.get("isMutualFundCAS") and pdf_res.get("folios"):
                    for item in pdf_res["folios"]:
                        clean_scheme = re.sub(r'^[A-Z0-9]+-', '', item.get("scheme", "")).split('- ISIN')[0].strip() or "Mutual Fund"
                        save_asset({
                            "id": f"asset_mf_{item.get('folio')}",
                            "name": f"{clean_scheme} (Folio: {item.get('folio')})",
                            "type": "Mutual Funds",
                            "currency": item.get("currency", "INR"),
                            "value": item.get("marketValue", 0.0),
                            "hideFromDashboard": False
                        })

                if pdf_res.get("isFixedDepositSummary"):
                    save_asset({
                        "id": "asset_hdfc_fixed_deposits_total",
                        "name": f"HDFC Fixed Deposits ({pdf_res.get('fdCount', 20)} FDs)",
                        "type": "Fixed Deposit (FD)",
                        "currency": pdf_res.get("currency", "INR"),
                        "value": pdf_res.get("principalAmount", 1393816.12),
                        "hideFromDashboard": False
                    })

                if pdf_res.get("transactions"):
                    for tx in pdf_res["transactions"]:
                        save_transaction(tx)
                        extracted_count += 1

                if pdf_res.get("endingBalance") is not None and pdf_res["endingBalance"] > 0:
                    current_settings = get_state().get("settings") or {}
                    current_balances = current_settings.get("accountBalances") or {}
                    acct_key = pdf_res.get("accountName") or "Bank Account"
                    current_balances[acct_key] = pdf_res["endingBalance"]
                    total_cash = sum(float(b or 0) for b in current_balances.values())

                    update_preferences({
                        "accountBalances": current_balances,
                        "assets": total_cash,
                        "netWorthConfigured": True
                    })

                    if "credit card" not in acct_key.lower():
                        asset_id = f"asset_{re.sub(r'[^a-zA-Z0-9]', '_', acct_key).lower()}"
                        save_asset({
                            "id": asset_id,
                            "name": acct_key,
                            "type": "Cash / Bank Account",
                            "value": pdf_res["endingBalance"],
                            "hideFromDashboard": False
                        })

                status = "processed"

            elif (file.content_type == "text/csv") or (file.filename and file.filename.lower().endswith(".csv")):
                csv_text = file_bytes.decode("utf-8", errors="ignore")
                csv_res = parse_csv_bank_statement(csv_text, file.filename or "")
                if csv_res.get("transactions"):
                    for tx in csv_res["transactions"]:
                        save_transaction(tx)
                        extracted_count += 1
                status = "processed"

            deduplicate_transactions_in_db()

            doc_record = {
                "id": file_id,
                "filename": file.filename or "uploaded_file",
                "mimeType": file.content_type or "application/octet-stream",
                "size": len(file_bytes),
                "objectKey": object_key,
                "status": status,
                "source": source or "upload",
                "createdAt": datetime.utcnow().isoformat() + "Z"
            }
            saved = save_document_record(doc_record)
            saved_docs.append(saved)

        return {"success": True, "documents": saved_docs, "extractedTransactions": extracted_count}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/documents/{doc_id}")
def api_delete_document(doc_id: str):
    try:
        deleted = delete_document_record(doc_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Document not found")
        duplicates_purged = deduplicate_transactions_in_db()
        return {"success": True, "deletedId": doc_id, "duplicatesPurged": duplicates_purged}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4.7 DELETE /api/state (Data Wipe)
@app.delete("/api/state")
async def api_wipe_state(request: Request):
    try:
        body = await request.json()
        if body.get("confirmation") != "DELETE ALL LEDGERLY DATA":
            raise HTTPException(status_code=400, detail='Invalid confirmation payload. Exact string "DELETE ALL LEDGERLY DATA" is required.')
        wiped_state = wipe_all_data()
        return {
            "success": True,
            "message": "All Ledgerly data has been completely deleted.",
            "state": wiped_state
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 17.1 GET /api/drive-sync
@app.get("/api/drive-sync")
def api_get_drive_sync():
    try:
        state = get_state()
        settings = state.get("settings") or {}
        sync_info = settings.get("driveSyncInfo") or {}
        processed_file_ids = settings.get("processedFileIds") or []
        drive_reset_at = settings.get("driveResetAt")

        return {
            "folderName": sync_info.get("folderName", "Ledgerly Financial Inbox"),
            "folderId": sync_info.get("folderId", "folder-ledgerly-inbox-12345"),
            "folderUrl": sync_info.get("folderUrl", "https://drive.google.com/drive/folders/ledgerly-inbox"),
            "schedule": sync_info.get("schedule", {"time": "08:00", "timezone": "CDT", "cadence": "daily"}),
            "lastSyncedAt": sync_info.get("lastSyncedAt"),
            "status": sync_info.get("status", "idle"),
            "lastCounts": sync_info.get("lastCounts", {"imported": 0, "duplicate": 0, "filesStored": 0, "review": 0, "errors": 0}),
            "processedFileIds": processed_file_ids[-5000:],
            "resetAt": drive_reset_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 17.2 POST /api/drive-sync
@app.post("/api/drive-sync")
async def api_post_drive_sync(request: Request):
    try:
        body = await request.json()
        transactions = body.get("transactions") or []
        files = body.get("files") or []

        state = get_state()
        settings = state.get("settings") or {}
        drive_reset_at = settings.get("driveResetAt")
        drive_reset_ms = int(datetime.fromisoformat(drive_reset_at.replace("Z", "+00:00")).timestamp() * 1000) if drive_reset_at else 0

        processed_file_ids = set(settings.get("processedFileIds") or [])

        imported_count = 0
        duplicate_count = 0
        files_stored_count = 0
        review_count = 0
        errors = []

        for tx in transactions:
            if not tx.get("merchant") or not tx.get("date") or not tx.get("amount"):
                continue
            try:
                tx_date_ms = int(datetime.strptime(tx["date"][:10], "%Y-%m-%d").timestamp() * 1000)
                if drive_reset_ms and tx_date_ms <= drive_reset_ms:
                    duplicate_count += 1
                    continue
            except Exception:
                pass

            tx_payload = {
                **tx,
                "source": "google-drive",
                "tags": list(set(list(tx.get("tags") or []) + ["Drive import"])),
                "account": tx.get("account") or "Drive import"
            }
            res_tx = save_transaction(tx_payload)
            if res_tx.get("duplicate"):
                duplicate_count += 1
            else:
                imported_count += 1

        import base64
        for f in files:
            if not f.get("fileId"):
                continue
            if f.get("fileId") in processed_file_ids:
                duplicate_count += 1
                continue

            file_buf = b""
            if f.get("base64Content"):
                try:
                    file_buf = base64.b64decode(f["base64Content"])
                except Exception:
                    pass

            if len(file_buf) > 20 * 1024 * 1024:
                errors.append(f"File {f.get('filename')} exceeds 20MB limit")
                continue

            doc_id = f"doc_drive_{int(datetime.now().timestamp()*1000)}"
            safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', f.get("filename") or "drive_doc")
            object_key = f"drive-inbox/{f.get('fileId')}-{safe_name}"

            if file_buf:
                store_r2_object(object_key, file_buf)

            status = f.get("status") or "stored"
            if status == "review":
                review_count += 1

            save_document_record({
                "id": doc_id,
                "filename": f.get("filename") or "Drive Document",
                "mimeType": f.get("mimeType") or "application/octet-stream",
                "size": len(file_buf) or f.get("size", 0),
                "objectKey": object_key,
                "status": status,
                "source": "google-drive",
                "createdAt": datetime.utcnow().isoformat() + "Z"
            })
            processed_file_ids.add(f["fileId"])
            files_stored_count += 1

        updated_sync_info = {
            **(settings.get("driveSyncInfo") or {}),
            "lastSyncedAt": datetime.utcnow().isoformat() + "Z",
            "status": "partial" if errors else "complete",
            "lastCounts": {
                "imported": imported_count,
                "duplicate": duplicate_count,
                "filesStored": files_stored_count,
                "review": review_count,
                "errors": len(errors)
            }
        }

        update_preferences({
            "driveSyncInfo": updated_sync_info,
            "processedFileIds": list(processed_file_ids)[-5000:]
        })

        return {
            "status": "partial" if errors else "complete",
            "lastSyncedAt": updated_sync_info["lastSyncedAt"],
            "importedCount": imported_count,
            "duplicateCount": duplicate_count,
            "filesStoredCount": files_stored_count,
            "reviewCount": review_count,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/chat
@app.post("/api/chat")
async def api_chat(request: Request):
    try:
        body = await request.json()
        message = body.get("message", "").strip()
        if not message:
            raise HTTPException(status_code=400, detail="Message query is required")

        state = get_state()
        transactions = state.get("transactions") or []
        assets = get_assets()
        query_lower = message.lower()

        total_count = len(transactions)
        accounts = {}
        categories = {}
        years = {}
        total_income = 0.0
        total_spending = 0.0

        for t in transactions:
            amt = float(t.get("amount") or 0.0)
            acc = t.get("account") or "Unknown"
            cat = t.get("category") or "Needs review"
            y = str(t.get("date", ""))[:4] or "Unknown"

            if t.get("type") == "expense":
                accounts[acc] = accounts.get(acc, 0.0) + amt
                categories[cat] = categories.get(cat, 0.0) + amt

            if y not in years:
                years[y] = {"income": 0.0, "spending": 0.0, "count": 0}
            years[y]["count"] += 1

            if t.get("type") == "income":
                total_income += amt
                years[y]["income"] += amt
            else:
                total_spending += amt
                years[y]["spending"] += amt

        # Specific keyword heuristics
        if "costco" in query_lower:
            costco_txs = [t for t in transactions if "costco" in (t.get("merchant") or "").lower()]
            costco_total = sum(float(t.get("amount") or 0.0) for t in costco_txs)
            recent_list = "\n".join([f"• **{t.get('date')}**: ${float(t.get('amount') or 0):.2f} ({t.get('account')})" for t in costco_txs[:5]])
            reply = f"🛒 **Costco Spending Analysis**:\n\nYou have **{len(costco_txs)} transactions** at Costco totaling **${costco_total:,.2f}**.\n\n**Recent Costco Purchases**:\n{recent_list}"
        elif "2025" in query_lower:
            data_2025 = years.get("2025", {"spending": 0.0, "income": 0.0, "count": 0})
            top_cats_2025 = {}
            for t in transactions:
                if str(t.get("date", "")).startswith("2025") and t.get("type") == "expense":
                    cat = t.get("category") or "Needs review"
                    top_cats_2025[cat] = top_cats_2025.get(cat, 0.0) + float(t.get("amount") or 0.0)
            sorted_2025 = sorted(top_cats_2025.items(), key=lambda x: x[1], reverse=True)[:5]
            cats_list = "\n".join([f"• **{k}**: ${v:,.2f}" for k, v in sorted_2025])
            reply = f"📅 **2025 Annual Financial Overview**:\n\n• **Total Spending**: **${data_2025['spending']:,.2f}**\n• **Total Income**: **${data_2025['income']:,.2f}**\n• **Total Transactions**: **{data_2025['count']}**\n\n**Top Spending Categories in 2025**:\n{cats_list}"
        elif any(k in query_lower for k in ["account", "balance", "bank"]):
            acc_list = "\n".join([f"• **{acc}**: ${amt:,.2f} total spend" for acc, amt in accounts.items()])
            total_assets = sum(float(a.get("value") or 0.0) for a in assets)
            reply = f"🏦 **Linked Accounts Overview** ({len(accounts)} active accounts):\n\n{acc_list}\n\n💰 **Recorded Assets**: ${total_assets:,.2f}"
        elif any(k in query_lower for k in ["category", "categories", "top spend"]):
            top_cats = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:6]
            cats_list = "\n".join([f"• **{cat}**: ${amt:,.2f}" for cat, amt in top_cats])
            reply = f"📊 **Top Spending Categories Across All Accounts**:\n\n{cats_list}"
        else:
            total_assets = sum(float(a.get("value") or 0.0) for a in assets)
            reply = f"✨ **Dhana Lakshmi AI Financial Summary**:\n\n• **Total Recorded Transactions**: **{total_count:,}**\n• **Total Income**: **${total_income:,.2f}**\n• **Total Spending**: **${total_spending:,.2f}**\n• **Total Assets**: **${total_assets:,.2f}**\n\nYou can ask me questions like:\n- *\"How much did I spend at Costco?\"*\n- *\"What was my 2025 total spending?\"*\n- *\"Show my top spending categories\"*\n- *\"What is my net worth?\"*"

        return {"response": reply, "source": "dhana-lakshmi-fastapi-engine"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------------
# Generic Multi-Bank Connector Endpoints (Playwright)
# -------------------------------------------------------------
from bank_connectors import (
    get_all_bank_connections,
    run_interactive_auth_session,
    run_headless_statement_extraction,
    disconnect_bank_session
)
import threading

@app.get("/api/banks/connections")
def list_bank_connections():
    """List all supported and connected banks with their session status."""
    try:
        return {"connections": get_all_bank_connections()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/banks/{bank_id}/auth-session")
def trigger_interactive_auth(bank_id: str):
    """
    Launch visible browser session in background thread for user to login & 2FA.
    """
    def _run():
        try:
            run_interactive_auth_session(bank_id)
        except Exception as err:
            print(f"Interactive auth error for {bank_id}: {err}")

    t = threading.Thread(target=_run, daemon=True)
    t.start()

    return {
        "status": "launched",
        "message": f"Browser window launched for {bank_id}. Please log in and complete 2FA on screen.",
        "bank_id": bank_id
    }

from prefect_runner import run_prefect_bank_flow, get_recent_flow_runs

@app.post("/api/banks/{bank_id}/extract")
async def trigger_bank_extraction(bank_id: str):
    """
    Dispatch statement extraction to Prefect Workflow Engine on port 3010.
    """
    try:
        res = run_prefect_bank_flow(bank_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/banks/workflow-runs")
def list_prefect_workflow_runs():
    """Get recent Prefect workflow execution history."""
    try:
        return {"runs": get_recent_flow_runs()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/banks/{bank_id}/session")
def remove_bank_session(bank_id: str):
    """Disconnect bank and delete saved session state."""
    try:
        return disconnect_bank_session(bank_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from keychain import (
    set_keychain_credential,
    delete_keychain_credential,
    get_keychain_status
)

@app.post("/api/banks/{bank_id}/keychain")
async def save_bank_keychain_creds(bank_id: str, request: Request):
    """Save username & password to macOS Keychain for secure autofill."""
    try:
        body = await request.json()
        username = body.get("username", "").strip()
        password = body.get("password", "").strip()
        if not username or not password:
            raise HTTPException(status_code=400, detail="Username and password are required")
        res = set_keychain_credential(bank_id, username, password)
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/banks/{bank_id}/keychain")
def remove_bank_keychain_creds(bank_id: str):
    """Delete credentials for this bank from macOS Keychain."""
    try:
        return delete_keychain_credential(bank_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/banks/sync-all")
async def sync_all_active_banks():
    """Run headless statement extraction across all active bank connections."""
    try:
        connections = get_all_bank_connections()
        active_banks = [b for b in connections if b.get("hasSession") or b.get("status") == "active"]
        results = []
        for b in active_banks:
            try:
                res = await run_headless_statement_extraction(b["bank_id"])
                results.append(res)
            except Exception as be:
                results.append({"bank_id": b["bank_id"], "status": "error", "error": str(be)})
        return {
            "status": "completed",
            "totalSynced": len(active_banks),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files
if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

# SPA catch-all fallback
@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    target_file = DIST_DIR / full_path
    if full_path and target_file.is_file():
        return FileResponse(target_file)
    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Dhana Lakshmi FastAPI backend running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3002, reload=False)
