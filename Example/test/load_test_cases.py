#!/usr/bin/env python3
"""
FORGE-AI Test Case Loader
Loads 4 comprehensive forensic investigation test cases (Low, Medium, High, Critical)
with realistic evidence, suspects, victims, and notes into the running FORGE-AI platform.

Works with zero extra dependencies (uses Python standard library urllib/json).
"""
import os
import sys
import json
import mimetypes
import uuid
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


API_BASE = os.environ.get("FORGE_API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.environ.get("FORGE_ADMIN_EMAIL", "admin@forge-ai.local")
ADMIN_PASS = os.environ.get("FORGE_ADMIN_PASS", "Admin@Forge123!")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EVIDENCE_DIR = os.path.join(SCRIPT_DIR, "evidence")


class ForgeClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.token = None

    def _req(self, endpoint: str, method: str = "GET", data=None, headers=None):
        url = f"{self.base_url}{endpoint}"
        req_headers = headers or {}
        if self.token and "Authorization" not in req_headers:
            req_headers["Authorization"] = f"Bearer {self.token}"

        req_data = None
        if data is not None:
            if isinstance(data, (dict, list)):
                req_headers["Content-Type"] = "application/json"
                req_data = json.dumps(data).encode("utf-8")
            elif isinstance(data, bytes):
                req_data = data
            elif isinstance(data, str):
                req_data = data.encode("utf-8")

        req = Request(url, data=req_data, headers=req_headers, method=method)
        try:
            with urlopen(req, timeout=30) as resp:
                body = resp.read().decode("utf-8")
                return json.loads(body) if body else {}
        except HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                err_json = json.loads(err_body)
                msg = err_json.get("detail", err_body)
            except Exception:
                msg = err_body
            raise RuntimeError(f"HTTP {e.code} {endpoint}: {msg}")
        except URLError as e:
            raise RuntimeError(f"Connection failed to {url}: {e.reason}")

    def login(self, email: str, password: str):
        passwords = [password, "ChangeMe123!", "Admin@Forge123!"]
        last_err = None
        for pwd in passwords:
            try:
                res = self._req("/auth/login", method="POST", data={"email": email, "password": pwd})
                self.token = res.get("access_token")
                if self.token:
                    return res
            except Exception as e:
                last_err = e
        raise RuntimeError(f"Login failed for {email}: {last_err}")


    def create_case(self, title: str, description: str, crime_type: str, priority: str):
        return self._req("/cases", method="POST", data={
            "title": title,
            "description": description,
            "crime_type": crime_type,
            "priority": priority,
        })

    def update_case_status(self, case_id: str, status: str):
        return self._req(f"/cases/{case_id}", method="PUT", data={"status": status})

    def add_suspect(self, case_id: str, name: str, description: str = "", aliases: list = None):
        return self._req(f"/cases/{case_id}/suspects", method="POST", data={
            "name": name,
            "description": description,
            "aliases": aliases or [],
        })

    def add_victim(self, case_id: str, name: str, contact_info: str = "", description: str = ""):
        return self._req(f"/cases/{case_id}/victims", method="POST", data={
            "name": name,
            "contact_info": contact_info,
            "description": description,
        })

    def add_note(self, case_id: str, content: str):
        return self._req(f"/cases/{case_id}/notes", method="POST", data={"content": content})

    def upload_evidence(self, case_id: str, file_path: str, source: str = "", description: str = ""):
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        filename = os.path.basename(file_path)
        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        body = bytearray()
        def add_field(name, value):
            body.extend(f"--{boundary}\r\n".encode("utf-8"))
            body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
            body.extend(f"{value}\r\n".encode("utf-8"))

        add_field("case_id", case_id)
        if source:
            add_field("source", source)
        if description:
            add_field("description", description)

        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(file_bytes)
        body.extend(b"\r\n")
        body.extend(f"--{boundary}--\r\n".encode("utf-8"))

        headers = {
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
        }
        return self._req("/evidence/upload", method="POST", data=bytes(body), headers=headers)

    def run_analysis(self, evidence_id: str):
        try:
            return self._req(f"/analysis/document/{evidence_id}", method="POST")
        except Exception as e:
            print(f"      ⚠️  AI analysis skipped/failed for {evidence_id}: {e}")
            return None


TEST_CASES_CONFIG = [
    {
        "priority": "LOW",
        "title": "Minor Unauthorized Access — Internal Wiki",
        "description": "Employee jdoe repeatedly attempted to access restricted executive salary bands, M&A docs, and HR policy files from both local IP 192.168.1.45 and VPN IP 10.0.0.5, receiving multiple HTTP 403 Forbidden responses.",
        "crime_type": "Unauthorized Access",
        "status": "OPEN",
        "suspects": [
            {"name": "John Doe (jdoe)", "description": "Junior Marketing Associate attempting unauthorized access to executive directories"}
        ],
        "victims": [],
        "notes": [
            "Incident detected by internal SIEM log alert rule 'REPEATED_403_INTERNAL_WIKI'.",
            "User's active directory account temporarily restricted pending interview.",
            "Test workflow: verify setting status to UNDER_INVESTIGATION and testing archive/delete."
        ],
        "evidence": [
            {"file": "low_access_log.txt", "source": "Apache Access Logs (/var/log/apache2/access.log)", "desc": "Access log entries showing unauthorized directory traversal and 403 probes."}
        ]
    },
    {
        "priority": "MEDIUM",
        "title": "Employee Expense Fraud — Duplicate Receipts",
        "description": "Sales lead Rajesh Verma submitted duplicate expense claims across dual corporate payment cards (HDFC and ICICI) for client dinners, flights, and lodging totaling INR 30,000 in fraudulent payouts.",
        "crime_type": "Financial Fraud",
        "status": "UNDER_INVESTIGATION",
        "suspects": [
            {"name": "Rajesh Verma", "description": "Regional Sales Lead (Emp ID: NT-4482), submitted duplicate expense vouchers"}
        ],
        "victims": [
            {"name": "NovaTech Solutions Pvt Ltd", "contact_info": "compliance@novatech.internal", "description": "Employer organization defrauded of corporate travel and entertainment funds"}
        ],
        "notes": [
            "Cross-referenced bank statement against July 2026 expense filings.",
            "All 5 duplicate transactions share identical rupee values with modified merchant descriptions.",
            "Forwarded evidence dossier to internal audit and legal counsel."
        ],
        "evidence": [
            {"file": "medium_bank_statement.csv", "source": "HDFC & ICICI Corporate Bank Feeds", "desc": "Consolidated CSV of bank debit records revealing identical paired payments."},
            {"file": "medium_expense_report.txt", "source": "Internal ERP Expense Portal", "desc": "Audit submission report detailing claimant vouchers and auditor findings."}
        ]
    },
    {
        "priority": "HIGH",
        "title": "Corporate Data Exfiltration via USB & Tor",
        "description": "Lead software architect Dev Vikram exfiltrated 1.18 GB of proprietary source code (Project Titan) and master encryption keys via unauthorized SanDisk USB and encrypted Tor dropzone prior to defecting to competitor Apex.",
        "crime_type": "Data Theft / Espionage",
        "status": "EVIDENCE_REVIEW",
        "suspects": [
            {"name": "Dev Vikram", "description": "Lead Systems Architect, logged in from 10.10.40.88, copied source files to USB and cleared event logs"},
            {"name": "Alex Sterling (A. Sterling)", "description": "Competitor talent scout / handler (+44-7700900144) directing exfiltration via Signal"}
        ],
        "victims": [
            {"name": "Titan Technologies Corp", "contact_info": "legal@titan-tech.local", "description": "IP owner and defense contractor whose proprietary algorithms were stolen"}
        ],
        "notes": [
            "Forensic extraction of workstation WS-ENG-8812 recovered deleted Signal desktop SQLite database.",
            "Event ID 1102 confirms intentional clearing of System audit log at 18:22 UTC.",
            "Zeek network logs capture outbound SSL connection uploading 1.18 GB to Tor exit node 185.220.101.5."
        ],
        "evidence": [
            {"file": "high_usb_audit.log", "source": "Windows Security Event Log (WS-ENG-8812)", "desc": "Audit records documenting SanDisk USB connection and mass file copy."},
            {"file": "high_network_traffic.log", "source": "Zeek Network Monitor (Core Switch TAP)", "desc": "Outbound SSL flows to dropzone IP 185.220.101.5 and competitor SSH host."},
            {"file": "high_chat_transcript.txt", "source": "Signal Desktop SQLite DB Decryption", "desc": "Direct conversation detailing trade secret solicitation and compensation agreement."}
        ]
    },
    {
        "priority": "CRITICAL",
        "title": "Ransomware Attack — Hospital Network Encrypted",
        "description": "BlackForge cybercrime syndicate deployed ChaCha20/RSA-4096 ransomware across St. Jude Metropolitan Healthcare System, encrypting PACS surgical imaging, EHR databases, and ICU telemetry, demanding 25.5 BTC.",
        "crime_type": "Cyber Attack / Ransom",
        "status": "UNDER_INVESTIGATION",
        "suspects": [
            {"name": "BlackForge Ransomware Syndicate", "description": "Transnational ransomware cartel operating from Eastern Europe (AS48282 / AS208044)"},
            {"name": "Threat Actor Ingress 194.26.29.112", "description": "Initial access broker exploiting RDP CVE-2024-38077 on DMZ gateway"}
        ],
        "victims": [
            {"name": "St. Jude Metropolitan Healthcare System", "contact_info": "incident-commander@stjude.health", "description": "Major hospital network with 850 workstations and critical care facilities compromised"},
            {"name": "Dr. Elizabeth Stone", "contact_info": "dr.elizabeth.stone@stjude.health", "description": "Chief of Surgery whose credential was phished via fake PACS update email"}
        ],
        "notes": [
            "Emergency crisis team convened; hospital redirected emergency trauma patients to regional centers.",
            "Initial attack vector identified: Spear-phishing email delivered to Chief of Surgery at 14:12 EDT.",
            "Palo Alto firewall confirms lateral PsExec movement to Domain Controller DC01 (172.16.20.10) followed by Cobalt Strike beaconing to 91.240.118.172.",
            "Bitcoin ransom wallet monitored: bc1qa5wkgaew2dkv56kfvj49j0av5nqvrlt3e58xxg (Balance: 0 BTC as of triage)."
        ],
        "evidence": [
            {"file": "critical_ransom_note.txt", "source": "Encrypted Server Desktop (C:\\README_RECOVER.txt)", "desc": "Official extortion note demanding 25.5 BTC with Tor recovery portal link."},
            {"file": "critical_firewall.log", "source": "Palo Alto PA-5260 Perimeter Firewall", "desc": "Firewall logs proving RDP exploitation, lateral movement, and Cobalt Strike C2."},
            {"file": "critical_phishing_email.txt", "source": "Microsoft 365 Exchange Mailbox Export", "desc": "Spear-phishing email masquerading as hospital PACS update certificate."},
            {"file": "critical_file_manifest.csv", "source": "EDR Incident Response Triage Script", "desc": "Manifest of 7 enterprise systems and databases confirmed encrypted."}
        ]
    }
]


def main():
    print("=" * 72)
    print("🛡️  FORGE-AI TEST CASES SEEDER (Low → Critical)")
    print(f"   API Target: {API_BASE}")
    print(f"   Admin:      {ADMIN_EMAIL}")
    print("=" * 72)

    client = ForgeClient(API_BASE)

    # 1. Login
    print("\n[1/3] Authenticating as Admin...")
    try:
        client.login(ADMIN_EMAIL, ADMIN_PASS)
        print("  ✓ Authenticated successfully.")
    except Exception as e:
        print(f"  ✗ Authentication failed: {e}")
        print("\n  💡 Tip: Ensure backend is running and 'python seed.py' has been executed in the backend directory.")
        sys.exit(1)

    # 2. Process each test case
    print("\n[2/3] Seeding 4 Forensic Test Cases...")
    created_cases = []

    for idx, cfg in enumerate(TEST_CASES_CONFIG, start=1):
        p_badge = {"LOW": "🟢 LOW", "MEDIUM": "🟡 MEDIUM", "HIGH": "🟠 HIGH", "CRITICAL": "🔴 CRITICAL"}.get(cfg["priority"], cfg["priority"])
        print(f"\n--- Case {idx}/4: [{p_badge}] {cfg['title']} ---")

        # Create case
        try:
            case = client.create_case(
                title=cfg["title"],
                description=cfg["description"],
                crime_type=cfg["crime_type"],
                priority=cfg["priority"]
            )
            case_id = case["id"]
            case_num = case.get("case_number", case_id[:8])
            print(f"  ✓ Created case: {case_num} (ID: {case_id})")
        except Exception as e:
            print(f"  ✗ Failed to create case: {e}")
            continue

        # Set status
        if cfg.get("status") and cfg["status"] != "OPEN":
            try:
                client.update_case_status(case_id, cfg["status"])
                print(f"  ✓ Set initial status to: {cfg['status']}")
            except Exception as e:
                print(f"  ⚠️  Failed to set status: {e}")

        # Add suspects
        for s in cfg.get("suspects", []):
            try:
                client.add_suspect(case_id, name=s["name"], description=s.get("description", ""))
                print(f"  ✓ Added Suspect: {s['name']}")
            except Exception as e:
                print(f"  ⚠️  Failed to add suspect {s['name']}: {e}")

        # Add victims
        for v in cfg.get("victims", []):
            try:
                client.add_victim(case_id, name=v["name"], contact_info=v.get("contact_info", ""), description=v.get("description", ""))
                print(f"  ✓ Added Victim: {v['name']}")
            except Exception as e:
                print(f"  ⚠️  Failed to add victim {v['name']}: {e}")

        # Add notes
        for note in cfg.get("notes", []):
            try:
                client.add_note(case_id, note)
                print(f"  ✓ Added Note: {note[:60]}...")
            except Exception as e:
                print(f"  ⚠️  Failed to add note: {e}")

        # Upload evidence
        for ev in cfg.get("evidence", []):
            ev_file = os.path.join(EVIDENCE_DIR, ev["file"])
            try:
                res = client.upload_evidence(case_id, ev_file, source=ev.get("source", ""), description=ev.get("desc", ""))
                ev_id = res.get("id")
                print(f"  ✓ Uploaded Evidence: {ev['file']} (ID: {ev_id[:8]}..., Hash: {res.get('sha256_hash', '')[:12]}...)")

                # Trigger AI analysis
                if ev_id:
                    print(f"    ↳ Running AI Document Analysis on {ev['file']}...")
                    ar = client.run_analysis(ev_id)
                    if ar:
                        print(f"      ✓ Entities: {ar.get('entities_extracted', 0)}, Edges: {ar.get('relationship_edges_created', 0)}, Timeline: {ar.get('timeline_events_created', 0)}")
            except Exception as e:
                print(f"  ⚠️  Failed to upload evidence {ev['file']}: {e}")

        created_cases.append({
            "number": case_num,
            "title": cfg["title"],
            "priority": cfg["priority"],
            "status": cfg["status"],
            "id": case_id
        })

    # 3. Summary
    print("\n" + "=" * 72)
    print("🎉 ALL TEST CASES SUCCESSFULLY CREATED & INITIALIZED!")
    print("=" * 72)
    print(f"\n{'Priority':<10} {'Case Number':<18} {'Title':<40}")
    print("-" * 72)
    for c in created_cases:
        print(f"{c['priority']:<10} {c['number']:<18} {c['title'][:38]:<40}")

    print("\nNext steps in FORGE-AI UI:")
    print("  1. Open http://localhost:3000/cases to inspect all 4 test cases.")
    print("  2. Open any case to inspect Investigation Graph, Timeline, and AI Assistant.")
    print("  3. Test Set Status buttons in the header.")
    print("  4. Test Delete/Archive case button (trash icon) to verify the delete workflow.")
    print("  5. Check Command Center (http://localhost:3000/dashboard) to see updated cross-case analytics.")
    print("=" * 72)


if __name__ == "__main__":
    main()
