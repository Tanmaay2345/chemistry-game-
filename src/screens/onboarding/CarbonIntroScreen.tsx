import { PencilGrid } from '../../components/PencilStroke';
import { InstructionCard } from '../../components/InstructionCard';
import { RulerStrips } from './components/RulerStrips';
import { HeadingBlock } from './components/HeadingBlock';
import { gridH2 } from './data/gridH2';

/**
 * "What if you are carbon?" - Figma frame "H2" (4673:1034), 1444 x 1024.
 *
 * The sign-in card and the molecule visuals drop away; the heading moves to
 * its own position and the instruction card takes the lower half.
 */

type Props = {
  onContinue: () => void;
};

export function CarbonIntroScreen({ onContinue }: Props) {
  return (
    <div style={{ backgroundColor: '#ffffff', position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <PencilGrid strokes={gridH2} />
      <RulerStrips />

      {/* Heading - Figma 4673:1321 */}
      <div style={{ position: 'absolute', alignContent: 'stretch', display: 'flex', alignItems: 'center', left: 'calc(8.33% + 137.67px)', top: 250 }}>
        <div style={{ alignContent: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', position: 'relative', flexShrink: 0, width: 555 }}>
          <HeadingBlock />
        </div>
      </div>

      {/* Instruction card - Figma 4673:1302 */}
      <div style={{ position: 'absolute', left: '50%', top: 620, transform: 'translateX(-50%)' }}>
        <InstructionCard
          title="WHAT IF YOU ARE CARBON?"
          body="You have a responsibility to make the meaningfully bond with the other carbon atoms to form the carbon compounds ."
          width={878}
          height={140}
          tickBottom={136}
          onContinue={onContinue}
        />
      </div>
    </div>
  );
}
