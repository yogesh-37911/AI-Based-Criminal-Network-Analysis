"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-0 h-96 w-96 rounded-full bg-cyan-300/[0.045] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-[440px] w-[440px] rounded-full bg-indigo-400/[0.04] blur-3xl" />
      <div className="relative w-full max-w-[960px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0b121c]/95 shadow-[0_28px_100px_-45px_rgba(0,0,0,.9)] lg:grid lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-gradient-to-br from-[#0d1b28] via-[#0b131e] to-[#111329] p-10 lg:flex">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(rgba(103,232,249,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,.08) 1px, transparent 1px)", backgroundSize: "42px 42px", maskImage: "linear-gradient(to bottom, black, transparent 85%)" }} />
          <div className="relative flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/15 bg-cyan-200/[0.07] text-cyan-100">⌬</span><div><div className="font-head text-sm font-semibold tracking-[.12em] text-white">FORGE<span className="text-cyan-200"> / AI</span></div><div className="mt-0.5 text-[9px] uppercase tracking-[.18em] text-slate-500">Digital evidence workspace</div></div></div>
          <div className="relative"><div className="mb-4 flex items-center gap-2 text-[9px] uppercase tracking-[.2em] text-cyan-100/70"><span className="h-px w-6 bg-cyan-200/50"/>Investigative workspace</div><h1 className="max-w-md font-head text-[34px] font-semibold leading-[1.15] tracking-tight text-white">Bring evidence into focus.</h1><p className="mt-4 max-w-sm text-[12px] leading-6 text-slate-400">Manage casework, examine evidence, and keep investigative activity organized in one secure workspace.</p><div className="mt-8 grid max-w-sm grid-cols-3 gap-2"><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="text-sm text-cyan-100">01</div><div className="mt-1 text-[9px] text-slate-500">Casework</div></div><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="text-sm text-indigo-200">02</div><div className="mt-1 text-[9px] text-slate-500">Evidence</div></div><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="text-sm text-emerald-200">03</div><div className="mt-1 text-[9px] text-slate-500">Analysis</div></div></div></div>
          <div className="relative text-[9px] text-slate-600">Authorized personnel only <span className="mx-1.5">·</span> AI findings require investigator review</div>
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-10">
        <div className="mb-7 lg:hidden">
          <div className="font-head text-xl font-semibold tracking-[.08em] text-text">FORGE<span className="text-cyan"> / AI</span></div>
          <div className="mt-1 text-[10px] text-muted">Digital evidence workspace</div>
        </div>
        <div className="mb-6">
          <div className="mb-2 text-[9px] font-medium uppercase tracking-[.19em] text-cyan-100/65">Secure access</div>
          <h2 className="font-head text-[23px] font-semibold tracking-tight text-white">Welcome back</h2>
          <div className="mt-1.5 text-[11px] text-slate-400">Sign in to continue to your investigative workspace.</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-medium text-slate-400">Investigator email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="name@organization.org"
              className="w-full rounded-xl border border-white/[0.09] bg-[#080e16] px-3.5 py-3 text-[12px] text-text outline-none transition focus:border-cyan-200/35 focus:ring-2 focus:ring-cyan-200/[0.06]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-medium text-slate-400">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/[0.09] bg-[#080e16] px-3.5 py-3 pr-10 text-[12px] text-text outline-none transition focus:border-cyan-200/35 focus:ring-2 focus:ring-cyan-200/[0.06]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-text transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {error && <div role="alert" className="rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-3.5 py-2.5 text-[11px] text-rose-100">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border border-cyan-200/20 bg-cyan-200/[0.11] py-3 text-[12px] font-medium text-cyan-50 shadow-[0_6px_22px_-14px_rgba(103,232,249,.6)] transition hover:bg-cyan-200/[0.17] disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? "Authenticating…" : "Access Platform"}
          </button>
        </form>
        <div className="mt-6 border-t border-white/[0.06] pt-4 text-center text-[9px] leading-relaxed text-slate-600">Access is monitored and recorded for audit purposes.<br/>AI-generated analysis is an investigative aid and requires human verification.</div>
        </div>
      </div>
    </div>
  );
}
