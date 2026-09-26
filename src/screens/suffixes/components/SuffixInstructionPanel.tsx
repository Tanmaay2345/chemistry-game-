import { FrameStroke } from '../../../components/FrameStroke';
import type { SuffixFrame } from '../data/suffixFrames';

/**
 * Paper plane and instruction card on the suffix frames (Figma 4589:30447 /
 * 4589:30426 / 4589:30384).
 *
 * The shared InstructionCard is fixed to the blue onboarding theme, so this is
 * a scoped variant: the stroke colour, cog art, plane and ticks come from the
 * frame. The frame draws no button, so - as on the earlier screens - the card
 * is the continue control when `onContinue` is given.
 */

const SPIKE_POSITIONS = [
  { left: 30, top: 52 },
  { left: 44, top: 44 },
  { left: 47, top: 7 },
  { left: 50, top: 30 },
  { left: 33, top: 0 },
  { left: 13, top: 1 },
  { left: 1, top: 14 },
  { left: 0, top: 30 },
  { left: 8, top: 46 },
];

function ThemedCog({ ellipse, spikes }: SuffixFrame['panel']['cog']) {
  return (
    <div style={{ height: 64, position: 'relative', flexShrink: 0, width: 62 }}>
      <div style={{ position: 'absolute', left: 5, top: 5, width: 53, height: 53 }}>
        <img alt="" src={ellipse} style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
      </div>
      <p style={{ wordBreak: 'break-word', position: 'absolute', fontFamily: 'Lexend, sans-serif', fontWeight: 700, lineHeight: 'normal', left: 16, fontSize: 20, color: '#ffffff', top: 19, whiteSpace: 'nowrap' }}>
        c-c
      </p>
      {SPIKE_POSITIONS.map((pos, i) => (
        <div key={i} style={{ position: 'absolute', left: pos.left, top: pos.top, width: 12, height: 12 }}>
          <div style={{ position: 'absolute', inset: '0 6.7%' }}>
            <img alt="" src={spikes[i]} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Tick({ src, top }: { src: string; top: number }) {
  return (
    <div style={{ position: 'absolute', height: 0, left: 1, top, width: 39 }}>
      <div style={{ position: 'absolute', inset: '-7px 0 0 0' }}>
        <img alt="" src={src} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

type Props = {
  frame: SuffixFrame;
  onContinue?: () => void;
};

export function SuffixInstructionPanel({ frame, onContinue }: Props) {
  const p = frame.panel;
  return (
    <div
      style={{
        position: 'absolute',
        alignContent: 'stretch',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        left: p.left,
        top: 699,
        width: 932,
        transform: 'translateX(-50%)',
      }}
    >
      <div style={{ height: 54.5, position: 'relative', flexShrink: 0, width: 173 }}>
        <div style={{ position: 'absolute', inset: '-1.83% -0.25% -1.87% -1.14%' }}>
          <img alt="" src={p.plane} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      </div>

      <div
        className={onContinue ? 'panelContinue' : undefined}
        onClick={onContinue}
        role={onContinue ? 'button' : undefined}
        tabIndex={onContinue ? 0 : undefined}
        // The card is the control; say so, after saying what it teaches.
        aria-label={onContinue ? `${frame.panel.title} ${frame.panel.body} Continue.` : undefined}
        onKeyDown={(event) => {
          if (onContinue && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onContinue();
          }
        }}
        style={{
          backgroundColor: '#ffffff',
          borderWidth: 4,
          borderColor: 'transparent',
          borderStyle: 'solid',
          height: 120,
          alignContent: 'stretch',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          padding: 24,
          position: 'relative',
          borderRadius: 16,
          flexShrink: 0,
          width: '100%',
        }}
      >
        <FrameStroke width={932} height={120} strokeWidth={4} color={p.color} dash="2 2" radius={16} left={-4} top={-4} />
        <ThemedCog {...p.cog} />
        <div style={{ wordBreak: 'break-word', alignContent: 'stretch', display: 'flex', flex: '1 0 0', flexDirection: 'column', gap: 8, alignItems: 'flex-start', lineHeight: 'normal', minWidth: 1, position: 'relative' }}>
          <p style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 600, position: 'relative', flexShrink: 0, fontSize: 24, color: '#000000', width: '100%' }}>{p.title}</p>
          <p style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 500, position: 'relative', flexShrink: 0, color: '#6d6d6d', fontSize: 18, width: '100%' }}>{p.body}</p>
        </div>
        <Tick src={p.tick} top={116} />
        <Tick src={p.tick} top={2} />
      </div>
    </div>
  );
}
