// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// The Cloudflare adapter pulls the workerd runtime into `astro dev`
// (slow, noisy, and it chokes on bundled component scripts), and dev
// doesn't need it: adapter output only matters for `astro build`/deploy.
// So it applies to every command EXCEPT dev.
const nodeArgv =
  /** @type {{ process?: { argv?: string[] } }} */ (globalThis).process
    ?.argv ?? [];
const isDev = nodeArgv.includes('dev');
const adapter = isDev ? undefined : (await import('@astrojs/cloudflare')).default();

// EXPERIMENTAL: Astro 7's native cache with Cloudflare's provider — worker
// cache + Cache-Tag headers; invalidation by path (matches PatrikaOS webhook
// payloads) or by the shared "theme" tag. Config carries a descriptor; the
// runtime loads the entrypoint inside the worker. Dev has no provider:
// cache is a documented no-op (`cache.enabled === false`) and middleware
// keeps its plain cache-control fallback.
const cloudflareCache = {
  name: 'cloudflare',
  entrypoint: '@astrojs/cloudflare/cache/provider',
};

export default defineConfig({
  ...(adapter ? { adapter } : {}),
  ...(adapter ? { cache: { provider: cloudflareCache } } : {}),
  // Remote images (WordPress uploads) must be allow-listed or <Image> refuses
  // them. https any-host covers CDN/stock hosts; http localhost covers dev WP.
  image: {
  remotePatterns: [
    { protocol: 'http', hostname: 'localhost' },
    { protocol: 'https', hostname: 'localhost' },
    { protocol: 'https', hostname: '**.friendshipkhabar.com' },
    { protocol: 'https', hostname: 'friendshipkhabar.com' },
    { protocol: 'https', hostname: 'cms.friendshipkhabar.com' },
    { protocol: 'https', hostname: '**.onlinekhabar.com' },
    { protocol: 'https', hostname: '**.gravatar.com' },
  ],
},
  vite: {
    plugins: [tailwindcss()],
  },
});
