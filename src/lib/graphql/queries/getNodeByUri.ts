import { fetchGraphQL } from '../client';
import { BLOCK_FIELDS_FRAGMENT } from '../fragments/blocks';
import type { WPBlock } from '../../wp/types';

type WPNodeBase = {
  __typename: string;
  title: string;
  date: string;
  dateGmt: string;
  link: string;
};

export type WPPostNode = WPNodeBase & {
  __typename: 'Post';
  databaseId: number;
  excerpt: string | null;
  author: { node: { name: string | null; slug: string; avatar: { url: string } | null } | null } | null;
  aiSummary: string | null;
  featuredImage: {
    node: {
      sourceUrl: string;
      altText: string | null;
      mediaDetails: { width: number | null; height: number | null } | null;
    } | null;
  } | null;
  categories: { nodes: Array<{ name: string; slug: string }> } | null;
  editorBlocks: (WPBlock | null)[];
};

export type WPPageNode = WPNodeBase & {
  __typename: 'Page';
  editorBlocks: (WPBlock | null)[];
};

export type WPCategoryNode = {
  __typename: 'Category';
  name: string;
  slug: string;
  description: string | null;
};

export type WPNode = WPPostNode | WPPageNode | WPCategoryNode;

type WPGetNodeByUriResponse = { nodeByUri: WPNode | null };

const GET_NODE_BY_URI = `
  ${BLOCK_FIELDS_FRAGMENT}
  query GetNodeByUri($uri: String!) {
    nodeByUri(uri: $uri) {
      __typename
      ... on Post {
        databaseId
        slug
        excerpt
        title
        date
        dateGmt
        link
        author { node { name slug avatar { url } } }
        aiSummary
        featuredImage { node { sourceUrl altText mediaDetails { width height } } }
        categories { nodes { name slug } }
        editorBlocks { ...BlockFields }
      }
      ... on Page {
        title
        date
        dateGmt
        link
        editorBlocks { ...BlockFields }
      }
      ... on Category {
        name
        slug
        description
      }
    }
  }
`;

export async function getNodeByUri(uri: string): Promise<WPNode | null> {
  const data = await fetchGraphQL<WPGetNodeByUriResponse>(GET_NODE_BY_URI, { uri });
  return data?.nodeByUri ?? null;
}
