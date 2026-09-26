import { GraphPaperGrid } from './components/GraphPaperGrid';
import { RulerStrips } from './components/RulerStrips';
import { HeadingBlock } from './components/HeadingBlock';
import { GoogleSignInCard } from './components/GoogleSignInCard';
import { EtheneCardDeck } from './components/EtheneCardDeck';
import { MoleculeStrip } from './components/MoleculeStrip';

/**
 * Onboarding / sign-in screen - Figma frame "H1" (4215:12036), 1444 x 1024.
 *
 * Everything here is presentation only. The screen reports the sign-in intent
 * upwards; no chemistry, game state or authentication lives in this layer.
 */

type Props = {
  /**
   * Used only when Google sign-in is unavailable, so the first screen is never
   * a dead end. Signing in itself is handled by Google's own button.
   */
  onContinueWithoutGoogle?: () => void;
};

export function OnboardingScreen({ onContinueWithoutGoogle }: Props) {
  return (
    <div style={{ backgroundColor: '#ffffff', position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <GraphPaperGrid />
      <RulerStrips />

      {/* Content row - Figma 4673:1322 */}
      <div style={{ position: 'absolute', alignContent: 'stretch', display: 'flex', gap: 173, alignItems: 'center', left: 'calc(50% - 1.5px)', top: 262, transform: 'translateX(-50%)' }}>
        {/* Left column - Figma 4673:875 */}
        <div style={{ alignContent: 'stretch', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start', position: 'relative', flexShrink: 0, width: 555 }}>
          <HeadingBlock />
          <GoogleSignInCard onContinueWithoutGoogle={onContinueWithoutGoogle} />
        </div>
        <EtheneCardDeck />
      </div>

      <MoleculeStrip />
    </div>
  );
}
