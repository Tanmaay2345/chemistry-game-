import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { identityReceived, initialAuthState, ready, signedOut, type AuthState } from './authState.ts';
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
      // An identity that could not be read leaves the state alone, so a failed
      // attempt strands nobody.
      setState((current) => identityReceived(current, identity));
    };

    void prepareGoogleSignIn((token) => void onAccessToken(token)).then((signIn) => {
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
    requestSignIn.current?.();
  }, []);

  const signOut = useCallback(() => setState(signedOut()), []);

  const value = useMemo<AuthValue>(
    () => ({ status: state.status, user: state.user, signInAvailable, signIn, signOut }),
    [state.status, state.user, signInAvailable, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
