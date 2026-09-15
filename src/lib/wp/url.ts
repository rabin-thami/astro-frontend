/**
 * WP URL normalization shared by server-rendered links (SmartLink) and the
 * search API. WordPress returns absolute URLs pointing at its own origin;
 * on the frontend those are same-site routes and must render relative (the
 * output must not leak the backend host). Anything else absolute — or a
 * mailto:/tel: — is treated as external.
 */

/**
 * Non-page request: Astro's image endpoint, or an asset/probe path. Extensions
 * are a blocklist on purpose — a real content slug containing a dot (rare)
 * must still render as a page. Used by middleware (skip the shared-data
 * prefetch), pageCache (never mark one cacheable) and [...slug] (never spend
 * a WP round-trip answering bot probes for missing files).
 */
export const isAssetPath = (pathname: string) =>
  pathname.startsWith("/_image") ||
  /\.(php\d?|env|txt|xml|json|map|ico|png|jpe?g|svg|gif|webp|avif|css|m?js|woff2?|ttf|eot|zip|gz|tar|bak|old|sql|yml|yaml|ini|log|asp|aspx|jsp|cgi|sh)$/i.test(
    pathname,
  );

export const WP_ORIGIN = (() => {
  try {
    const base =
      import.meta.env.PUBLIC_WP_URL ??
      import.meta.env.WORDPRESS_GRAPHQL_URL ??
      "http://localhost:8080";
    return new URL(base).origin;
  } catch {
    return "";
  }
})();

export interface ResolvedLink {
  href: string;
  external: boolean;
}

export function resolveWpLink(href: string | null | undefined): ResolvedLink {
  const raw = href ?? "#";
  if (!raw.startsWith("http")) {
    // Only mailto: opens externally; tel:/anchors/relative routes render as
    // plain same-tab links (matches the pre-helper SmartLink behavior).
    return { href: raw, external: /^mailto:/i.test(raw) };
  }
  try {
    const u = new URL(raw);
    if (WP_ORIGIN && u.origin === WP_ORIGIN) {
      return { href: u.pathname + u.search, external: false };
    }
  } catch {
    /* malformed URL — keep as-is */
  }
  return { href: raw, external: true };
}
