"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ReactNode, useEffect } from "react";

const NAV = [
  { href: "/dashboard", label: "Overview", glyph: "⌂" },
  { href: "/cases", label: "Investigations", glyph: "▤" },
];

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm"><span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-cyan/30 border-t-cyan" />Securing your workspace…</div>;
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden lg:flex sticky top-0 h-screen flex-col border-r border-white/[0.07] bg-[#090e16]/95 px-4 py-5 backdrop-blur-xl">
        <Link href="/dashboard" className="mb-9 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200 shadow-[inset_0_1px_rgba(255,255,255,.08)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>
          </span>
          <span><span className="block font-head text-[17px] font-semibold tracking-[.08em] text-white">FORGE<span className="text-cyan-300"> / AI</span></span><span className="mt-0.5 block text-[9px] uppercase tracking-[.19em] text-slate-500">Digital forensics</span></span>
        </Link>

        <div className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[.2em] text-slate-600">Workspace</div>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors ${active ? "bg-cyan-300/[0.09] text-cyan-100 ring-1 ring-inset ring-cyan-200/[0.12]" : "text-slate-400 hover:bg-white/[0.035] hover:text-slate-100"}`}><span className={`flex h-6 w-6 items-center justify-center rounded-md text-base ${active ? "text-cyan-200" : "text-slate-500 group-hover:text-slate-300"}`}>{item.glyph}</span>{item.label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]" />}</Link>;
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.14em] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Secure workspace</div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-100/10 bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-semibold text-cyan-100">{user.full_name?.slice(0, 1)?.toUpperCase() || "I"}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-slate-200">{user.full_name}</div><div className="mt-0.5 truncate text-[10px] text-slate-500">{user.role.replaceAll("_", " ")}</div></div>
          </div>
          <button onClick={logout} className="mt-3 w-full rounded-lg border border-white/[0.07] px-2.5 py-2 text-left text-[11px] text-slate-400 transition hover:border-rose-300/20 hover:bg-rose-300/[0.05] hover:text-rose-200">Sign out <span className="float-right text-slate-600">↗</span></button>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-white/[0.06] bg-[#090e16]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <Link href="/dashboard" className="flex items-center gap-2.5 lg:hidden"><span className="text-sm font-semibold tracking-[.08em] text-white">FORGE<span className="text-cyan-300"> / AI</span></span></Link>
          <div className="hidden items-center gap-2 text-[11px] text-slate-500 lg:flex"><span>Workspace</span><span className="text-slate-700">/</span><span className="text-slate-300">{pathname.startsWith("/cases") ? "Investigations" : "Overview"}</span></div>
          <nav className="flex items-center gap-1 lg:hidden">{NAV.map((item) => <Link key={item.href} href={item.href} className={`rounded-lg px-2.5 py-1.5 text-[11px] ${pathname.startsWith(item.href) ? "bg-white/[0.07] text-white" : "text-slate-400"}`}>{item.label}</Link>)}</nav>
          <div className="ml-auto flex items-center gap-3"><span className="hidden items-center gap-1.5 text-[10px] text-slate-500 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>System ready</span><span className="h-4 w-px bg-white/[0.08]"/><button onClick={logout} className="text-[11px] text-slate-400 transition hover:text-white lg:hidden">Exit</button><span className="hidden text-[11px] text-slate-300 lg:inline">{user.full_name}</span></div>
        </header>
        {children}
      </main>
    </div>
  );
}
