/**
 * Page caching policy: marks page responses for Astro's cache provider
 * (Cloudflare in deploy) and derives the slug tags revalidate.ts purges by.
 * Webhook paths arrive flat ("/{post_name}", "/category/{slug}") while pages
 * are nested ("/province/2026/09/08/{slug}/") — contentTag() reduces both to
 * the same tag so a purge matches. Without a provider (dev) it falls back to
 * a plain cache-control header.
 */

import { isAssetPath } from "../wp/url";

const MAX_AGE = 60;
const SWR = 300;
const FALLBACK = `public, s-maxage=${MAX_AGE}, stale-while-revalidate=${SWR}`;

/** URLs may arrive with either hex case; malformed input stays as-is. */
const safeDecode = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/**
 * Slug-based cache tag for a content path, or null for the homepage.
 * ponytail: last-segment heuristic — collides only when a page slug equals a
 * post slug (over-purges one entry); exact permalink purges still work the
 * day WP sends real permalinks.
 */
export function contentTag(path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  if (segments[0] === "category" && segments[1]) {
    return `category:${safeDecode(segments[1])}`;
  }
  return `post:${safeDecode(segments[segments.length - 1])}`;
}

interface PageCacheContext {
  url: URL;
  cache: {
    readonly enabled: boolean;
    set(input: { maxAge: number; swr: number; tags: string[] }): void;
  };
}

/** Mark a page response for caching; returns the (possibly wrapped) response. */
export function applyPageCache(
  context: PageCacheContext,
  response: Response,
): Response {
  const { pathname } = context.url;
  if (
    isAssetPath(pathname) ||
    response.status < 200 ||
    response.status >= 300 // never cache redirects/errors
  ) {
    return response;
  }

  if (context.cache.enabled) {
    const tag = contentTag(pathname);
    context.cache.set({
      maxAge: MAX_AGE,
      swr: SWR,
      tags: tag ? ["theme", tag] : ["theme"],
    });
    return response;
  }

  if (response.headers.has("cache-control")) return response;
  const headers = new Headers(response.headers);
  headers.set("cache-control", FALLBACK);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
