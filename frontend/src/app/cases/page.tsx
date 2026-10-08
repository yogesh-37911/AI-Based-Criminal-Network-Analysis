"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { StatusBadge, PriorityDot } from "@/components/Badges";

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", crime_type: "", priority: "MEDIUM" });
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(() => { setLoading(true); setError(""); api.get("/cases").then(setCases).catch((e) => setError(e.message || "Unable to load investigations.")).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => cases.filter((c) => `${c.title} ${c.case_number} ${c.crime_type || ""} ${c.status}`.toLowerCase().includes(query.toLowerCase())), [cases, query]);

  async function createCase(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try { await api.post("/cases", form); setShowForm(false); setForm({ title: "", description: "", crime_type: "", priority: "MEDIUM" }); load(); }
    catch (err: any) { setError(err.message || "Unable to create the case."); }
    finally { setSaving(false); }
  }

  async function deleteCase(caseId: string) {
    setDeleting(caseId);
    try { await api.del(`/cases/${caseId}`); setConfirmDelete(null); load(); }
    catch (err: any) { setError(err.message || "Unable to archive this case."); }
    finally { setDeleting(null); }
  }

  const field = "w-full rounded-xl border border-white/[0.09] bg-[#090f18] px-3.5 py-2.5 text-[12px] text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35 focus:ring-2 focus:ring-cyan-200/[0.06]";
  return <Shell><div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.19em] text-cyan-200/70"><span className="h-px w-5 bg-cyan-200/50"/>Case management</div><h1 className="font-head text-[27px] font-semibold tracking-tight text-white sm:text-[32px]">Investigations</h1><p className="mt-1.5 text-[12px] text-slate-400">Organize casework and follow evidence through each investigation.</p></div><button onClick={() => setShowForm(!showForm)} className="rounded-xl border border-cyan-200/20 bg-cyan-200/[0.1] px-4 py-2.5 text-[11px] font-medium text-cyan-100 transition hover:bg-cyan-200/[0.16]"><span className="mr-1.5 text-sm">+</span>New investigation</button></div>

    {error && <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-100"><span>{error}</span><button onClick={() => setError("")} className="text-rose-200/70 hover:text-white">Dismiss</button></div>}

    {showForm && <form onSubmit={createCase} className="mb-5 rounded-2xl border border-white/[0.08] bg-[#0c131e] p-4 sm:p-5"><div className="mb-4"><div className="text-[9px] font-semibold uppercase tracking-[.18em] text-cyan-200/60">New case file</div><h2 className="mt-1 text-sm font-medium text-slate-100">Investigation details</h2></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-[10px] text-slate-400">Case title<input placeholder="e.g. Financial fraud review" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${field} mt-1.5`} /></label><label className="text-[10px] text-slate-400">Incident type<input placeholder="e.g. Cybercrime" value={form.crime_type} onChange={(e) => setForm({ ...form, crime_type: e.target.value })} className={`${field} mt-1.5`} /></label><label className="text-[10px] text-slate-400 sm:col-span-2">Description<textarea placeholder="Add a short description or scope for this investigation" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${field} mt-1.5 resize-y`} rows={3} /></label><label className="text-[10px] text-slate-400">Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={`${field} mt-1.5`}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-3.5 py-2 text-[11px] text-slate-400 hover:bg-white/[0.04] hover:text-white">Cancel</button><button disabled={saving} type="submit" className="rounded-xl border border-cyan-200/20 bg-cyan-200/[0.1] px-4 py-2 text-[11px] text-cyan-100 hover:bg-cyan-200/[0.16] disabled:opacity-50">{saving ? "Creating…" : "Create case"}</button></div></form>}

    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b121c]/85"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.055] px-4 py-3.5 sm:px-5"><div className="flex items-center gap-2.5"><h2 className="text-[13px] font-medium text-slate-200">Case files</h2><span className="rounded-md border border-white/[0.07] bg-white/[0.025] px-1.5 py-0.5 text-[9px] tabular-nums text-slate-400">{cases.length}</span></div><label className="relative block w-full sm:w-64"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">⌕</span><input aria-label="Search investigations" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search case files" className="w-full rounded-lg border border-white/[0.07] bg-[#090f18] py-2 pl-8 pr-3 text-[11px] text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-200/25" /></label></div>
      {loading ? <div className="space-y-3 p-5">{[1, 2, 3].map((i) => <div key={i} className="h-[58px] animate-pulse rounded-xl bg-white/[0.025]" />)}</div> : filtered.length ? <div className="divide-y divide-white/[0.045]">{filtered.map((c) => <div key={c.id} className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.025] sm:gap-4 sm:px-5"><Link href={`/cases/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3"><span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-sm text-slate-400 sm:flex">⌑</span><div className="min-w-0"><div className="truncate text-[12px] font-medium text-slate-200 transition group-hover:text-cyan-100">{c.title}</div><div className="mt-1 flex flex-wrap items-center gap-x-2 text-[9px] text-slate-500"><span className="font-mono">{c.case_number}</span>{c.crime_type && <><span className="text-slate-700">·</span><span>{c.crime_type}</span></>}</div></div></Link><div className="flex shrink-0 items-center gap-2.5 sm:gap-4"><PriorityDot priority={c.priority} /><StatusBadge status={c.status} /><button onClick={() => setConfirmDelete(c.id)} className="rounded-lg p-1.5 text-slate-600 opacity-100 transition hover:bg-rose-300/[0.08] hover:text-rose-200 sm:opacity-0 sm:group-hover:opacity-100" title="Archive case" aria-label={`Archive ${c.title}`}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg></button></div></div>)}</div> : <div className="flex min-h-56 flex-col items-center justify-center px-4 py-12 text-center"><span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-lg text-slate-500">⌁</span><p className="text-[12px] font-medium text-slate-300">{query ? "No matching case files" : "Your workspace is ready"}</p><p className="mt-1 max-w-xs text-[10px] leading-relaxed text-slate-500">{query ? "Try another case name, number, incident type, or status." : "Create your first investigation to start organizing evidence and activity."}</p>{!query && <button onClick={() => setShowForm(true)} className="mt-4 rounded-lg border border-cyan-200/15 bg-cyan-200/[0.07] px-3 py-2 text-[10px] text-cyan-100">Create an investigation</button>}</div>}
    </section>

    {confirmDelete && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="archive-title" className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1520] p-5 shadow-2xl"><span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/[0.06] text-amber-200">!</span><h2 id="archive-title" className="text-sm font-medium text-slate-100">Archive this case?</h2><p className="mt-2 text-[11px] leading-relaxed text-slate-400">The case will be marked archived. Its evidence and records remain preserved.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-2 text-[11px] text-slate-400 hover:bg-white/[0.05] hover:text-white">Cancel</button><button onClick={() => deleteCase(confirmDelete)} disabled={deleting === confirmDelete} className="rounded-lg border border-rose-300/15 bg-rose-300/[0.08] px-3.5 py-2 text-[11px] text-rose-100 hover:bg-rose-300/[0.13] disabled:opacity-50">{deleting === confirmDelete ? "Archiving…" : "Archive case"}</button></div></div></div>}
  </div></Shell>;
}
