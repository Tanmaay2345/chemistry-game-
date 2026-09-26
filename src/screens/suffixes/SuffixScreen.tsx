import { SuffixBackground } from './components/SuffixBackground';
import { BondTag, SuffixRail } from './components/SuffixRail';
import { BondMolecule } from './components/BondMolecule';
import { SuffixInstructionPanel } from './components/SuffixInstructionPanel';
import { SUFFIX_FRAMES, type SuffixFrame } from './data/suffixFrames';

/**
 * Bond-type suffixes - Figma "Desktop - 67" (Ane), "Desktop - 68" (Ene) and
 * "Desktop - 69" (Yne), each 1440 x 1024.
 *
 * One layout, three frames. Figma parents the pieces differently per frame -
 * the instruction panel sits inside the ruled frame on 67, the molecule card
 * inside it on 68 - and that nesting decides both position and stacking, so it
 * is reproduced as drawn.
 */

type Props = {
  frame: SuffixFrame;
  onContinue?: () => void;
};

export function SuffixScreen({ frame, onContinue }: Props) {
  const panel = <SuffixInstructionPanel frame={frame} onContinue={onContinue} />;
  const molecule = <BondMolecule frame={frame} />;

  return (
    <div style={{ backgroundColor: '#ffffff', position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <SuffixBackground frame={frame}>
        <SuffixRail frame={frame} />
        <BondTag frame={frame} />
        {frame.id === 's67' && panel}
        {frame.id === 's68' && molecule}
      </SuffixBackground>
      {frame.id === 's67' && molecule}
      {frame.id !== 's67' && panel}
      {frame.id === 's69' && molecule}
    </div>
  );
}

export const Screen67 = (props: Omit<Props, 'frame'>) => <SuffixScreen frame={SUFFIX_FRAMES[0]} {...props} />;
export const Screen68 = (props: Omit<Props, 'frame'>) => <SuffixScreen frame={SUFFIX_FRAMES[1]} {...props} />;
export const Screen69 = (props: Omit<Props, 'frame'>) => <SuffixScreen frame={SUFFIX_FRAMES[2]} {...props} />;
