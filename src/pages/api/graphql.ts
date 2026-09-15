import type { APIRoute } from "astro";

export const prerender = false;

const WP_GRAPHQL_URL = import.meta.env.WORDPRESS_GRAPHQL_URL;
const GRAPHQL_SECRET = import.meta.env.GRAPHQL_SECRET;

/**
 * Browser-facing GraphQL proxy. Keeps X-PatrikaOS-Key server-side so the
 * secret never ships to the client (public mutations like
 * incrementShareCount go through here).
 */
export const POST: APIRoute = async ({ request }) => {
  if (!WP_GRAPHQL_URL) {
    return new Response(
      JSON.stringify({ errors: [{ message: "GraphQL not configured" }] }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  let body: string;
  try {
    body = await request.text();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (GRAPHQL_SECRET) headers["X-PatrikaOS-Key"] = GRAPHQL_SECRET;
  // Carry the real visitor IP so WordPress's per-IP vote throttle keys per
  // reader, not per server (otherwise all readers share one counter).
  // Only trust headers the edge/proxy sets itself — CF-Connecting-IP at
  // Cloudflare, x-real-ip from a hosting reverse proxy. Never trust the
  // incoming X-Forwarded-For (client-spoofable).
  const clientIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip");
  if (clientIp && /^[0-9a-fA-F.:]+$/.test(clientIp)) {
    headers["X-Forwarded-For"] = clientIp;
  }
  const res = await fetch(WP_GRAPHQL_URL, {
    method: "POST",
    headers,
    body,
  });
  const out = new Headers({ "Content-Type": "application/json" });
  // Forward receipt cookies (e.g. patrikaos_reacted) — without this the
  // browser never receives WordPress's Set-Cookie and dedup never engages.
  const jar =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  for (const c of jar) out.append("set-cookie", c);
  return new Response(res.body, {
    status: res.status,
    headers: out,
  });
};
