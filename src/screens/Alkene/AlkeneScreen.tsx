import { EdgeBands } from './components/EdgeBands';
import { RuledFrame } from './components/RuledFrame';
import { PrefixRailStrip } from './components/PrefixRailStrip';
import { InstructionPanel } from './components/InstructionPanel';
import { BondCardDeck } from './components/BondCardDeck';

/**
 * Alkene - Figma frame "A2" (4589:20728), 1440 x 1024. Introduces the C=C double bond.
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

export function AlkeneScreen({ onContinue }: Props) {
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
