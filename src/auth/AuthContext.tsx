import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  identityReceived,
  initialAuthState,
  ready,
  signInFailed,
  signInStarted,
  signedOut,
  type AuthState,
} from './authState.ts';
import { prepareGoogleSignIn, type SignIn } from './googleIdentity.ts';
import { fetchGoogleIdentity } from './googleUserinfo.ts';
import type { GoogleIdentity } from './decodeIdToken.ts';

/**
 * Who the game is talking to.
 *
 * Wiring only: every rule lives in `authState`, which is where the tests are.
 *
 * Sign-in is started by the application's own button, using Google's token
 * model - the supported way to trigger the account chooser from a control you
 * designed yourself. Google runs the chooser, sign-in and consent in its own
 * popup; the identity that comes back is read from Google's userinfo endpoint.
 *
 * The identity is never verified by a server, so it is good for a name and an
 * email address and for nothing else. Nothing is written to storage: reloading
 * signs the student out, which is the honest behaviour for an identity that was
 * never checked.
 */

type AuthValue = {
  status: AuthState['status'];
  user: GoogleIdentity | null;
  /** True once Google can be asked. False leaves the card to its fallback. */
  signInAvailable: boolean;
  /** Why the last attempt did not finish, or null. Safe to show; never secret. */
  signInError: string | null;
  /** Starts Google's popup. Must be called from the student's own click. */
  signIn: () => void;
  /** Forgets the identity. In memory: there is no session to end. */
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState);
  const requestSignIn = useRef<SignIn | null>(null);
  const [signInAvailable, setSignInAvailable] = useState(false);

  useEffect(() => {
    let live = true;

    const onAccessToken = async (accessToken: string) => {
      const identity = await fetchGoogleIdentity(accessToken);
      if (!live) return;
      // Authorised, but the account could not be read. A separate failure from
      // being refused, and said separately, because the student can act on the
      // difference: this one is worth simply trying again.
      if (!identity) {
        setState((current) => signInFailed(current, 'identity'));
        return;
      }
      setState((current) => identityReceived(current, identity));
    };

    const onFailure = () => {
      if (!live) return;
      setState((current) => signInFailed(current, 'authorization'));
    };

    void prepareGoogleSignIn((token) => void onAccessToken(token), onFailure).then((signIn) => {
      if (!live) return;
      requestSignIn.current = signIn;
      setSignInAvailable(signIn !== null);
      // Ready either way: if Google is unavailable the student is simply
      // signed out, not left waiting on a script that will never come.
      setState((current) => ready(current));
    });

    return () => {
      live = false;
    };
  }, []);

  const signIn = useCallback(() => {
    // Clear the last reason before asking again, so the card is never showing
    // why the previous press failed while this one is still open.
    setState(signInStarted);
    requestSignIn.current?.();
  }, []);

  const signOut = useCallback(() => setState(signedOut()), []);

  const value = useMemo<AuthValue>(
    () => ({ status: state.status, user: state.user, signInError: state.error, signInAvailable, signIn, signOut }),
    [state.status, state.user, state.error, signInAvailable, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
