import { EdgeBands } from './components/EdgeBands';
import { RuledFrame } from './components/RuledFrame';
import { PrefixRailStrip } from './components/PrefixRailStrip';
import { InstructionPanel } from './components/InstructionPanel';
import { BondCardDeck } from './components/BondCardDeck';

/**
 * Alkyne - Figma frame "A3" (4589:21120), 1440 x 1024. Introduces the C≡C triple bond.
 *
 * Presentation only: the carbons, the bond and the rail are pictures here.
 * Gameplay will attach to these pieces later without changing how they draw.
 *
 * The frame has no continue control; like the onboarding screens, the
 * instruction card advances the flow when `onContinue` is given.
 */

type Props = {
  onContinue?: () => void;
};

export function AlkyneScreen({ onContinue }: Props) {
  return (
    <div style={{ backgroundColor: '#ffffff', position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <EdgeBands />
      <RuledFrame>
        <PrefixRailStrip />
        <InstructionPanel onContinue={onContinue} />
        <BondCardDeck />
      </RuledFrame>
    </div>
  );
}
