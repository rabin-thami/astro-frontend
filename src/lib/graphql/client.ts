const WP_GRAPHQL_URL = import.meta.env.WORDPRESS_GRAPHQL_URL;
const GRAPHQL_SECRET = import.meta.env.GRAPHQL_SECRET;

export type GraphQLStatus = 'ok' | 'config' | 'forbidden' | 'unreachable' | 'graphql';

/**
 * Bare fetch GraphQL wrapper (no graphql-request dep).
 *
 * GraphQL supports partial success: a field-level error (e.g. one
 * unresolvable list item) nulls just that field, not the whole response.
 * Only treat it as a hard failure when there's no data at all — otherwise a
 * single bad block would 404 an entire page that's 99% fine.
 */
export async function fetchGraphQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T | null> {
  if (!WP_GRAPHQL_URL) {
    console.warn('[graphql] WORDPRESS_GRAPHQL_URL is not set');
    return null;
  }
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (GRAPHQL_SECRET) headers['X-PatrikaOS-Key'] = GRAPHQL_SECRET;

    const res = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      console.error(`[graphql] HTTP ${res.status} ${res.statusText} -> ${WP_GRAPHQL_URL}`);
      return null;
    }
    const json = (await res.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
    };
    if (json.errors) {
      const level = json.data ? console.warn : console.error;
      level('[graphql] errors:\n' + JSON.stringify(json.errors, null, 2));
      if (!json.data) return null;
    }
    return json.data ?? null;
  } catch (err) {
    console.error('[graphql] fetch failed:', err);
    return null;
  }
}

export async function getGraphQLStatus(): Promise<GraphQLStatus> {
  if (!WP_GRAPHQL_URL) return 'config';
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (GRAPHQL_SECRET) headers['X-PatrikaOS-Key'] = GRAPHQL_SECRET;
    const res = await fetch(WP_GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: '{ __typename }' }),
    });
    if (res.status === 401 || res.status === 403) return 'forbidden';
    if (!res.ok) return 'unreachable';
    const json = (await res.json()) as { errors?: unknown };
    if (json.errors) return 'graphql';
    return 'ok';
  } catch {
    return 'unreachable';
  }
}
