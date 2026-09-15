/**
 * License gate: every page request checks the license server by hostname.
 * 1h in-memory cache per instance; fail-open with a 7-day stale grace so a
 * license-server blink doesn't take a paying customer's news site down.
 * Blocked pages and API routes are exempt (the blocked page itself must
 * render, and /api/revalidate must keep working — no license = no purge,
 * which only makes a dead site deader).
 */

const CHECK_TTL = 36e5; // 1h
const GRACE_DAYS = 7 * 864e5;

interface LicenseVerdict {
  status: "active" | "revoked" | "expired" | "unknown" | "invalid";
  grace?: boolean;
}

const cache = new Map<string, { verdict: LicenseVerdict; at: number }>();

const base = import.meta.env.LICENSE_SERVER_URL;
if (!base) {
  // Shout once at startup: without a server URL every /check below throws,
  // every request fail-opens, and the gate is silently disabled. This is
  // exactly what "I revoked the key but the site still loads" looks like.
  console.warn(
    "[license] LICENSE_SERVER_URL is empty — the license gate is DISABLED, every page will render regardless of the key.",
  );
}

/**
 * Fresh answer from an earlier check. Anything younger than CHECK_TTL is
 * served as-is; older actives are NOT served here (the site must re-check)
 * but stay in the cache as last-known-good for the unreachable-server
 * fallback below — that's where the 7-day grace actually lives. Entries
 * past grace are dropped.
 */
const cachedVerdict = (domain: string): LicenseVerdict | null => {
  const hit = cache.get(domain);
  if (!hit) return null;
  const age = Date.now() - hit.at;
  if (age < CHECK_TTL) {
    return hit.verdict; // fresh — serve without re-checking
  }
  if (hit.verdict.status === "active" && age < GRACE_DAYS) {
    return null; // stale active — re-check now; keep as last-known-good
  }
  cache.delete(domain);
  return null;
};

export async function checkLicense(domain: string): Promise<LicenseVerdict> {
  const hit = cachedVerdict(domain);
  if (hit) return hit;

  try {
    const res = await fetch(`${base}/check?domain=${encodeURIComponent(domain)}`, {
      // @ts-expect-error — Cloudflare cacheTtl, not in lib.dom types
      cacheTtl: 3600,
    });
    const data = (await res.json()) as LicenseVerdict;
    const verdict: LicenseVerdict = { status: data.status ?? "invalid", grace: data.grace };
    cache.set(domain, { verdict, at: Date.now() });
    return verdict;
  } catch {
    // Server unreachable: fall back to last-known-good within the 7-day
    // grace (stale actives are deliberately kept in the cache for this),
    // otherwise fail open rather than blank out a live site on a blip.
    const hit = cache.get(domain);
    if (hit?.verdict.status === "active" && Date.now() - hit.at < GRACE_DAYS) {
      return hit.verdict;
    }
    return { status: "active", grace: true };
  }
}
