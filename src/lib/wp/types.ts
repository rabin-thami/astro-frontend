/** WP block types — mirrors the GraphQL BlockFields fragment (1:1 with WPGraphQL Content Blocks). */

export type WPBlockAttributes = {
  CoreParagraph: { content?: string; align?: string };
  CoreHeading: { content?: string; level?: number };
  CoreImage: { url?: string; alt?: string; caption?: string };
  CoreList: { ordered?: boolean };
  CoreListItem: { content?: string };
  CoreQuote: { value?: string; citation?: string; align?: string };
  CorePullquote: { pullquoteValue?: string; citation?: string };
  CoreGallery: {
    images?: Array<{ id?: number; url?: string; alt?: string; caption?: string; link?: string }>;
    columns?: number;
  };
  CoreCover: { url?: string };
  CoreTable: {
    hasFixedLayout?: boolean;
    head?: Array<{ cells?: Array<{ content?: string; tag?: string }> }>;
    body?: Array<{ cells?: Array<{ content?: string; tag?: string }> }>;
    foot?: Array<{ cells?: Array<{ content?: string; tag?: string }> }>;
  };
  CoreButton: { text?: string; url?: string; linkTarget?: string };
  CoreEmbed: { url?: string; providerNameSlug?: string; type?: string };
  CoreMore: { customText?: string; noTeaser?: boolean };
  CoreReadMore: { content?: string };
  CoreSocialLink: { url?: string; service?: string; label?: string };
  CoreSeparator: Record<string, never>;
  CoreButtons: { align?: string };
  CoreColumns: Record<string, never>;
  CoreColumn: { verticalAlignment?: string };
  CoreSocialLinks: Record<string, never>;
  CoreAudio: { src?: string; caption?: string; autoplay?: boolean; loop?: boolean };
  CoreVideo: {
    src?: string; caption?: string; poster?: string; autoplay?: boolean;
    loop?: boolean; muted?: boolean; controls?: boolean; preload?: string;
  };
  CoreMediaText: {
    mediaUrl?: string; mediaAlt?: string; mediaType?: string;
    mediaPosition?: string; mediaWidth?: number; href?: string;
  };
  CoreSpacer: { height?: string; width?: string };
  CoreTabs: { activeTabIndex?: number };
  CoreTabPanels: Record<string, never>;
  // tabLabel is the aliased fetch of `label` (social-link `label` is
  // String! vs tab String! — same whole-query conflict class as preload).
  CoreTabPanel: { label?: string; tabLabel?: string };
  // Classic/legacy content — carries no attributes, only renderedHtml below.
  CoreFreeform: Record<string, never>;
};

export type WPBlockTypename = keyof WPBlockAttributes;

/** Flat node as WPGraphQL returns it (innerBlocks unused — tree is rebuilt client-side). */
interface FlatNode<T extends WPBlockTypename = WPBlockTypename> {
  __typename: T;
  name: string;
  clientId: string;
  parentClientId: string | null;
  attributes: WPBlockAttributes[T];
  /** CoreFreeform only: the classic content rendered by WP. */
  renderedHtml?: string | null;
  innerBlocks?: (FlatNode | null)[] | null;
}

export type WPBlock = { [T in WPBlockTypename]: FlatNode<T> }[WPBlockTypename];

/** Hierarchical node: children are always the full block union. */
interface TreeNode<T extends WPBlockTypename = WPBlockTypename> {
  __typename: T;
  name: string;
  clientId: string;
  parentClientId: string | null;
  attributes: WPBlockAttributes[T];
  /** CoreFreeform only: the classic content rendered by WP. */
  renderedHtml?: string | null;
  /** CoreImage only: intrinsic dimensions from the media library. */
  mediaDetails?: { width: number | null; height: number | null } | null;
  innerBlocks: HierarchicalBlock[];
}

export type HierarchicalBlock = { [T in WPBlockTypename]: TreeNode<T> }[WPBlockTypename];

/** Narrow a generic block to a specific block type. */
export type BlockOf<T extends WPBlockTypename> = Extract<HierarchicalBlock, { __typename: T }>;

const SUPPORTED_TYPENAMES = new Set<string>([
  'CoreParagraph', 'CoreHeading', 'CoreImage', 'CoreList', 'CoreListItem',
  'CoreSeparator', 'CoreQuote', 'CorePullquote', 'CoreGallery', 'CoreCover',
  'CoreTable', 'CoreButtons', 'CoreButton', 'CoreColumns', 'CoreColumn',
  'CoreEmbed', 'CoreMore', 'CoreReadMore', 'CoreSocialLinks', 'CoreSocialLink',
  'CoreAudio', 'CoreVideo', 'CoreMediaText', 'CoreSpacer', 'CoreTabs',
  'CoreTabPanels', 'CoreTabPanel', 'CoreFreeform',
]);

/**
 * Rebuild the nested block tree from WPGraphQL's flat editorBlocks list.
 * Unsupported/legacy types (null list items from the union) are dropped
 * before the tree is built — a GraphQL error nulls just that item.
 */
export function flatListToHierarchical(
  blocks: readonly (WPBlock | null | undefined)[],
): HierarchicalBlock[] {
  const childrenByParent = new Map<string | null, WPBlock[]>();

  for (const block of blocks) {
    if (!block || !SUPPORTED_TYPENAMES.has(block.__typename)) continue;
    const parentId = block.parentClientId;
    const list = childrenByParent.get(parentId);
    if (list) list.push(block);
    else childrenByParent.set(parentId, [block]);
  }

  const build = (parentId: string | null): HierarchicalBlock[] =>
    (childrenByParent.get(parentId) ?? []).map(
      (block) =>
        ({
          ...block,
          // WPGraphQL returns attributes: null for blocks with nothing set —
          // normalize once here so no component can 500 destructuring it.
          attributes: block.attributes ?? {},
          innerBlocks: build(block.clientId),
        }) as HierarchicalBlock,
    );

  return build(null);
}
