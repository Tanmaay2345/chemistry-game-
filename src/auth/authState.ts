import { decodeIdToken, type GoogleIdentity } from './decodeIdToken.ts';

/**
 * Who the application currently thinks it is talking to.
 *
 * Kept apart from React on purpose. The transitions are the part worth
 * asserting, and the test runner (`node --test`) loads `.ts` but not `.tsx`,
 * so the rules live here and `AuthContext` is only the wiring around them -
 * the same split the voice layer uses between `voiceForEvent` and its hook.
 *
 * "Identified", not "authenticated": see `decodeIdToken`. Nothing here has
 * been verified against Google, and none of it may guard anything.
 */

export type AuthStatus =
  /** Waiting for Google's script, or for the student to act. */
  | 'loading'
  /** Nobody identified: the opening state, and the state after signing out. */
  | 'signed_out'
  /** A credential was read. Identified, not verified. */
  | 'signed_in';

export type AuthState = {
  status: AuthStatus;
  user: GoogleIdentity | null;
};

export const initialAuthState: AuthState = { status: 'loading', user: null };

/** Google's script is ready, or has failed: either way nobody is identified yet. */
export function ready(state: AuthState): AuthState {
  return state.status === 'signed_in' ? state : { status: 'signed_out', user: null };
}

/**
 * An identity came back from Google.
 *
 * Nothing, or something unreadable, leaves the state as it was, so a failed or
 * dismissed attempt strands nobody: the student is still signed out and can
 * try again.
 */
export function identityReceived(state: AuthState, user: GoogleIdentity | null): AuthState {
  if (!user) return state.status === 'loading' ? { status: 'signed_out', user: null } : state;
  return { status: 'signed_in', user };
}

/**
 * The same, for an identity carried by a credential JWT.
 *
 * Kept for the Sign in with Google button flow, which returns an ID token
 * rather than an access token. The card now uses Google's token model, so this
 * is the path that would be used again if the rendered button came back.
 */
export function credentialReceived(state: AuthState, credential: string): AuthState {
  return identityReceived(state, decodeIdToken(credential));
}

/**
 * Forgets the identity.
 *
 * In memory only - there is no session to end, because none was ever created.
 * Nothing was written to storage, so nothing has to be cleared.
 */
export function signedOut(): AuthState {
  return { status: 'signed_out', user: null };
}
