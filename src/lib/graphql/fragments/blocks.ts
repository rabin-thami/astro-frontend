/**
 * One fragment per WP block type — flat editorBlocks query (tree rebuilt
 * client-side by flatListToHierarchical). Port of the reference's
 * BLOCK_FIELDS_FRAGMENT.
 *
 * NOTE: audio preload is intentionally absent — it is String while video
 * preload is String!, and that conflict fails whole-query validation
 * (probed live). Audio preloads metadata by default anyway.
 */
export const BLOCK_FIELDS_FRAGMENT = `
  fragment BlockFields on EditorBlock {
    __typename
    name
    clientId
    parentClientId
    ... on CoreParagraph {
      attributes { content align }
    }
    # Classic/legacy posts arrive as one freeform block with HTML.
    ... on CoreFreeform {
      renderedHtml
    }
    ... on CoreHeading {
      attributes { content level }
    }
    ... on CoreImage {
      attributes { url alt caption }
      mediaDetails { width height }
    }
    ... on CoreList {
      attributes { ordered }
    }
    ... on CoreListItem {
      attributes { content }
    }
    ... on CoreQuote {
      attributes { value citation }
    }
    ... on CorePullquote {
      attributes { pullquoteValue: value citation }
    }
    ... on CoreGallery {
      attributes {
        images { id url alt caption link }
        columns
      }
    }
    ... on CoreCover {
      attributes { url }
    }
    ... on CoreTable {
      attributes {
        hasFixedLayout
        head { cells { content tag } }
        body { cells { content tag } }
        foot { cells { content tag } }
      }
    }
    ... on CoreButton {
      attributes { text url linkTarget }
    }
    ... on CoreEmbed {
      attributes { url providerNameSlug type }
    }
    ... on CoreMore {
      attributes { customText noTeaser }
    }
    ... on CoreReadMore {
      attributes { content }
    }
    ... on CoreSocialLink {
      attributes { url service label }
    }
    ... on CoreAudio {
      attributes { src caption autoplay loop }
    }
    ... on CoreVideo {
      attributes { src caption poster autoplay loop muted controls preload }
    }
    ... on CoreMediaText {
      attributes { mediaUrl mediaAlt mediaType mediaPosition mediaWidth href }
    }
    ... on CoreSpacer {
      attributes { height width }
    }
    ... on CoreTabs {
      attributes { activeTabIndex }
    }
    ... on CoreTabPanel {
      attributes { tabLabel: label }
    }
  }
`;
