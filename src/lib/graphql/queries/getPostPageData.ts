import { fetchGraphQL } from "../client";
import {
  activeSlot,
  isSlotActive,
  normalizeAdSlot,
  type AdSlotConfig,
  type RawAdSlot,
} from "./getTheme";
import { POST_NODES, type WPCardPost } from "./getPostsByCategory";

/**
 * Everything a single-post page needs beyond the node itself, in ONE
 * round-trip: reactions config + counts, AI-summary toggle, article banners
 * (articleTop/articleInline), share count, and the "latest" rail for
 * सिफारिस. These used to be six sequential WP calls; all of them are
 * independent once the post id is known, so they travel together.
 *
 * Combines fields from across modules by design — a schema drift in any one
 * degrades the whole payload, which is acceptable because this is the only
 * consumer and WP-side changes are verified against this repo immediately.
 */

export interface ReactionItem {
  key: string;
  emoji: string;
  label: string;
}

export interface ReactionsConfig {
  enabled: boolean;
  question: string;
  items: ReactionItem[];
}

export interface ReactionCounts {
  total: number;
  counts: { key: string; count: number }[];
}

/** In-content slot with its block position (0 = before the first block). */
export type InlineAdSlot = AdSlotConfig & { afterIndex: number };

export type ArticleAds = {
  articleTop: AdSlotConfig | null;
  articleInline: InlineAdSlot[];
};

export type PostPageData = {
  reactionsConfig: ReactionsConfig;
  reactionCounts: ReactionCounts;
  aiSummaryEnabled: boolean;
  ads: ArticleAds;
  shareCount: number;
  /** Newest posts from the "latest" category, current post excluded. */
  recommendedPosts: WPCardPost[];
};

const EMPTY_REACTIONS: ReactionsConfig = {
  enabled: false,
  question: "",
  items: [],
};

const GET_POST_PAGE_DATA = `
  query GetPostPageData($postId: Int!, $limit: Int = 6, $notIn: [ID] = []) {
    patrikaosReactions {
      enabled
      question
      items {
        key
        emoji
        label
      }
    }
    patrikaosAiSummary {
      enabled
    }
    patrikaosTheme {
      ads {
        articleTop { enabled imageUrl alt linkUrl expiresAt }
        articleInline { enabled imageUrl alt linkUrl expiresAt afterIndex }
      }
    }
    postReactions(postId: $postId) {
      total
      counts {
        key
        count
      }
    }
    postShareCount(postId: $postId)
    posts(first: $limit, where: { categoryName: "latest", notIn: $notIn }) {
      ${POST_NODES}
    }
  }
`;

type InlineSlotResponse = (RawAdSlot & { afterIndex: number | null }) | null;

type PostPageDataResponse = {
  patrikaosReactions: {
    enabled: boolean | null;
    question: string | null;
    items: Array<{ key: string; emoji: string; label: string } | null> | null;
  } | null;
  patrikaosAiSummary: { enabled: boolean | null } | null;
  patrikaosTheme: {
    ads: {
      articleTop: RawAdSlot | null;
      articleInline: Array<InlineSlotResponse> | null;
    } | null;
  } | null;
  postReactions: {
    total: number | null;
    counts: Array<{ key: string; count: number | null } | null> | null;
  } | null;
  postShareCount: number | null;
  posts: { nodes: WPCardPost[] | null } | null;
};

export async function getPostPageData(
  postId: number,
  limit = 6,
  notIn: number[] = [],
): Promise<PostPageData> {
  const data = await fetchGraphQL<PostPageDataResponse>(GET_POST_PAGE_DATA, {
    postId,
    limit,
    notIn,
  });

  const reactions = data?.patrikaosReactions;
  const ads = data?.patrikaosTheme?.ads;
  const inline = (ads?.articleInline ?? [])
    .filter((s) => s !== null)
    .map((s) => ({
      ...normalizeAdSlot(s),
      afterIndex: Math.max(0, s!.afterIndex ?? 0),
    }))
    .filter((s) => isSlotActive(s))
    .sort((a, b) => a.afterIndex - b.afterIndex);

  return {
    reactionsConfig: reactions
      ? {
          enabled: reactions.enabled ?? false,
          question: reactions.question ?? "",
          items: (reactions.items ?? [])
            .filter((i) => i !== null)
            .map((i) => ({ key: i!.key, emoji: i!.emoji, label: i!.label })),
        }
      : EMPTY_REACTIONS,
    reactionCounts: {
      total: data?.postReactions?.total ?? 0,
      counts: (data?.postReactions?.counts ?? [])
        .filter((c) => c !== null)
        .map((c) => ({ key: c!.key, count: c!.count ?? 0 })),
    },
    aiSummaryEnabled: data?.patrikaosAiSummary?.enabled ?? false,
    ads: {
      articleTop: activeSlot(ads?.articleTop),
      articleInline: inline,
    },
    shareCount: data?.postShareCount ?? 0,
    recommendedPosts: data?.posts?.nodes ?? [],
  };
}
