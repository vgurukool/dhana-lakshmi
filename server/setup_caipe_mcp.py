import os
import json
import urllib.request
from datetime import datetime, timezone
from pymongo import MongoClient

def setup():
    mongo_uri = os.environ.get("MONGODB_URI")
    db_name = os.environ.get("MONGODB_DATABASE", "caipe")
    client = MongoClient(mongo_uri)
    db = client[db_name]

    now = datetime.now(timezone.utc)

    # 1. Register MCP Servers in MongoDB
    mcp_servers = [
        {
            "_id": "dhana_lakshmi",
            "name": "Dhana Lakshmi Financial Platform",
            "description": "Personal finance engine, account balances, transaction ledger, expense breakdown, and bank statements",
            "transport": "sse",
            "endpoint": "http://dhana-lakshmi.vgurukool.svc.cluster.local:3002/mcp/sse",
            "enabled": True,
            "config_driven": False,
            "source": "manual",
            "created_at": now,
            "updated_at": now,
        },
        {
            "_id": "incorg",
            "name": "Intelligent Content Organizer (incorg)",
            "description": "Enterprise RAG document search, summarization, OCR, and financial statement extraction",
            "transport": "sse",
            "endpoint": "http://intelligent-content-organizer.incorg.svc.cluster.local:7860/gradio_api/mcp/sse",
            "enabled": True,
            "config_driven": False,
            "source": "manual",
            "created_at": now,
            "updated_at": now,
        },
    ]

    for server in mcp_servers:
        db["mcp_servers"].update_one(
            {"_id": server["_id"]},
            {"$set": server},
            upsert=True
        )
        print(f"[OK] Upserted MCP Server in Mongo: {server['_id']}")

    # 2. OpenFGA Authorization Tuples
    store_id = "01M38CCE5W26CV5X4ZGP2CFRQ5"
    write_url = f"http://openfga:8080/stores/{store_id}/write"
    tuples_to_write = []
    for s_id in ["dhana_lakshmi", "incorg"]:
        tuples_to_write.extend([
            {"user": "organization:caipe#member", "relation": "reader", "object": f"mcp_server:{s_id}"},
            {"user": "organization:caipe#member", "relation": "user", "object": f"mcp_server:{s_id}"},
            {"user": "organization:caipe#member", "relation": "invoker", "object": f"mcp_server:{s_id}"},
            {"user": "organization:caipe#admin", "relation": "manager", "object": f"mcp_server:{s_id}"},
        ])

    payload = {"writes": {"tuple_keys": tuples_to_write}}
    req = urllib.request.Request(
        write_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print("[OK] OpenFGA tuples write status:", resp.status)
    except urllib.error.HTTPError as e:
        print("[NOTE] OpenFGA write response:", e.read().decode())
    except Exception as e:
        print("[WARN] OpenFGA write error:", e)

    # 3. Update Kubera Agent
    kubera = db["dynamic_agents"].find_one({"_id": "kubera"})
    if kubera:
        current_prompt = kubera.get("system_prompt", "")
        mcp_instructions = """

### Integrated MCP Tools (Dhana Lakshmi & Incorg):
You have live, direct integration with the user's financial ecosystem:
1. **Dhana Lakshmi MCP Server (`dhana_lakshmi_*`)**:
   - `dhana_lakshmi_get_financial_overview`: Call to view current net worth, total assets, total debt/liabilities, liquid cash reserves, and monthly cash flow.
   - `dhana_lakshmi_list_financial_accounts`: Call to inspect checking, savings, credit cards, investments, and loan balances, interest rates, and auto-pay settings.
   - `dhana_lakshmi_get_upcoming_bills_and_dues`: Call to check upcoming bills, credit card payment due dates, and amounts due within the next 30 days.
   - `dhana_lakshmi_get_spending_breakdown`: Call to analyze spending by category (Groceries, Dining, Housing, Utilities, Transportation, etc.) to counsel on conscious consumption.
   - `dhana_lakshmi_get_transactions`: Call to search and audit historical transactions.
   - `dhana_lakshmi_list_assets`: Call to view real estate, gold, investments, and other tangible assets.
   - `dhana_lakshmi_add_transaction`: Call to record new transactions into the ledger with automated categorization.
   - `dhana_lakshmi_update_account_balance`: Call to update account balances.
   - `dhana_lakshmi_parse_and_import_csv_statement`: Call to import transactions from bank statement data.

2. **Intelligent Content Organizer MCP Server (`incorg_*`)**:
   - `incorg_perform_search`: Semantic search over uploaded financial contracts, receipts, bank statements, and tax documents.
   - `incorg_ask_question`: Ask grounded questions against indexed documents using RAG.
   - `incorg_summarize_document`: Summarize lengthy financial reports, investment prospectuses, or terms.
   - `incorg_generate_tags_for_document`: Categorize and tag incoming financial documents.
   - `incorg_upload_and_process_file`: Ingest new documents and parse their content into the vector store.
   - `incorg_extract_structured_data_ui`: Extract structured transaction data from bank statements and invoices.

Always proactively use these tools when answering user questions about their wealth, accounts, spending, budgets, debt payoff strategies, or financial documents. Provide structured financial clarity combined with timeless Vedic Artha principles."""

        if "### Integrated MCP Tools" in current_prompt:
            base_prompt = current_prompt.split("### Integrated MCP Tools")[0].strip()
            updated_prompt = base_prompt + mcp_instructions
        else:
            updated_prompt = current_prompt + mcp_instructions

        allowed_tools = {
            "dhana_lakshmi": True,
            "incorg": [
                "perform_search",
                "ask_question",
                "summarize_document",
                "generate_tags_for_document",
                "view_task_details",
            ],
        }

        db["dynamic_agents"].update_one(
            {"_id": "kubera"},
            {
                "$set": {
                    "allowed_tools": allowed_tools,
                    "system_prompt": updated_prompt,
                    "updated_at": now.isoformat(),
                }
            }
        )
        print("[OK] Successfully configured Kubera dynamic agent with dhana_lakshmi and incorg tools!")

if __name__ == "__main__":
    setup()
