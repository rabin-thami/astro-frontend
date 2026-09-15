import { defineMiddleware } from "astro:middleware";
import { getThemeHead } from "./lib/graphql/queries/getTheme";
import { getLayout } from "./lib/graphql/queries/getLayout";
import { applyPageCache } from "./lib/cache/pageCache";
import { isAssetPath } from "./lib/wp/url";
import { checkLicense } from "./lib/license";

/**
 * Two jobs, in strict order:
 *
 * 1. License gate. Every page request asks the license server
 *    (lib/license.ts) whether this hostname's key is live. ONLY an `active`
 *    verdict renders the frontend — an expired, revoked or unbound key gets
 *    the static blocked page instead: no layout, no theme head, no WP
 *    content, nothing from the site itself. The single exception is a
 *    verdict carrying `grace: true` (license server unreachable or DB
 *    broken) — fail-open so a paying customer's site never blanks on a
 *    blink; see lib/license.ts for the 1h cache / 7-day grace policy.
 *
 * 2. Request-scoped shared data (page caching policy lives in
 *    lib/cache/pageCache.ts — this module only loads and scopes). Fetch the
 *    layout/theme payload once per request and share it through `locals` —
 *    without this, Layout + Header + Footer + the page each fire their own
 *    GraphQL round-trips (4+ duplicate WP calls per article render). `locals`
 *    lives and dies with the route (per Astro docs), so this is pure request
 *    scoping, no cross-request state.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Pass-through: these never render a site page, so no license check and
  // no shared-data prefetch (each skipped request used to cost 2 WP calls).
  //   /api/**  — revalidate etc. must keep working unlicensed (no license =
  //              no purge, which only makes a dead site deader)
  //   assets   — image endpoint / static-file probes, not pages
  //   /blocked — the gate rewrites to it, and Astro re-runs middleware on a
  //              rewrite — without the exemption an expired site would loop
  //              page → blocked → blocked → … forever
  if (pathname.startsWith("/api/") || isAssetPath(pathname) || pathname === "/blocked") {
    return next();
  }

  // ---- 1. License gate: an expired key must NOT render the frontend ------
  const license = await checkLicense(context.url.hostname);
  const rendersFrontend = license.status === "active" || license.grace === true;
  if (!rendersFrontend) {
    return context.rewrite(`/blocked?domain=${encodeURIComponent(context.url.hostname)}`);
  }

  // ---- 2. Shared page data (never runs for blocked requests) -------------
  const [themeHead, layout] = await Promise.all([
    getThemeHead(),
    getLayout(),
  ]);
  context.locals.themeHead = themeHead;
  context.locals.layout = layout;

  return applyPageCache(context, await next());
});
