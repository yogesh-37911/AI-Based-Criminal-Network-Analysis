"use client";

const CONFIDENCE_STYLES: Record<string, string> = {
  CONFIRMED_FROM_EVIDENCE: "text-ok border-ok/40 bg-ok/10",
  SUPPORTED_INFERENCE: "text-cyan border-cyan/40 bg-cyan/10",
  POTENTIAL_CONNECTION: "text-amber border-amber/40 bg-amber/10",
  ANOMALY: "text-danger border-danger/40 bg-danger/10",
  INSUFFICIENT_EVIDENCE: "text-muted border-hairline bg-panel2",
};

export function ConfidenceBadge({ label }: { label: string }) {
  const cls = CONFIDENCE_STYLES[label] || CONFIDENCE_STYLES.INSUFFICIENT_EVIDENCE;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border ${cls}`}>
      {label.replaceAll("_", " ")}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "text-cyan border-cyan/40 bg-cyan/10",
  UNDER_INVESTIGATION: "text-amber border-amber/40 bg-amber/10",
  EVIDENCE_REVIEW: "text-amber border-amber/40 bg-amber/10",
  SUSPECT_IDENTIFIED: "text-ok border-ok/40 bg-ok/10",
  CLOSED: "text-muted border-hairline bg-panel2",
  ARCHIVED: "text-muted border-hairline bg-panel2",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.OPEN;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border ${cls}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "text-muted",
  MEDIUM: "text-cyan",
  HIGH: "text-amber",
  CRITICAL: "text-danger",
};

export function PriorityDot({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-mono ${PRIORITY_STYLES[priority] || ""}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {priority}
    </span>
  );
}
