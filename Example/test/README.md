# FORGE-AI Test Examples

Realistic forensic investigation test cases at every priority level.
Use these to test the full platform — case creation, evidence upload, AI analysis, graph building, timeline, anomaly detection, reports, and the new delete/archive functionality.

## Quick Start

```bash
# 1. Make sure backend + frontend are running
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev

# 2. Seed the admin account (if not done already)
cd backend && python seed.py

# 3. Run the automated test loader
cd Example/test
pip install requests
python load_test_cases.py
```

The script will login as `admin@forge-ai.local`, create all 4 test cases, upload evidence files, add suspects/victims/notes, and print a summary.

---

## Test Cases

| # | Priority   | Case Title                                     | Crime Type              |
|---|------------|-------------------------------------------------|-------------------------|
| 1 | 🟢 LOW      | Minor Unauthorized Access — Internal Wiki       | Unauthorized Access     |
| 2 | 🟡 MEDIUM   | Employee Expense Fraud — Duplicate Receipts     | Financial Fraud         |
| 3 | 🟠 HIGH     | Corporate Data Exfiltration via USB             | Data Theft / Espionage  |
| 4 | 🔴 CRITICAL | Ransomware Attack — Hospital Network Encrypted  | Cyber Attack / Ransom   |

---

## What Each Test Covers

### LOW — Minor Unauthorized Access
- Simple case with one evidence file (access log)
- One suspect, no victims
- Tests: create case → upload evidence → add suspect → add note → set status → archive/delete

### MEDIUM — Employee Expense Fraud
- Two evidence files (bank statement CSV + expense report)
- One suspect, one victim (the company)
- Tests: create case → upload multiple evidence → add suspect + victim → set status transitions

### HIGH — Corporate Data Exfiltration
- Three evidence files (USB audit log, network traffic log, employee chat transcript)
- Two suspects, two victims
- Tests: full evidence pipeline → AI analysis → graph → timeline → anomaly detection

### CRITICAL — Ransomware Attack
- Four evidence files (ransomware note, firewall log, email phishing chain, encrypted file manifest)
- Multiple suspects, multiple victims
- Tests: complete end-to-end investigation workflow including reports

---

## Evidence Files

All evidence files are in `evidence/` with realistic forensic content:

```
evidence/
├── low_access_log.txt          # Web server access log with unauthorized entries
├── medium_bank_statement.csv   # Fraudulent transaction records
├── medium_expense_report.txt   # Duplicate expense claims
├── high_usb_audit.log          # USB device connection/file copy logs
├── high_network_traffic.log    # Suspicious outbound data transfers
├── high_chat_transcript.txt    # Internal messaging showing intent
├── critical_ransom_note.txt    # Ransomware demand message
├── critical_firewall.log       # C2 server communication logs
├── critical_phishing_email.txt # Phishing email chain (initial vector)
└── critical_file_manifest.csv  # List of encrypted files and systems
```

## Testing the Delete/Archive Feature

After loading test cases, you can test the new delete functionality:

1. Go to `/cases` in the browser
2. Hover over any case row → click the 🗑 trash icon
3. Confirm in the modal → case status changes to ARCHIVED
4. Open a case detail → click the 🗑 trash icon in the header
5. Confirm → redirects back to `/cases`
6. Verify the case now shows "ARCHIVED" status badge

## Testing Set Status

1. Open any case detail page
2. Click the status buttons: OPEN → UNDER INVESTIGATION → EVIDENCE REVIEW → SUSPECT IDENTIFIED → CLOSED
3. Verify the StatusBadge updates immediately
4. Verify buttons show correct active/inactive styling (cyan border = active, hairline border = inactive)
