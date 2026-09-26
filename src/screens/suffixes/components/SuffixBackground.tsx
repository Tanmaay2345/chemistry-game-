import type { ReactNode } from 'react';
import type { SuffixFrame } from '../data/suffixFrames';

/**
 * Background of the suffix frames: the pencil bands at both edges and the
 * ruled centre frame (Figma 4589:29816 / 4589:30005 / 4589:30164), which is
 * also the positioning context for the timeline, rail and tag.
 *
 * The 22 rules are the same bitmaps, in the same order, on all three frames.
 */

const RULES = [
  ...Array.from({ length: 11 }, () => '/figma/ca516.png'),
  '/figma/c9d4e.png',
  '/figma/5ee0c.png',
  '/figma/c9d4e.png',
  '/figma/5ee0c.png',
  '/figma/5ee0c.png',
  '/figma/5ee0c.png',
  '/figma/c9d4e.png',
  '/figma/5ee0c.png',
  '/figma/5ee0c.png',
  '/figma/5ee0c.png',
  '/figma/5ee0c.png',
];

function BandGroup({ src, left, height }: { src: string; left: number; height?: number }) {
  return (
    <div style={{ position: 'absolute', backgroundColor: '#ffffff', alignContent: 'stretch', display: 'flex', gap: 24, alignItems: 'center', left, top: 0, height }}>
      {[0, 1].map((i) => (
        <div key={i} style={{ height: 1035, position: 'relative', flexShrink: 0, width: 53 }}>
          <img alt="" src={src} style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      ))}
    </div>
  );
}

export function SuffixBackground({ frame, children }: { frame: SuffixFrame; children: ReactNode }) {
  return (
    <>
      <BandGroup src={frame.band} left={0} height={frame.leftBandHeight} />
      <BandGroup src={frame.band} left={1310} height={1025} />
      <div
        style={{
          position: 'absolute',
          backgroundColor: '#ffffff',
          alignContent: 'stretch',
          display: 'flex',
          gap: 48,
          height: 1022,
          alignItems: 'center',
          left: 'calc(50% + 1.5px)',
          top: 1,
          width: 1177,
          transform: 'translateX(-50%)',
        }}
      >
        {RULES.map((src, i) => (
          <div key={i} style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0, width: 2.985 }}>
            <div style={{ flex: 'none', transform: 'rotate(89.83deg)' }}>
              <div style={{ height: 0, position: 'relative', width: 1022 }}>
                <div style={{ position: 'absolute', inset: '-1px 0 0 0' }}>
                  <img alt="" src={src} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Dashed timeline */}
        <div style={{ position: 'absolute', height: 0, left: frame.timeline.left, top: frame.timeline.top, width: 1178 }}>
          <div style={{ position: 'absolute', inset: '-4px 0 0 0' }}>
            <img alt="" src={frame.timeline.src} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
          </div>
        </div>

        {children}
      </div>
    </>
  );
}
