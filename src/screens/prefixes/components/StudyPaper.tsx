/**
 * Background of Figma frame "915" (4589:15506): dense pencil bands at both
 * edges (4589:15507, 4589:15542) and the ruled centre frame (4589:15577).
 *
 * The centre frame is also the positioning context for the rail, the dashed
 * timeline, the badge and the highlight, so it takes children.
 */

import type { ReactNode } from 'react';

// Figma draws the first eleven rules with one bitmap and varies the rest.
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

function EdgeBand({ left }: { left: number }) {
  return (
    <div style={{ position: 'absolute', backgroundColor: '#ffffff', alignContent: 'stretch', display: 'flex', gap: 24, height: 1025, alignItems: 'center', left, top: 0 }}>
      <div style={{ height: 1035, position: 'relative', flexShrink: 0, width: 53 }}>
        <img alt="" src="/figma/d77c7.svg" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
      </div>
      <div style={{ height: 1026, position: 'relative', flexShrink: 0, width: 53 }}>
        <img alt="" src="/figma/2f6db.svg" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

export function StudyPaper({ children }: { children: ReactNode }) {
  return (
    <>
      <EdgeBand left={0} />
      <EdgeBand left={1310} />
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

        {/* Dashed timeline - Figma 4589:15722 */}
        <div style={{ position: 'absolute', display: 'flex', height: 2, alignItems: 'center', justifyContent: 'center', left: 0, top: 265, width: 1180 }}>
          <div style={{ flex: 'none', transform: 'rotate(-0.1deg)' }}>
            <div style={{ height: 0, position: 'relative', width: 1180.002 }}>
              <div style={{ position: 'absolute', inset: '-4px 0 0 0' }}>
                <img alt="" src="/figma/ee16b.png" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        {children}
      </div>
    </>
  );
}
