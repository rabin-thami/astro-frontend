import * as NepaliDateModule from 'nepali-date-converter';

// Vite SSR interop nesting varies by resolved dist (ESM → class on .default,
// CJS/UMD → exports object on .default with the class one level deeper).
// ponytail: unwrap at most twice; covers every known packaging shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NepaliDate = ((m: any) => {
  let c = m?.default ?? m;
  if (typeof c !== 'function' && c?.default) c = c.default;
  return c;
})(NepaliDateModule) as typeof NepaliDateModule extends { default: infer D } ? D : never;

(NepaliDate as any).language = 'np';

// Nepal Standard Time is a fixed UTC+5:45 offset (no DST). NepaliDate reads
// the Date's local calendar getters, and "local" differs between server and
// browser near midnight UTC — shifting into NPT and reading back via UTC
// getters gives every runtime the same wall-clock date (also prevents
// hydration mismatch). Port of the reference's nepali-date.ts.
const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

function toNepalWallClock(date: Date): Date {
  const shifted = new Date(date.getTime() + NPT_OFFSET_MS);
  return new Date(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    shifted.getUTCHours(),
    shifted.getUTCMinutes(),
    shifted.getUTCSeconds(),
  );
}

export function getNepaliDate(date: Date = new Date()): string {
  return new NepaliDate(toNepalWallClock(date)).format('D MMMM YYYY, ddd');
}
