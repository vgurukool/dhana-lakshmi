"""
Prefect Runner for Dhana Lakshmi
Submits and monitors Playwright statement extraction flows executed by the Prefect Workflow Engine.
"""

import os
import json
import subprocess
import urllib.request
from pathlib import Path
from typing import Dict, List, Any, Optional

PREFECT_PYTHON = "/Users/ayushsinghaniya/development/.venv_prefect/bin/python3"
PREFECT_API_BASE = "http://127.0.0.1:3010/api"
PREFECT_UI_BASE = "http://127.0.0.1:3010"
WORKFLOWS_DIR = Path(__file__).parent.parent / "workflows"

def run_prefect_bank_flow(bank_id: str) -> Dict[str, Any]:
    """
    Executes the Prefect bank statement extraction flow synchronously.
    """
    bank_id = str(bank_id).replace("conn_", "").lower()
    script = f"""
import asyncio
import sys
import json
sys.path.insert(0, '{WORKFLOWS_DIR}')
from bank_extraction_flow import extract_bank_statements_flow

try:
    res = asyncio.run(extract_bank_statements_flow('{bank_id}'))
    print('__FLOW_RESULT__' + json.dumps(res))
except Exception as e:
    print('__FLOW_ERROR__' + str(e))
"""
    cmd = [PREFECT_PYTHON, "-c", script]
    env = os.environ.copy()
    env["PREFECT_API_URL"] = f"{PREFECT_API_BASE}"

    res = subprocess.run(cmd, capture_output=True, text=True, env=env)
    output = res.stdout + res.stderr

    flow_res = {}
    error_msg = None

    for line in output.splitlines():
        if "__FLOW_RESULT__" in line:
            json_str = line.split("__FLOW_RESULT__")[1]
            try:
                flow_res = json.loads(json_str)
            except Exception:
                pass
        elif "__FLOW_ERROR__" in line:
            error_msg = line.split("__FLOW_ERROR__")[1]

    # Query latest flow run from Prefect API to get flow_run_id
    latest_run = get_latest_flow_run()

    return {
        "status": "success" if not error_msg else "error",
        "bank_id": bank_id,
        "data": flow_res,
        "error": error_msg,
        "flowRun": latest_run,
        "prefectUiUrl": f"{PREFECT_UI_BASE}/runs/flow-run/{latest_run.get('id')}" if latest_run else PREFECT_UI_BASE
    }

def get_latest_flow_run() -> Optional[Dict[str, Any]]:
    try:
        req = urllib.request.Request(
            f"{PREFECT_API_BASE}/flow_runs/filter",
            data=json.dumps({"limit": 1, "sort": "START_TIME_DESC"}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            runs = json.loads(resp.read().decode("utf-8"))
            return runs[0] if runs else None
    except Exception:
        return None

def get_recent_flow_runs(limit: int = 10) -> List[Dict[str, Any]]:
    try:
        req = urllib.request.Request(
            f"{PREFECT_API_BASE}/flow_runs/filter",
            data=json.dumps({"limit": limit, "sort": "START_TIME_DESC"}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            runs = json.loads(resp.read().decode("utf-8"))
            results = []
            for r in runs:
                results.append({
                    "id": r.get("id"),
                    "name": r.get("name"),
                    "state": r.get("state_name") or (r.get("state") or {}).get("name"),
                    "stateType": r.get("state_type") or (r.get("state") or {}).get("type"),
                    "startTime": r.get("start_time"),
                    "endTime": r.get("end_time"),
                    "totalRunTime": r.get("total_run_time"),
                    "parameters": r.get("parameters") or {},
                    "uiUrl": f"{PREFECT_UI_BASE}/runs/flow-run/{r.get('id')}"
                })
            return results
    except Exception as e:
        print(f"Error fetching Prefect flow runs: {e}")
        return []
