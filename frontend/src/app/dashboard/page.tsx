"use client";
import Link from "next/link";
import { ReactNode, useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["#67e8f9", "#a5b4fc", "#fbbf24", "#fb7185", "#64748b"];
const number = (value: number | undefined) => (value || 0).toLocaleString();

function StatCard({ label, value, note, tone = "cyan", icon }: { label: string; value?: number; note: string; tone?: string; icon: string }) {
  return <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c131e]/90 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-[#101a27] sm:p-5"><div className={`absolute -right-7 -top-7 h-24 w-24 rounded-full blur-3xl ${tone === "amber" ? "bg-amber-300/[0.07]" : tone === "rose" ? "bg-rose-300/[0.07]" : "bg-cyan-300/[0.06]"}`} /><div className="relative flex items-start justify-between"><div><div className="text-[11px] font-medium tracking-wide text-slate-400">{label}</div><div className="mt-3 font-head text-[30px] font-semibold leading-none tracking-tight text-slate-50">{number(value)}</div><div className="mt-2 text-[10px] text-slate-500">{note}</div></div><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-sm text-slate-300">{icon}</span></div></div>;
}

function Panel({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b121c]/85"><div className="flex items-center justify-between border-b border-white/[0.055] px-4 py-3.5 sm:px-5"><div><div className="text-[9px] font-semibold uppercase tracking-[.18em] text-slate-500">{eyebrow || "Analytics"}</div><h2 className="mt-1 text-[13px] font-medium text-slate-200">{title}</h2></div>{action}</div><div className="p-4 sm:p-5">{children}</div></section>;
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); setError(""); api.get("/dashboard/summary").then(setData).catch((e) => setError(e.message || "Unable to load workspace data.")).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const statusData = Object.entries(data?.case_status_breakdown || {}).map(([name, value]) => ({ name: name.replaceAll("_", " "), value: Number(value) }));
  const evidenceData = Object.entries(data?.evidence_type_breakdown || {}).map(([name, value]) => ({ name, value: Number(value) }));

  return <Shell><div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.19em] text-cyan-200/70"><span className="h-px w-5 bg-cyan-200/50"/>Investigation overview</div><h1 className="font-head text-[27px] font-semibold tracking-tight text-white sm:text-[32px]">Command center</h1><p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-slate-400">A clear view of case activity, evidence, and investigative signals across your workspace.</p></div>
      <div className="flex items-center gap-2"><button onClick={load} className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 py-2.5 text-[11px] text-slate-300 transition hover:bg-white/[0.06]">↻ <span className="ml-1">Refresh</span></button><Link href="/cases" className="rounded-xl border border-cyan-200/20 bg-cyan-200/[0.1] px-3.5 py-2.5 text-[11px] font-medium text-cyan-100 transition hover:bg-cyan-200/[0.16]">View investigations <span className="ml-1">→</span></Link></div>
    </div>

    {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-100"><span>{error}</span><button onClick={load} className="rounded-lg border border-rose-200/15 px-3 py-1.5 text-[11px] hover:bg-rose-200/10">Try again</button></div>}

    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
      <StatCard label="All investigations" value={data?.total_cases} note="Cases in your workspace" icon="▤" />
      <StatCard label="Active cases" value={data?.active_cases} note="Currently in progress" icon="◉" />
      <StatCard label="Priority cases" value={data?.high_priority_cases} note="High or critical priority" tone="amber" icon="⚑" />
      <StatCard label="Evidence items" value={data?.evidence_items} note="Collected across cases" icon="⌑" />
    </div>

    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
      <StatCard label="Entities" value={data?.entities} note="Extracted case entities" icon="⦿" />
      <StatCard label="Connections" value={data?.relationships} note="Recorded relationships" icon="⌘" />
      <StatCard label="People of interest" value={data?.suspects} note="Suspects on record" icon="◎" />
      <StatCard label="Review signals" value={data?.anomalies} note="Items flagged for review" tone="rose" icon="△" />
    </div>

    <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
      <Panel title="Investigation status" eyebrow="Case portfolio">{statusData.length ? <div className="h-[210px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={3} stroke="none">{statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: "#101a27", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 11 }} /></PieChart></ResponsiveContainer></div> : <EmptyChart loading={loading} message="Case statuses will appear here." />}</Panel>
      <Panel title="Evidence by type" eyebrow="Collected material">{evidenceData.length ? <div className="h-[210px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={evidenceData} margin={{ left: -16, right: 0, top: 8 }}><CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#7f8da1", fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip cursor={{ fill: "rgba(103,232,249,.04)" }} contentStyle={{ background: "#101a27", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 11 }} /><Bar dataKey="value" fill="#67e8f9" radius={[5, 5, 0, 0]} maxBarSize={32} /></BarChart></ResponsiveContainer></div> : <EmptyChart loading={loading} message="Evidence types will appear once material is added." />}</Panel>
      <Panel title="Recent activity" eyebrow="Audit trail" action={<span className="rounded-md border border-emerald-300/10 bg-emerald-300/[0.05] px-2 py-1 text-[9px] text-emerald-200/80">Latest events</span>}>
        <div className="max-h-[210px] space-y-0 overflow-auto scrollbar-thin">{data?.recent_activity?.length ? data.recent_activity.slice(0, 7).map((item: any, i: number) => <div key={`${item.timestamp}-${i}`} className="flex gap-3 border-b border-white/[0.045] py-2.5 last:border-0"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200/70"/><div className="min-w-0 flex-1"><div className="truncate text-[11px] capitalize text-slate-300">{item.action.replaceAll("_", " ").toLowerCase()}</div><div className="mt-1 text-[9px] text-slate-600">{item.resource_type || "Workspace"}</div></div><time className="shrink-0 pt-0.5 text-[9px] text-slate-500">{new Date(item.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div>) : <EmptyChart loading={loading} message="Activity will appear as your team works." />}</div>
      </Panel>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] px-4 py-3 text-[10px] text-slate-500"><span>FORGE-AI <span className="mx-1.5 text-slate-700">·</span> Digital evidence workspace</span><span>AI outputs are investigative aids and should be verified against source evidence.</span></div>
  </div></Shell>;
}

function EmptyChart({ loading, message }: { loading: boolean; message: string }) {
  return <div className="flex h-[210px] flex-col items-center justify-center text-center"><span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-500">{loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500/40 border-t-cyan-200"/> : "⌁"}</span><p className="max-w-[190px] text-[11px] leading-relaxed text-slate-500">{loading ? "Loading workspace data…" : message}</p></div>;
}
