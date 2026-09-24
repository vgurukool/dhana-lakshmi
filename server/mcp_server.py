"""
Dhana Lakshmi (Ledgerly) — Model Context Protocol (MCP) Server.

Exposes comprehensive personal finance, account tracking, transaction ledger,
and Vedic Artha financial analysis tools over standard MCP SSE transport.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from mcp.server.fastmcp import FastMCP

from db import (
    get_state,
    get_db,
    save_transaction,
    patch_transaction,
    delete_transaction,
    get_assets,
    save_asset,
    patch_asset,
    delete_asset,
    get_financial_accounts,
    patch_financial_account,
    mark_account_paid,
    infer_primary_dhana_expense,
    infer_ashta_lakshmi,
    DEFAULT_USER_ID,
)
from csv_parser import parse_csv_bank_statement

logger = logging.getLogger("dhana_lakshmi.mcp")
logger.setLevel(logging.INFO)

# Initialize FastMCP Server
mcp = FastMCP("Dhana Lakshmi Financial Platform")
logger.info("Dhana Lakshmi FastMCP server initialized.")


def _resolve_user_id(user_id: Optional[str] = None) -> str:
    return (user_id or "").strip() or DEFAULT_USER_ID


@mcp.tool()
async def get_financial_overview(user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get an executive financial overview including total net worth, total assets,
    total liabilities/debts, liquid cash reserves, and monthly cash flow (income vs burn).
    
    Returns structured metrics grounded in the Ashta Lakshmi and Artha framework.
    """
    uid = _resolve_user_id(user_id)
    try:
        state = get_state(uid)
        accounts = state.get("accountsList", [])
        assets = state.get("assetsList", [])
        transactions = state.get("transactions", [])

        # 1. Calculate liquid cash and depository balances
        depository_total = sum(
            float(a.get("balance", 0.0))
            for a in accounts
            if a.get("category") in ("depository", "checking", "savings")
        )

        # 2. Calculate debt/liabilities (credit cards, loans, mortgages)
        credit_total = sum(
            float(a.get("balance", 0.0))
            for a in accounts
            if a.get("category") in ("credit", "credit_card")
        )
        loan_total = sum(
            float(a.get("balance", 0.0))
            for a in accounts
            if a.get("category") in ("loan", "mortgage", "student_loan", "auto_loan")
        )
        total_liabilities = credit_total + loan_total

        # 3. Calculate investments and assets
        investment_total = sum(
            float(a.get("balance", 0.0))
            for a in accounts
            if a.get("category") in ("investment", "brokerage", "crypto", "retirement")
        )
        physical_assets_total = sum(
            float(ast.get("value", 0.0))
            for ast in assets
            if not ast.get("hideFromDashboard")
        )
        total_assets = depository_total + investment_total + physical_assets_total
        net_worth = total_assets - total_liabilities

        # 4. Current month cash flow calculation
        now = datetime.utcnow()
        current_month_prefix = now.strftime("%Y-%m")
        cur_month_income = 0.0
        cur_month_expense = 0.0

        for t in transactions:
            tx_date = str(t.get("date", ""))
            if tx_date.startswith(current_month_prefix):
                amt = abs(float(t.get("amount", 0.0)))
                if t.get("type") == "income":
                    cur_month_income += amt
                else:
                    cur_month_expense += amt

        net_savings = cur_month_income - cur_month_expense
        savings_rate = (
            round((net_savings / cur_month_income) * 100, 1)
            if cur_month_income > 0
            else 0.0
        )

        return {
            "success": True,
            "net_worth": round(net_worth, 2),
            "total_assets": round(total_assets, 2),
            "total_liabilities": round(total_liabilities, 2),
            "breakdown": {
                "liquid_cash": round(depository_total, 2),
                "investments": round(investment_total, 2),
                "physical_and_fixed_assets": round(physical_assets_total, 2),
                "credit_card_debt": round(credit_total, 2),
                "loans_and_mortgages": round(loan_total, 2),
            },
            "monthly_cash_flow": {
                "month": now.strftime("%B %Y"),
                "total_income": round(cur_month_income, 2),
                "total_expense": round(cur_month_expense, 2),
                "net_cash_flow": round(net_savings, 2),
                "savings_rate_pct": savings_rate,
            },
            "account_count": len(accounts),
            "tracked_asset_count": len(assets),
            "total_transactions_count": len(transactions),
        }
    except Exception as e:
        logger.error(f"Error in get_financial_overview: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


@mcp.tool()
async def list_financial_accounts(
    category: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    List all financial accounts including checking, savings, credit cards, investments,
    and loans with current balances, interest rates, APR, due dates, and auto-pay status.
    
    Args:
        category: Optional filter by account category: 'depository', 'credit', 'loan', 'investment'.
        user_id: Optional user identifier (defaults to current user).
    """
    uid = _resolve_user_id(user_id)
    try:
        accounts = get_financial_accounts(uid)
        if category:
            cat_lower = category.strip().lower()
            accounts = [a for a in accounts if a.get("category", "").lower() == cat_lower]

        formatted = []
        for a in accounts:
            formatted.append({
                "id": a.get("id"),
                "name": a.get("name"),
                "institution": a.get("institution"),
                "category": a.get("category"),
                "account_number_last4": a.get("accountNumberLast4"),
                "balance": float(a.get("balance", 0.0)),
                "interest_rate": float(a.get("interestRate", 0.0)),
                "payment_amount": float(a.get("paymentAmount", 0.0)),
                "payment_frequency": a.get("paymentFrequency", "monthly"),
                "due_day": a.get("dueDay"),
                "next_due_date": a.get("nextDueDate"),
                "auto_pay": bool(a.get("autoPay")),
                "status": a.get("status", "active"),
            })

        return {
            "success": True,
            "count": len(formatted),
            "accounts": formatted,
        }
    except Exception as e:
        logger.error(f"Error in list_financial_accounts: {e}", exc_info=True)
        return {"success": False, "error": str(e), "accounts": []}


@mcp.tool()
async def get_upcoming_bills_and_dues(
    days_ahead: int = 30,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieve all upcoming credit card, loan, mortgage, and bill due dates within
    a specified number of days, including minimum/scheduled payment amounts and autoPay status.
    
    Args:
        days_ahead: Number of days forward to evaluate (default: 30).
        user_id: Optional user identifier.
    """
    uid = _resolve_user_id(user_id)
    try:
        accounts = get_financial_accounts(uid)
        upcoming = []
        now = datetime.utcnow().date()
        cutoff = now + timedelta(days=days_ahead)

        for a in accounts:
            cat = a.get("category", "").lower()
            if cat in ("credit", "loan", "mortgage", "credit_card", "utilities"):
                due_date_str = a.get("nextDueDate")
                due_date = None
                if due_date_str:
                    try:
                        due_date = datetime.strptime(due_date_str[:10], "%Y-%m-%d").date()
                    except Exception:
                        pass
                
                # If no valid nextDueDate, calculate from dueDay
                if not due_date and a.get("dueDay"):
                    try:
                        day = int(a.get("dueDay"))
                        year = now.year
                        month = now.month
                        if day < now.day:
                            month += 1
                            if month > 12:
                                month = 1
                                year += 1
                        due_date = datetime(year, month, min(day, 28)).date()
                    except Exception:
                        pass

                if due_date and now <= due_date <= cutoff:
                    days_remaining = (due_date - now).days
                    upcoming.append({
                        "account_id": a.get("id"),
                        "account_name": a.get("name"),
                        "institution": a.get("institution"),
                        "category": cat,
                        "balance": float(a.get("balance", 0.0)),
                        "payment_due_amount": float(a.get("paymentAmount", 0.0)),
                        "due_date": due_date.isoformat(),
                        "days_remaining": days_remaining,
                        "auto_pay": bool(a.get("autoPay")),
                        "interest_rate": float(a.get("interestRate", 0.0)),
                    })

        upcoming.sort(key=lambda x: x["due_date"])
        total_due = sum(x["payment_due_amount"] for x in upcoming)

        return {
            "success": True,
            "count": len(upcoming),
            "total_due_amount": round(total_due, 2),
            "evaluation_window_days": days_ahead,
            "upcoming_bills": upcoming,
        }
    except Exception as e:
        logger.error(f"Error in get_upcoming_bills_and_dues: {e}", exc_info=True)
        return {"success": False, "error": str(e), "upcoming_bills": []}


@mcp.tool()
async def get_transactions(
    limit: int = 50,
    category: Optional[str] = None,
    merchant: Optional[str] = None,
    account: Optional[str] = None,
    transaction_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Search and filter historical transactions from the ledger.
    
    Args:
        limit: Max transactions to return (default: 50, max: 500).
        category: Filter by expense/income category (e.g., 'Groceries', 'Dining', 'Housing').
        merchant: Substring search by merchant name.
        account: Filter by source account name.
        transaction_type: Filter by 'income' or 'expense'.
        start_date: Earliest date in 'YYYY-MM-DD' format.
        end_date: Latest date in 'YYYY-MM-DD' format.
        user_id: Optional user identifier.
    """
    uid = _resolve_user_id(user_id)
    try:
        conn = get_db()
        cur = conn.cursor()

        query = "SELECT * FROM transactions WHERE userId = ?"
        params: List[Any] = [uid]

        if category:
            query += " AND (category LIKE ? OR primaryExpenseCategory LIKE ?)"
            params.extend([f"%{category}%", f"%{category}%"])
        if merchant:
            query += " AND merchant LIKE ?"
            params.append(f"%{merchant}%")
        if account:
            query += " AND account LIKE ?"
            params.append(f"%{account}%")
        if transaction_type:
            ttype = "income" if transaction_type.lower() == "income" else "expense"
            query += " AND type = ?"
            params.append(ttype)
        if start_date:
            query += " AND date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND date <= ?"
            params.append(end_date)

        capped_limit = max(1, min(limit, 500))
        query += " ORDER BY date DESC, createdAt DESC LIMIT ?"
        params.append(capped_limit)

        cur.execute(query, tuple(params))
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()

        clean_txs = []
        for r in rows:
            clean_txs.append({
                "id": r.get("id"),
                "date": r.get("date"),
                "merchant": r.get("merchant"),
                "category": r.get("category"),
                "primary_category": r.get("primaryExpenseCategory"),
                "ashta_lakshmi": r.get("ashtaLakshmi"),
                "amount": float(r.get("amount", 0.0)),
                "type": r.get("type"),
                "account": r.get("account"),
                "income_source": r.get("incomeSource"),
            })

        return {
            "success": True,
            "count": len(clean_txs),
            "transactions": clean_txs,
        }
    except Exception as e:
        logger.error(f"Error in get_transactions: {e}", exc_info=True)
        return {"success": False, "error": str(e), "transactions": []}


@mcp.tool()
async def get_spending_breakdown(
    period_days: int = 30,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Aggregate spending into primary categories (Groceries, Housing, Dining, Transportation,
    Utilities, Health, etc.) over the given time horizon.
    
    Provides percentage allocation and identifies high burn categories for budget stewardship.
    """
    uid = _resolve_user_id(user_id)
    try:
        now = datetime.utcnow().date()
        start = (now - timedelta(days=period_days)).isoformat()

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT primaryExpenseCategory, category, merchant, amount
            FROM transactions
            WHERE userId = ? AND type = 'expense' AND date >= ?
            """,
            (uid, start)
        )
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()

        category_totals: Dict[str, float] = {}
        total_spent = 0.0

        for r in rows:
            cat = r.get("primaryExpenseCategory") or r.get("category") or "Needs review"
            amt = abs(float(r.get("amount", 0.0)))
            category_totals[cat] = category_totals.get(cat, 0.0) + amt
            total_spent += amt

        breakdown = []
        for cat, amt in sorted(category_totals.items(), key=lambda x: x[1], reverse=True):
            pct = round((amt / total_spent) * 100, 1) if total_spent > 0 else 0.0
            breakdown.append({
                "category": cat,
                "amount": round(amt, 2),
                "percentage": pct,
            })

        return {
            "success": True,
            "period_days": period_days,
            "since_date": start,
            "total_expenses": round(total_spent, 2),
            "categories_count": len(breakdown),
            "categories": breakdown,
        }
    except Exception as e:
        logger.error(f"Error in get_spending_breakdown: {e}", exc_info=True)
        return {"success": False, "error": str(e), "categories": []}


@mcp.tool()
async def list_assets(user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    List all tracked personal and business assets (real estate, vehicles, gold, equities, retirement).
    """
    uid = _resolve_user_id(user_id)
    try:
        assets = get_assets(uid)
        total_val = sum(float(a.get("value", 0.0)) for a in assets if not a.get("hideFromDashboard"))
        return {
            "success": True,
            "count": len(assets),
            "total_valuation": round(total_val, 2),
            "assets": assets,
        }
    except Exception as e:
        logger.error(f"Error in list_assets: {e}", exc_info=True)
        return {"success": False, "error": str(e), "assets": []}


@mcp.tool()
async def add_transaction(
    date: str,
    merchant: str,
    amount: float,
    type: str,
    category: str = "Needs review",
    account: str = "Manual Entry",
    tags: Optional[List[str]] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Record a new transaction into the financial ledger with automated categorization
    and fingerprint deduplication.
    
    Args:
        date: Transaction date formatted as 'YYYY-MM-DD'.
        merchant: Name of payee / merchant / source.
        amount: Transaction monetary amount (positive number).
        type: 'expense' or 'income'.
        category: Expense/Income category (default: 'Needs review').
        account: Name of account (e.g. 'Main Checking', 'Apple Card').
        tags: Optional list of tags.
        user_id: Optional user identifier.
    """
    uid = _resolve_user_id(user_id)
    try:
        tx_data = {
            "date": date,
            "merchant": merchant,
            "amount": abs(float(amount)),
            "type": "income" if type.lower() == "income" else "expense",
            "category": category,
            "account": account,
            "tags": tags or [],
            "source": "mcp_agent",
        }
        res = save_transaction(tx_data, uid)
        if isinstance(res, dict) and res.get("duplicate"):
            return {
                "success": False,
                "duplicate": True,
                "message": f"Duplicate transaction detected with ID {res.get('existingId')}",
                "existing_id": res.get("existingId"),
            }
        return {
            "success": True,
            "message": "Transaction recorded successfully.",
            "transaction": res,
        }
    except Exception as e:
        logger.error(f"Error in add_transaction: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


@mcp.tool()
async def update_account_balance(
    account_id: str,
    new_balance: float,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update the current balance of a financial account.
    
    Args:
        account_id: The ID of the financial account to update.
        new_balance: The updated balance amount.
        user_id: Optional user identifier.
    """
    uid = _resolve_user_id(user_id)
    try:
        res = patch_financial_account(account_id, {"balance": float(new_balance)}, uid)
        if res:
            return {"success": True, "message": "Account balance updated.", "account": res}
        return {"success": False, "error": f"Account {account_id} not found."}
    except Exception as e:
        logger.error(f"Error in update_account_balance: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


@mcp.tool()
async def parse_and_import_csv_statement(
    csv_content: str,
    account_name: str = "Imported account",
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Parse a CSV bank or credit card statement and automatically import all valid
    transactions into the ledger, applying rule-based categorizations and skipping duplicates.
    
    Args:
        csv_content: Raw text content of the CSV bank statement.
        account_name: Target account label for imported records.
        user_id: Optional user identifier.
    """
    uid = _resolve_user_id(user_id)
    try:
        parsed_txs = parse_csv_bank_statement(csv_content, account_name)
        if not parsed_txs:
            return {
                "success": False,
                "error": "No valid transactions parsed from CSV content.",
                "imported_count": 0,
            }

        imported = 0
        duplicates = 0
        for tx in parsed_txs:
            res = save_transaction(tx, uid)
            if isinstance(res, dict) and res.get("duplicate"):
                duplicates += 1
            else:
                imported += 1

        return {
            "success": True,
            "parsed_count": len(parsed_txs),
            "imported_count": imported,
            "duplicate_count": duplicates,
            "account_name": account_name,
        }
    except Exception as e:
        logger.error(f"Error in parse_and_import_csv_statement: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
