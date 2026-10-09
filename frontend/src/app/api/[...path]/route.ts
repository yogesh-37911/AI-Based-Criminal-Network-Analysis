export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: { path: string[] } };

async function proxy(request: Request, { params }: RouteContext): Promise<Response> {
  const backendUrl = (process.env.FORGE_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL)?.replace(/\/+$/, "");
  if (!backendUrl) {
    return Response.json({ detail: "Backend API URL is not configured" }, { status: 503 });
  }

  const incomingUrl = new URL(request.url);
  const path = params.path.map((segment) => encodeURIComponent(segment)).join("/");
  const targetUrl = `${backendUrl}/api/${path}${incomingUrl.search}`;
  const headers = new Headers(request.headers);
  ["host", "connection", "content-length", "accept-encoding"].forEach((name) => headers.delete(name));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const init = {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    cache: "no-store" as RequestCache,
    redirect: "manual" as RequestRedirect,
    ...(hasBody ? { duplex: "half" as const } : {}),
  } as RequestInit;

  try {
    const upstream = await fetch(targetUrl, init);
    const responseHeaders = new Headers(upstream.headers);
    ["connection", "transfer-encoding", "content-encoding", "content-length"].forEach((name) =>
      responseHeaders.delete(name),
    );
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Backend API proxy request failed", error);
    return Response.json({ detail: "Backend API is unavailable" }, { status: 502 });
  }
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
