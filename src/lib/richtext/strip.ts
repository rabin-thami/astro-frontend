/**
 * WP data quirks: helper strips, ported from the reference
 * (CoreQuote/CorePullquote stripParagraphTags, CoreListItem stripNestedLists).
 */

/** WP wraps quote/pullquote content in <p> tags — values can hold several
 * paragraphs; join them with spaces so inline rendering stays valid. */
export function stripParagraphTags(html: string): string {
  return html
    .replace(/<\/p>\s*<p\b[^>]*>/gi, ' ')
    .replace(/<\/?p\b[^>]*>/gi, '')
    .trim();
}

/**
 * WP stores nested list HTML inside list item content AND as child CoreList
 * blocks. The nested list is always appended at the END of the content, and
 * WP's serializer can leave stray duplicated text fragments after it
 * (observed live: "Three<ul>…</ul>HelloWorld<ul>…"). So the item's own
 * label is exactly everything BEFORE the first nested <ul>/<ol> — drop
 * that tag and everything after it.
 */
export function stripNestedLists(html: string): string {
  const nested = html.search(/<[uo]l[\s>]/i);
  const own = nested === -1 ? html : html.slice(0, nested);
  return own.replace(/<br\s*\/?>\s*$/i, '').trim();
}

/** Render HTML to plain text (meta descriptions, link titles, alt text). */
export function htmlToText(html: string): string {
  return stripExcerptMore(
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&hellip;/g, '…')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/**
 * Drop WP's excerpt "more" marker (" [...]", "[…]") — the cards cut text
 * with line-clamp already, so the marker is visual noise.
 */
export function stripExcerptMore(text: string): string {
  return text.replace(/\s*\[(\.\.\.|…)?\]\s*$/, '').trim();
}
