/**
 * Minimal HTML → node-tree parser for WP inline markup. Port of the Next
 * reference's RichText.tsx, restructured as a parse step + a render step so
 * Astro templates can walk the tree (no set:html anywhere).
 *
 * Handled tags: strong, em, b, i, u, s, del, strike, code, kbd, mark, small,
 * sup, sub, br, a. Unknown tags degrade to their text (same contract as the
 * reference's unknown-tag → Fragment fallback). ul/ol are never expected
 * inline (lists arrive as child blocks); nested list HTML is stripped by the
 * caller (stripNestedLists) before this parser sees the string.
 */

export type RichTextNode =
  | { type: 'text'; value: string }
  | { type: 'tag'; name: string; attrs: { href?: string; target?: string; rel?: string; class?: string }; children: RichTextNode[] };

/** Open tags on the stack are always tag nodes. */
type TagNode = Extract<RichTextNode, { type: 'tag' }>;

const VOID_TAGS = new Set(['br']);

const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#039;': "'", '&#8217;': '’', '&#8216;': '‘',
  '&#8220;': '“', '&#8221;': '”', '&#8211;': '–', '&#8212;': '—',
  '&hellip;': '…', '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–',
  '&lsquo;': '‘', '&rsquo;': '’', '&ldquo;': '“', '&rdquo;': '”',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|hellip|nbsp|mdash|ndash|lsquo|rsquo|ldquo|rdquo);/g, (m) => NAMED_ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)));
}

export function parseRichText(html: string): RichTextNode[] {
  const nodes: RichTextNode[] = [];
  // Stack of open tags. textBefore[i] is text queued before tag i opened,
  // so unclosed tags (WP editor slip-ups) close naturally at input end.
  const stack: TagNode[] = [];
  const pendingText: string[] = [];
  let rest = html;

  const flushText = () => {
    if (!pendingText.length) return;
    const value = decodeEntities(pendingText.join(''));
    pendingText.length = 0;
    const target = stack[stack.length - 1];
    if (target) target.children.push({ type: 'text', value });
    else nodes.push({ type: 'text', value });
  };

  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z-]+(?:="[^"]*")?)*)\s*(\/?)>/g;

  let m: RegExpExecArray | null;
  // re is global (for perf) but rest shrinks each iteration — reset lastIndex
  // or stale offsets make exec() return null mid-input.
  while ((m = (re.lastIndex = 0, re.exec(rest))) !== null) {
    const [full, rawName, rawAttrs = '', selfClose] = m;
    if (m.index > 0) pendingText.push(rest.slice(0, m.index));
    rest = rest.slice(m.index + full.length);

    const name = rawName.toLowerCase();

    if (full.startsWith('</')) {
      // Pop the matching tag BEFORE flushing trailing text, so text after a
      // close lands on the correct parent.
      const idx = stack.findLastIndex((t) => t.name === name);
      if (idx !== -1) stack.length = idx + 1;
      flushText();
      if (idx !== -1) stack.length = idx;
      continue;
    }

    if (VOID_TAGS.has(name) || selfClose) {
      flushText();
      const br: TagNode = { type: 'tag', name, attrs: {}, children: [] };
      const target = stack[stack.length - 1];
      if (target) target.children.push(br);
      else nodes.push(br);
      continue;
    }

    if (name === 'a') {
      const href = /href="([^"]*)"/.exec(rawAttrs)?.[1];
      const cls = /class="([^"]*)"/.exec(rawAttrs)?.[1];
      const node: TagNode = {
        type: 'tag', name, attrs: { href, class: cls }, children: [],
      };
      flushText();
      const target = stack[stack.length - 1];
      if (target) target.children.push(node);
      else nodes.push(node);
      stack.push(node);
      continue;
    }

    flushText();
    const node: TagNode = { type: 'tag', name, attrs: {}, children: [] };
    const target = stack[stack.length - 1];
    if (target) target.children.push(node);
    else nodes.push(node);
    stack.push(node);
  }
  pendingText.push(rest);
  flushText();

  return nodes;
}

/** Extract the href of the first <a> in inline HTML, if any (quote/citation links). */
export function firstLinkHref(html: string): string | undefined {
  return /<a[^>]+href="([^"]*)"/.exec(html)?.[1];
}
