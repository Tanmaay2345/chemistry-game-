import type { CSSProperties } from 'react';
import { FrameStroke } from '../../../components/FrameStroke';
import { useAuth } from '../../../auth/AuthContext';

/**
 * "Sign in with Google" card from the Figma frame "H1" (4209:10208).
 *
 * The design is the button: white card, 4px dashed #5bb9ff border, 16px
 * radius, the sketched paper illustration with the Google mark on top, and the
 * two torn-paper ticks on the left edge. Nothing is drawn over it and nothing
 * is hidden behind it.
 *
 * Pressing it starts Google's own account chooser through the token model,
 * which is the supported way to begin sign-in from a control the application
 * designed itself:
 * https://developers.google.com/identity/oauth2/web/guides/use-token-model
 *
 * Google runs the chooser, the sign-in and the consent in its own popup. A
 * student who closes that popup is simply back here, still signed out, free to
 * press again.
 */

type Props = {
  /**
   * Used only when Google sign-in is unavailable - no client id configured, or
   * the script blocked. Without it the first screen would be a dead end.
   */
  onContinueWithoutGoogle?: () => void;
};

const card: CSSProperties = {
  backgroundColor: '#ffffff',
  borderWidth: 4,
  borderColor: 'transparent',
  borderStyle: 'solid',
  height: 120,
  alignContent: 'stretch',
  cursor: 'pointer',
  display: 'flex',
  gap: 16,
  alignItems: 'center',
  padding: 24,
  position: 'relative',
  borderRadius: 16,
  flexShrink: 0,
  width: '100%',
  font: 'inherit',
  textAlign: 'left',
};

export function GoogleSignInCard({ onContinueWithoutGoogle }: Props) {
  const { signInAvailable, signIn, signInError, status } = useAuth();

  // Google when it is there, and the plain step forward when it is not, so the
  // first screen is never a dead end.
  const press = signInAvailable ? signIn : onContinueWithoutGoogle;

  return (
    <button
      type="button"
      className="signInCard"
      style={card}
      onClick={press}
      disabled={status === 'loading'}
      aria-busy={status === 'loading'}
    >
      <FrameStroke width={555} height={120} strokeWidth={4} color="#5bb9ff" dash="2 2" radius={16} left={-4} top={-4} />
      <div style={{ height: 64, position: 'relative', flexShrink: 0, width: 62 }}>
        <div style={{ position: 'absolute', inset: '0 0 -3.13% 0' }}>
          <img alt="" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} src="/figma/40e0c.svg" />
        </div>
      </div>
      <div style={{ wordBreak: 'break-word', alignContent: 'stretch', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', lineHeight: 'normal', position: 'relative', flexShrink: 0, textAlign: 'left', width: 396 }}>
        <p style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 600, position: 'relative', flexShrink: 0, fontSize: 24, color: '#000000', width: '100%' }}>
          Sign in with Google
        </p>
        {/*
          The card's own second line, or the reason the last attempt did not
          finish. One line either way: a message added beside this one would
          grow the card past the frame drawn around it, and two sentences
          competing for the same glance is not clearer than one.
         */}
        <p
          role={signInError ? 'alert' : undefined}
          style={{
            fontFamily: 'Lexend, sans-serif',
            fontWeight: 500,
            position: 'relative',
            flexShrink: 0,
            color: signInError ? '#c2341d' : '#6d6d6d',
            fontSize: 18,
            width: '100%',
          }}
        >
          {signInError ?? 'So you can give us email to get feedback .'}
        </p>
      </div>
      <div style={{ position: 'absolute', height: 0, left: 1, top: 116, width: 39 }}>
        <div style={{ position: 'absolute', inset: '-7px 0 0 0' }}>
          <img alt="" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} src="/figma/ddfd1.svg" />
        </div>
      </div>
      <div style={{ position: 'absolute', height: 0, left: 1, top: 2, width: 39 }}>
        <div style={{ position: 'absolute', inset: '-7px 0 0 0' }}>
          <img alt="" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} src="/figma/ddfd1.svg" />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 43, width: 24, height: 24, top: 44 }}>
        <div style={{ position: 'absolute', left: 0, width: 24, height: 24, top: 0 }}>
          <img alt="" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} src="/figma/3d6b0.svg" />
        </div>
      </div>
    </button>
  );
}
