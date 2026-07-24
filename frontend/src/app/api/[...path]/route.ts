import type { NextRequest } from "next/server";

const API_URL = process.env.API_URL || "http://127.0.0.1:8000";
const ALLOWED_PATHS = new Set([
  "detect",
  "predict",
  "catalog-image",
  "health",
  "admin/catalog",
  "admin/status",
  "admin/reference",
  "admin/rebuild",
]);

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const targetPath = path.join("/");
  if (!ALLOWED_PATHS.has(targetPath)) {
    return Response.json({ error: "Route inconnue." }, { status: 404 });
  }

  const target = new URL(`/${targetPath}`, API_URL);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) responseHeaders.set("content-type", upstreamType);
    if (targetPath === "catalog-image") {
      responseHeaders.set("cache-control", "private, max-age=3600");
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { error: "Le moteur de reconnaissance est indisponible." },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
