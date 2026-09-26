/**
 * The one place that talks to Google Identity Services.
 *
 * The script itself is loaded once from `index.html`; this waits for it to
 * arrive and initialises it once. Nothing else in the application touches
 * `window.google`, and nothing here knows about React.
 *
 * If the script never arrives - blocked, offline, or no client id configured -
 * every function here reports that plainly rather than throwing. Sign-in is not
 * something the student can be stranded by.
 */

/** Only the parts of the Google API this project uses. */
type GoogleAccountsId = {
  initialize(options: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    cancel_on_tap_outside?: boolean;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
  }): void;
  disableAutoSelect(): void;
};

/**
 * Google's token model: the supported way to start sign-in from a button of
 * your own. `requestAccessToken` must be called from a user gesture, and Google
 * runs the account chooser, sign-in and consent in a popup of its own.
 *
 * https://developers.google.com/identity/oauth2/web/guides/use-token-model
 */
type GoogleOAuth2 = {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: { access_token?: string; error?: string }) => void;
    error_callback?: (error: { type?: string }) => void;
  }): { requestAccessToken: () => void };
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId; oauth2?: GoogleOAuth2 } };
  }
}

/** How long to wait for the script before giving up on sign-in. */
const SCRIPT_TIMEOUT_MS = 10_000;

/** The configured client id, or null when none is set. Never hardcoded. */
export function googleClientId(): string | null {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Resolves with Google's API once its script has run, or null if it does not.
 *
 * The script tag in `index.html` is `async defer`, so it may land before or
 * after React mounts; this covers both without loading it a second time.
 */
export function loadGoogleIdentity(timeoutMs = SCRIPT_TIMEOUT_MS): Promise<GoogleAccountsId | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const present = window.google?.accounts?.id;
  if (present) return Promise.resolve(present);

  return new Promise((resolve) => {
    const started = Date.now();
    const poll = window.setInterval(() => {
      const api = window.google?.accounts?.id;
      if (api) {
        window.clearInterval(poll);
        resolve(api);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        window.clearInterval(poll);
        resolve(null);
      }
    }, 100);
  });
}

/**
 * Initialised once per page.
 *
 * Google's `initialize` registers one global callback, so calling it again on
 * every render would leave several live at once. React invokes effects twice in
 * development, which is exactly when that would show.
 */
let initialised = false;

export type CredentialHandler = (credential: string) => void;

/**
 * Prepares Google sign-in. Returns false when it is unavailable, which callers
 * treat as "no sign-in this session" rather than as an error.
 */
export async function initializeGoogleIdentity(onCredential: CredentialHandler): Promise<boolean> {
  const clientId = googleClientId();
  if (!clientId) return false;

  const api = await loadGoogleIdentity();
  if (!api) return false;

  if (!initialised) {
    api.initialize({
      client_id: clientId,
      // Popup: a redirect would reload the page and lose where the student is,
      // and there is no server for Google to redirect back to.
      ux_mode: 'popup',
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response) => {
        // Only the decoded fields travel on from here; the credential itself is
        // never logged, stored or forwarded.
        if (response?.credential) onCredential(response.credential);
      },
    });
    initialised = true;
  }
  return true;
}

/** Tests only: lets a fresh case start from an uninitialised page. */
export function resetGoogleIdentityForTests(): void {
  initialised = false;
}

/**
 * The scopes needed to know who the student is - nothing more.
 *
 * All three are non-sensitive, so they need no Google verification, and none
 * of them reads any of the student's data.
 */
export const IDENTITY_SCOPES = 'openid email profile';

export type SignIn = () => void;

/**
 * Prepares sign-in for a button of the application's own.
 *
 * Returns the function that button calls, or null when sign-in is unavailable -
 * no client id, or Google's script never arrived. Callers treat null as "no
 * sign-in this session" rather than as an error.
 *
 * `onAccessToken` is handed the token Google issues. Dismissing the popup
 * invokes nothing at all, which is why a cancelled sign-in simply leaves the
 * student where they were.
 */
export async function prepareGoogleSignIn(
  onAccessToken: (accessToken: string) => void,
): Promise<SignIn | null> {
  const clientId = googleClientId();
  if (!clientId) return null;

  // The token client lives in the same script as the rest of Google Identity
  // Services, so waiting for one waits for both.
  const ready = await loadGoogleIdentity();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!ready || !oauth2) return null;

  const client = oauth2.initTokenClient({
    client_id: clientId,
    scope: IDENTITY_SCOPES,
    callback: (response) => {
      // Only the access token travels on, and only as far as Google's own
      // userinfo endpoint. It is never logged, stored or put in the URL.
      if (response?.access_token) onAccessToken(response.access_token);
    },
    // Fired when Google could not even open - a blocked popup, say. Nothing to
    // report to the student beyond leaving them able to try again.
    error_callback: () => {},
  });

  return () => client.requestAccessToken();
}
