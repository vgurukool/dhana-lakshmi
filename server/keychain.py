"""
macOS Keychain Integration for Dhana Lakshmi
Searches both dedicated 'DhanaLakshmi_<BANK>' entries and existing system/browser Keychain credentials.
Uses native macOS `security` CLI for zero-plaintext credential management.
"""

import subprocess
import re
from typing import Optional, Dict, Any, List

BANK_KEYCHAIN_ALIASES: Dict[str, List[Dict[str, str]]] = {
    "bofa": [
        {"type": "generic", "service": "DhanaLakshmi_BOFA"},
        {"type": "internet", "server": "bankofamerica.com"},
        {"type": "internet", "server": "www.bankofamerica.com"},
        {"type": "internet", "server": "secure.bankofamerica.com"},
        {"type": "generic", "label": "Bank of America"}
    ],
    "chase": [
        {"type": "generic", "service": "DhanaLakshmi_CHASE"},
        {"type": "internet", "server": "chase.com"},
        {"type": "internet", "server": "www.chase.com"},
        {"type": "internet", "server": "secure.chase.com"},
        {"type": "internet", "server": "secure01a.chase.com"},
        {"type": "generic", "label": "Chase"}
    ],
    "capitalone": [
        {"type": "generic", "service": "DhanaLakshmi_CAPITALONE"},
        {"type": "internet", "server": "capitalone.com"},
        {"type": "internet", "server": "www.capitalone.com"},
        {"type": "internet", "server": "verified.capitalone.com"},
        {"type": "generic", "label": "Capital One"}
    ],
    "citi": [
        {"type": "generic", "service": "DhanaLakshmi_CITI"},
        {"type": "internet", "server": "citi.com"},
        {"type": "internet", "server": "online.citi.com"},
        {"type": "generic", "label": "Citibank"}
    ],
    "amex": [
        {"type": "generic", "service": "DhanaLakshmi_AMEX"},
        {"type": "internet", "server": "americanexpress.com"},
        {"type": "internet", "server": "global.americanexpress.com"},
        {"type": "generic", "label": "American Express"}
    ],
    "wellsfargo": [
        {"type": "generic", "service": "DhanaLakshmi_WELLSFARGO"},
        {"type": "internet", "server": "wellsfargo.com"},
        {"type": "internet", "server": "connect.secure.wellsfargo.com"},
        {"type": "generic", "label": "Wells Fargo"}
    ],
    "hdfc": [
        {"type": "generic", "service": "DhanaLakshmi_HDFC"},
        {"type": "internet", "server": "hdfcbank.com"},
        {"type": "internet", "server": "netbanking.hdfcbank.com"},
        {"type": "generic", "label": "HDFC Bank"}
    ],
    "sbi": [
        {"type": "generic", "service": "DhanaLakshmi_SBI"},
        {"type": "internet", "server": "onlinesbi.sbi"},
        {"type": "internet", "server": "retail.onlinesbi.sbi"},
        {"type": "generic", "label": "State Bank of India"}
    ],
    "icici": [
        {"type": "generic", "service": "DhanaLakshmi_ICICI"},
        {"type": "internet", "server": "icicibank.com"},
        {"type": "internet", "server": "infinity.icicibank.com"},
        {"type": "generic", "label": "ICICI Bank"}
    ]
}

def get_service_name(bank_id: str) -> str:
    return f"DhanaLakshmi_{bank_id.upper()}"

def _parse_security_output(stdout: str, stderr: str) -> Dict[str, str]:
    username_match = re.search(r'"acct"<blob>="([^"]+)"', stdout)
    username = username_match.group(1) if username_match else ""
    
    password_match = re.search(r'password:\s*(?:"([^"]+)"|([^\n\r]+))', stderr)
    password = ""
    if password_match:
        password = password_match.group(1) or password_match.group(2) or ""
        password = password.strip().strip('"')
        
    return {"username": username, "password": password}

def get_keychain_credential(bank_id: str) -> Optional[Dict[str, str]]:
    """
    Searches macOS Keychain for existing bank credentials.
    Checks:
    1. Dedicated DhanaLakshmi_<BANK> entry.
    2. Existing Internet Passwords for the bank's domains.
    3. Generic Passwords matching bank name/label.
    """
    bank_id = str(bank_id).replace("conn_", "").lower()
    queries = BANK_KEYCHAIN_ALIASES.get(bank_id, [
        {"type": "generic", "service": get_service_name(bank_id)}
    ])
    
    for q in queries:
        try:
            if q["type"] == "generic" and "service" in q:
                cmd = ["security", "find-generic-password", "-s", q["service"], "-g"]
            elif q["type"] == "generic" and "label" in q:
                cmd = ["security", "find-generic-password", "-l", q["label"], "-g"]
            elif q["type"] == "internet" and "server" in q:
                cmd = ["security", "find-internet-password", "-s", q["server"], "-g"]
            else:
                continue

            res = subprocess.run(cmd, capture_output=True, text=True, check=False)
            if res.returncode == 0:
                parsed = _parse_security_output(res.stdout, res.stderr)
                if parsed["username"] and parsed["password"]:
                    return {
                        "bank_id": bank_id,
                        "service": q.get("service") or q.get("server") or q.get("label"),
                        "username": parsed["username"],
                        "password": parsed["password"],
                        "hasPassword": True,
                        "source": f"macOS Keychain ({q.get('server') or q.get('service') or q.get('label')})"
                    }
        except Exception:
            continue
            
    return None

def set_keychain_credential(bank_id: str, username: str, password: str) -> Dict[str, Any]:
    """
    Saves or updates username and password in macOS Keychain under DhanaLakshmi_<BANK>.
    """
    bank_id = str(bank_id).replace("conn_", "").lower()
    service = get_service_name(bank_id)
    if not username or not password:
        raise ValueError("Both username and password are required for Keychain storage")

    cmd = [
        "security", "add-generic-password",
        "-U",
        "-a", username,
        "-s", service,
        "-w", password,
        "-l", f"Dhana Lakshmi {bank_id.upper()} Login"
    ]
    
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Failed to store credential in Keychain: {res.stderr}")
        
    return {
        "status": "success",
        "bank_id": bank_id,
        "service": service,
        "username": username,
        "message": f"Credential for {bank_id} stored in macOS Keychain"
    }

def delete_keychain_credential(bank_id: str) -> Dict[str, Any]:
    """
    Deletes credential from macOS Keychain.
    """
    bank_id = str(bank_id).replace("conn_", "").lower()
    service = get_service_name(bank_id)
    cmd = ["security", "delete-generic-password", "-s", service]
    res = subprocess.run(cmd, capture_output=True, text=True)
    return {
        "status": "deleted" if res.returncode == 0 else "not_found",
        "bank_id": bank_id,
        "service": service
    }

def get_keychain_status(bank_id: str) -> Dict[str, Any]:
    """
    Checks if Keychain has stored credentials without returning full password.
    """
    cred = get_keychain_credential(bank_id)
    if cred and cred.get("username"):
        return {
            "hasKeychain": True,
            "username": cred.get("username"),
            "maskedUsername": cred["username"][:3] + "***" if len(cred["username"]) > 3 else "***",
            "service": cred.get("service"),
            "source": cred.get("source")
        }
    return {
        "hasKeychain": False,
        "username": None,
        "maskedUsername": None,
        "service": get_service_name(bank_id)
    }
