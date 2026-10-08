/**
 * Thin fetch wrapper for the FORGE-AI API. Attaches the JWT access token
 * and normalizes error handling. Tokens are kept in localStorage for this
 * MVP — see docs/security.md for the httpOnly-cookie hardening path
 * recommended before any real deployment.
 */

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("forge_access_token");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("forge_access_token", access);
  localStorage.setItem("forge_refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("forge_access_token");
  localStorage.removeItem("forge_refresh_token");
}

// Keep browser calls on the frontend origin. Next.js rewrites /api/* to the
// backend URL, which avoids cross-origin browser requests in both local and
// Render deployments.
const API_BASE = "";

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });

  if (res.status === 401) {
    clearTokens();
    if (path === "/auth/login") {
      let detail = "Invalid credentials";
      try {
        const body = await res.json();
        if (body.detail) detail = body.detail;
      } catch {}
      throw new Error(detail);
    }
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body.detail)) {
        detail = body.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
      } else if (body.detail) {
        detail = JSON.stringify(body.detail);
      } else if (body.message) {
        detail = body.message;
      }
    } catch {
      /* ignore parse error */
    }
    throw new Error(detail);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

export const api = {
  get: (path: string) => request(path, { method: "GET" }),
  post: (path: string, body?: any) =>
    request(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (path: string, body?: any) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  del: (path: string) => request(path, { method: "DELETE" }),
};
