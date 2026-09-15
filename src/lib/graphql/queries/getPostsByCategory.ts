import { fetchGraphQL } from '../client';

export type WPCardPost = {
  __typename: 'Post';
  databaseId: number;
  title: string;
  excerpt: string | null;
  date: string;
  dateGmt: string;
  link: string;
  slug: string;
  author: { node: { name: string | null; avatar: { url: string } | null } | null } | null;
  featuredImage: { node: { sourceUrl: string; altText: string | null; mediaDetails: { width: number | null; height: number | null } | null } } | null;
  categories: { nodes: Array<{ name: string; slug: string }> } | null;
};

export const POST_NODES = `
  nodes {
    __typename
    databaseId
    title
    excerpt
    date
    dateGmt
    link
    slug
    author { node { name avatar { url } } }
    featuredImage { node { sourceUrl altText mediaDetails { width height } } }
    categories { nodes { name slug } }
  }
`;

const GET_ALL_POSTS = `
  query GetAllPosts($limit: Int = 10) {
    posts(first: $limit, where: { orderby: { field: DATE, order: DESC } }) {
      ${POST_NODES}
    }
  }
`;

const GET_POSTS_BY_CATEGORY = `
  query GetPostsByCategory($slug: String = "", $limit: Int = 10, $notIn: [ID] = []) {
    posts(first: $limit, where: { categoryName: $slug, notIn: $notIn }) {
      ${POST_NODES}
    }
  }
`;

type PostsResponse = { posts: { nodes: WPCardPost[] | null } | null };

/**
 * Posts for a category slug newest-first. Empty slug returns all posts
 * (mirrors the reference query). Callers fall back to this when a named
 * category has no posts yet so sections still render during content ramp-up.
 */
export async function getPostsByCategory(
  slug: string,
  limit = 10,
  notIn: number[] = [],
): Promise<WPCardPost[]> {
  const data = slug
    ? await fetchGraphQL<PostsResponse>(GET_POSTS_BY_CATEGORY, { slug, limit, notIn })
    : await fetchGraphQL<PostsResponse>(GET_ALL_POSTS, { limit });
  return data?.posts?.nodes ?? [];
}
