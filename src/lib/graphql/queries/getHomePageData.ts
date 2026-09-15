import { fetchGraphQL } from "../client";
import { activeSlots, type AdSlotConfig, type RawAdSlot } from "./getTheme";
import { POST_NODES, type WPCardPost } from "./getPostsByCategory";

/**
 * Homepage payload in ONE round-trip: seven aliased post connections (one per
 * section) plus the latest-rail ad slots. Sections used to fetch one after
 * another as Astro rendered them top-down — all of it is independent, so it
 * travels together and the page renders after a single WP round-trip.
 *
 * An empty `$province` means "all posts" (WPGraphQL's empty-categoryName
 * behavior), mirroring the original ProvinceSection branching. Content-ramp
 * fallbacks (empty named category → all posts) stay in the page so the extra
 * query only fires when a feed is actually empty.
 */

/** Section sizes — the query and the page's ramp-up fallbacks share these. */
export const HOME_LIMITS = {
  featured: 6,
  latest: 5,
  allPosts: 8,
  provinceMain: 8,
  provincePopular: 6,
  tech: 8,
  sports: 17,
} as const;

export type HomePageData = {
  featured: WPCardPost[];
  latest: WPCardPost[];
  /** The unfiltered feed (the reference's "news" section pulls all posts). */
  allPosts: WPCardPost[];
  provinceMain: WPCardPost[];
  provincePopular: WPCardPost[];
  tech: WPCardPost[];
  sports: WPCardPost[];
  /** WP ads.latestSidebar — normalized + active-filtered, in WP order. */
  railAds: AdSlotConfig[];
};

const GET_HOME_PAGE_DATA = `
  query GetHomePageData($province: String = "") {
    featured: posts(first: ${HOME_LIMITS.featured}, where: { categoryName: "featured" }) { ${POST_NODES} }
    latest: posts(first: ${HOME_LIMITS.latest}, where: { categoryName: "latest" }) { ${POST_NODES} }
    allPosts: posts(first: ${HOME_LIMITS.allPosts}) { ${POST_NODES} }
    provinceMain: posts(first: ${HOME_LIMITS.provinceMain}, where: { categoryName: $province }) { ${POST_NODES} }
    provincePopular: posts(first: ${HOME_LIMITS.provincePopular}, where: { categoryName: $province }) { ${POST_NODES} }
    tech: posts(first: ${HOME_LIMITS.tech}, where: { categoryName: "tech" }) { ${POST_NODES} }
    sports: posts(first: ${HOME_LIMITS.sports}, where: { categoryName: "sports" }) { ${POST_NODES} }
    patrikaosTheme {
      ads {
        latestSidebar { enabled imageUrl alt linkUrl expiresAt }
      }
    }
  }
`;

type HomePageDataResponse = {
  featured: { nodes: WPCardPost[] | null } | null;
  latest: { nodes: WPCardPost[] | null } | null;
  allPosts: { nodes: WPCardPost[] | null } | null;
  provinceMain: { nodes: WPCardPost[] | null } | null;
  provincePopular: { nodes: WPCardPost[] | null } | null;
  tech: { nodes: WPCardPost[] | null } | null;
  sports: { nodes: WPCardPost[] | null } | null;
  patrikaosTheme: {
    ads: {
      latestSidebar: Array<RawAdSlot | null> | null;
    } | null;
  } | null;
};

export async function getHomePageData(
  province = "",
): Promise<HomePageData> {
  const data = await fetchGraphQL<HomePageDataResponse>(GET_HOME_PAGE_DATA, {
    province,
  });
  return {
    featured: data?.featured?.nodes ?? [],
    latest: data?.latest?.nodes ?? [],
    allPosts: data?.allPosts?.nodes ?? [],
    provinceMain: data?.provinceMain?.nodes ?? [],
    provincePopular: data?.provincePopular?.nodes ?? [],
    tech: data?.tech?.nodes ?? [],
    sports: data?.sports?.nodes ?? [],
    railAds: activeSlots(data?.patrikaosTheme?.ads?.latestSidebar),
  };
}
