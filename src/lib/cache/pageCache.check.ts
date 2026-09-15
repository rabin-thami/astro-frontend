// Runnable self-check: bun src/lib/cache/pageCache.check.ts
import { contentTag } from "./pageCache";

const check = (
  label: string,
  actual: string | null,
  expected: string | null,
) => {
  if (actual !== expected) throw new Error(`${label}: ${actual} !== ${expected}`);
};

// The browser-encoded page URL and WP's flat post_name must reduce to one tag.
check(
  "nested page",
  contentTag("/province/2026/09/08/%E0%A4%AE%E0%A4%A7%E0%A5%87%E0%A4%B6%E0%A4%AE%E0%A4%BE-%E0%A4%95%E0%A5%83%E0%A4%B7%E0%A4%BF/"),
  "post:\u092e\u0927\u0947\u0936\u092e\u093e-\u0915\u0943\u0937\u093f",
);
check(
  "flat webhook path",
  contentTag("/%e0%a4%ae%e0%a4%a7%e0%a5%87%e0%a4%b6%e0%a4%ae%e0%a4%be-%e0%a4%95%e0%a5%83%e0%a4%b7%e0%a4%bf"),
  "post:\u092e\u0927\u0947\u0936\u092e\u093e-\u0915\u0943\u0937\u093f",
);
check("category + slash", contentTag("/category/province-3/"), "category:province-3");
check("category flat", contentTag("/category/province-3"), "category:province-3");
check("homepage", contentTag("/"), null);

console.log("pageCache.check: ok");
