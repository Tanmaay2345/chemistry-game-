import { PencilGrid } from '../../components/PencilStroke';
import { InstructionCard } from '../../components/InstructionCard';
import { RulerStrips } from './components/RulerStrips';
import { PencilBands } from './components/PencilBands';
import { MethaneCard } from './components/MethaneCard';
import { FactChipStack } from './components/FactChipStack';
import { gridH3 } from './data/gridH3';
import { CARBON_VALENCY_LESSON } from '../../content/chemistry.ts';

/**
 * "How many bond can carbon make?" - Figma frame "H3" (4244:893), 1444 x 1024.
 *
 * Carbon with four hydrogens, the atomic-number / valency chips, and the
 * closing instruction card of the onboarding flow.
 */

type Props = {
  onContinue: () => void;
};

export function CarbonValencyScreen({ onContinue }: Props) {
  return (
    <div style={{ backgroundColor: '#ffffff', position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <PencilBands />
      <PencilGrid strokes={gridH3} />
      <RulerStrips />

      {/* Diagram + chips - Figma 4246:1292 */}
      <div
        style={{
          position: 'absolute',
          alignContent: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          alignItems: 'flex-start',
          left: 'calc(50% - 0.5px)',
          top: 179,
          width: 469,
          transform: 'translateX(-50%)',
        }}
      >
        <MethaneCard />
        <FactChipStack />
      </div>

      {/* Instruction card - Figma 4246:1293 */}
      <div style={{ position: 'absolute', left: '50%', top: 691, transform: 'translateX(-50%)' }}>
        <InstructionCard
          title="How many bond can carbon make ?"
          // Figma repeats the previous screen's sentence here, so the heading
          // asks a question the screen never answers. The answer is the one
          // fact the game cannot be played without.
          body={CARBON_VALENCY_LESSON}
          width={878}
          height={140}
          tickBottom={136}
          onContinue={onContinue}
        />
      </div>
    </div>
  );
}
