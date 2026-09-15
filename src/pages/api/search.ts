import type { APIRoute } from "astro";
import { fetchGraphQL } from "../../lib/graphql/client";
import { resolveWpLink } from "../../lib/wp/url";

export const prerender = false;

/**
 * Search endpoint for the header's live search box (ported from the
 * reference app's /api/search). Server-side GraphQL, so the PatrikaOS key
 * stays on the server. Minimum 2 characters, six results — the dropdown's
 * shape. Empty query / backend failure both degrade to an empty list, never
 * an error page.
 */

const SEARCH_POSTS = `
  query SearchPosts($search: String!) {
    posts(where: { search: $search }, first: 6) {
      nodes {
        databaseId
        title
        link
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
      }
    }
  }
`;

type SearchPostNode = {
  databaseId: number;
  title: string;
  link: string;
  featuredImage: {
    node: { sourceUrl: string; altText: string | null } | null;
  } | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return json({ posts: [] });

  const data = await fetchGraphQL<{ posts: { nodes: SearchPostNode[] | null } | null }>(
    SEARCH_POSTS,
    { search: q },
  );

  const posts = (data?.posts?.nodes ?? []).map((post) => ({
    id: post.databaseId,
    title: post.title,
    // Relative route (drops the WP origin) — the dropdown navigates in-app.
    link: resolveWpLink(post.link).href,
    imageUrl: post.featuredImage?.node?.sourceUrl ?? null,
    imageAlt: post.featuredImage?.node?.altText ?? "",
  }));

  return json({ posts });
};
