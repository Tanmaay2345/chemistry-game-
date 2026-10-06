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
  /**
   * Why the last attempt did not finish, in words for the student.
   *
   * Google refuses a sign-in for reasons the page cannot see - an account that
   * is not on the project's test-user list, a popup the browser closed, a
   * network that dropped. Those used to be discarded, which left the card
   * looking like a button that does nothing. Never holds a token, an address
   * or a client id: only a sentence.
   */
  error: string | null;
};

/** Why an attempt ended, which is as much as the page is told. */
export type SignInFailure =
  /** Google would not authorise the attempt, or the popup never finished. */
  | 'authorization'
  /** Google authorised it, but the account could not be read afterwards. */
  | 'identity';

/** What the student is told. Deliberately short, and free of anything secret. */
export const SIGN_IN_FAILURE_MESSAGE: Readonly<Record<SignInFailure, string>> = {
  // Only ever "try again": where Google is available the card always asks
  // Google, so offering to carry on without it would promise a way forward
  // the card does not have.
  authorization: 'Google sign-in did not finish. Press to try again.',
  identity: 'Signed in, but your account could not be read. Press to try again.',
};

export const initialAuthState: AuthState = { status: 'loading', user: null, error: null };

/** Google's script is ready, or has failed: either way nobody is identified yet. */
export function ready(state: AuthState): AuthState {
  return state.status === 'signed_in' ? state : { status: 'signed_out', user: null, error: state.error };
}

/**
 * A fresh attempt begins.
 *
 * Clears whatever the last one said, so a student who presses again is not
 * reading the reason the previous press failed.
 */
export function signInStarted(state: AuthState): AuthState {
  return state.error === null ? state : { ...state, error: null };
}

/**
 * An attempt ended without identifying anybody.
 *
 * It leaves the student where they were and able to try again: the status only
 * moves on from `loading`, so a failure never advances the flow and never
 * signs anyone in.
 */
export function signInFailed(state: AuthState, failure: SignInFailure): AuthState {
  return {
    status: state.status === 'loading' ? 'signed_out' : state.status,
    user: state.user,
    error: SIGN_IN_FAILURE_MESSAGE[failure],
  };
}

/**
 * An identity came back from Google.
 *
 * Nothing, or something unreadable, leaves the state as it was, so a failed or
 * dismissed attempt strands nobody: the student is still signed out and can
 * try again.
 */
export function identityReceived(state: AuthState, user: GoogleIdentity | null): AuthState {
  if (!user) return state.status === 'loading' ? { status: 'signed_out', user: null, error: state.error } : state;
  // Arriving clears whatever the last attempt said: it is no longer true.
  return { status: 'signed_in', user, error: null };
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
  return { status: 'signed_out', user: null, error: null };
}
