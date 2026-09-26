/**
 * Reads the identity out of a Google credential.
 *
 * **This is not authentication.** The token's signature is never checked, so
 * nothing here proves the person is who the payload says. A browser can hand
 * this application any payload it likes. It is enough to greet a student by
 * name and to collect an email they volunteered, and it must not be used to
 * gate content, to trust a score, or as a security boundary of any kind.
 *
 * Verifying a credential means checking its signature against Google's keys,
 * which can only be done somewhere the student does not control - a server this
 * project does not have. See `docs/` and the Phase 1 inspection for what that
 * would take.
 *
 * The raw credential never leaves this function: it is not logged, not stored,
 * and not put in the URL.
 */

/** What the interface actually needs. Nothing more is kept. */
export type GoogleIdentity = {
  /** Google's stable identifier for the account. Emails change; this does not. */
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
};

/** base64url -> the bytes it stands for, as a UTF-8 string. */
function decodeSegment(segment: string): string | null {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  try {
    const binary = atob(padded);
    // A name may hold characters outside Latin-1, which `atob` gives back a
    // byte at a time; this puts them back together.
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * The identity carried by a Google credential, or null if there is not one.
 *
 * Null covers everything malformed - the wrong number of segments, a payload
 * that is not base64url, that is not JSON, or that carries no subject. A
 * credential without `sub` is useless here, because `sub` is the only field
 * that identifies the account reliably.
 */
export function decodeIdToken(credential: string): GoogleIdentity | null {
  if (typeof credential !== 'string') return null;
  const segments = credential.split('.');
  if (segments.length !== 3) return null;

  const json = decodeSegment(segments[1]);
  if (json === null) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null) return null;

  const claims = payload as Record<string, unknown>;
  const sub = typeof claims.sub === 'string' ? claims.sub : null;
  if (!sub) return null;

  const text = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined);
  return {
    sub,
    name: text(claims.name),
    email: text(claims.email),
    picture: text(claims.picture),
  };
}
