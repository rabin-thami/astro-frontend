export const prerender = false;

import type { APIRoute } from 'astro';
import { contentTag } from '../../lib/cache/pageCache';

/**
 * Consumes PatrikaOS signed webhooks: {event, paths} with
 * X-PatrikaOS-Signature = HMAC-SHA256("{timestamp}.{rawBody}", secret).
 *
 * Invalidation rides Astro's cache API. PatrikaOS sends flat paths
 * ("/{post_name}", "/category/{slug}", "/") while pages are cached under
 * slug tags — contentTag() performs the same reduction on both sides (see
 * lib/cache/pageCache.ts), so post events purge their article and category
 * entries; "/" purges the homepage by exact path. theme.updated purges the
 * shared "theme" tag, which every page carries. No provider (dev/preview)
 * → cache.enabled is false → no-op.
 */

const MAX_TIMESTAMP_DRIFT_SECONDS = 300;

const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const secret = import.meta.env.REVALIDATE_SECRET;
  const rawBody = await request.text();
  const signature = request.headers.get('X-PatrikaOS-Signature') ?? '';
  const timestamp = request.headers.get('X-PatrikaOS-Timestamp') ?? '';

  if (!secret) {
    console.warn('[revalidate] REVALIDATE_SECRET not set — rejecting');
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500 });
  }

  const expected = await crypto.subtle
    .importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    .then((key) =>
      crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`)),
    )
    .then((buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join(''));

  if (!timingSafeEqual(signature, expected)) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
  }

  const drift = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(drift) || drift > MAX_TIMESTAMP_DRIFT_SECONDS) {
    return new Response(JSON.stringify({ error: 'Stale timestamp' }), { status: 401 });
  }

  let payload: { event?: string; paths?: string[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { event = 'unknown' } = payload;
  // Signed sender, but never trust payload shape at a trust boundary.
  const paths = Array.isArray(payload.paths)
    ? payload.paths.filter((p): p is string => typeof p === 'string')
    : [];
  console.log(`[revalidate] ${event}: ${paths.join(', ') || '(no paths)'}`);

  let invalidated = 0;
  if (context.cache.enabled) {
    if (event === 'theme.updated') {
      // Header/footer/tokens shift everywhere — one tag purge covers all.
      await context.cache.invalidate({ tags: ['theme'] });
      invalidated = 1;
    } else {
      for (const path of paths) {
        if (path === '/') {
          // Homepage: exact path purge (the provider tags it path:/).
          await context.cache.invalidate({ path: '/' });
        } else {
          const tag = contentTag(path);
          if (!tag) continue;
          await context.cache.invalidate({ tags: [tag] });
        }
        invalidated += 1;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, event, invalidated }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
