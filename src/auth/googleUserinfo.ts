import type { GoogleIdentity } from './decodeIdToken.ts';

/**
 * Who an access token belongs to, from Google's own userinfo endpoint.
 *
 * **Still not authentication.** The browser asked Google for this and told us
 * the answer; nothing here proves it to a server we control. It is enough to
 * greet a student and to record the email they volunteered, and it must not
 * guard anything. See `decodeIdToken` for the same warning in full.
 *
 * `fetch` is injected so the parsing can be asserted without a network.
 */

export const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

type Fetch = (input: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

/**
 * The identity behind an access token, or null if Google would not say.
 *
 * The token is sent to Google and nowhere else; it is never logged, stored, or
 * put in the URL, and it does not outlive this call.
 */
export async function fetchGoogleIdentity(accessToken: string, fetchImpl?: Fetch): Promise<GoogleIdentity | null> {
  if (typeof accessToken !== 'string' || accessToken.length === 0) return null;
  const call = fetchImpl ?? (globalThis.fetch as unknown as Fetch);
  if (!call) return null;

  let payload: unknown;
  try {
    const response = await call(USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return null;
    payload = await response.json();
  } catch {
    // Offline, blocked, or a malformed response: no identity, no exception.
    return null;
  }

  if (typeof payload !== 'object' || payload === null) return null;
  const claims = payload as Record<string, unknown>;
  const sub = typeof claims.sub === 'string' ? claims.sub : null;
  // `sub` is the only field that identifies the account reliably - an email can
  // change hands - so a response without one is of no use.
  if (!sub) return null;

  const text = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined);
  return { sub, name: text(claims.name), email: text(claims.email), picture: text(claims.picture) };
}
