"""
Text extraction from uploaded forensic evidence files.
Best-effort extraction per file type — unsupported binary formats
(e.g. raw PCAP payloads) are summarized with metadata only rather
than blocking the pipeline.
"""
import csv
import json
import os
import zipfile


def extract_text(path: str, evidence_type: str) -> str:
    ext = evidence_type.lower()
    try:
        if ext in ("txt", "log"):
            with open(path, "r", errors="ignore") as f:
                return f.read()

        if ext == "csv":
            rows = []
            with open(path, "r", errors="ignore") as f:
                reader = csv.reader(f)
                for i, row in enumerate(reader):
                    rows.append(", ".join(row))
                    if i > 5000:
                        break
            return "\n".join(rows)

        if ext == "json":
            with open(path, "r", errors="ignore") as f:
                data = json.load(f)
            return json.dumps(data, indent=2)[:200_000]

        if ext == "xml":
            with open(path, "r", errors="ignore") as f:
                return f.read()

        if ext == "pdf":
            try:
                from pypdf import PdfReader
                reader = PdfReader(path)
                return "\n".join((page.extract_text() or "") for page in reader.pages)
            except Exception:
                return "[PDF text extraction unavailable in this environment]"

        if ext == "docx":
            try:
                import docx
                d = docx.Document(path)
                return "\n".join(p.text for p in d.paragraphs)
            except Exception:
                return "[DOCX text extraction unavailable in this environment]"

        if ext == "zip":
            names = []
            with zipfile.ZipFile(path) as z:
                names = z.namelist()
            return "Forensic ZIP package contents:\n" + "\n".join(names)

        if ext in ("png", "jpg", "jpeg"):
            return f"[Image evidence — {os.path.basename(path)}. OCR not run; review visually.]"

        if ext == "pcap":
            return f"[PCAP network capture — {os.path.basename(path)}. Use a packet-analysis service for payload inspection.]"

        return f"[No text extractor configured for .{ext}]"
    except Exception as e:
        return f"[Text extraction failed: {e}]"
