import { FrameStroke } from '../../../components/FrameStroke';

/**
 * The stacked fact chips under the carbon diagram - Figma 4246:1291 on H3,
 * 290 x 86.
 *
 * A "Valency - 4" chip sits behind and "Atomic No - 6" in front, with the
 * hatched strip along the top edge. Same chip construction the prefix rail
 * uses later in the game, so it is kept as its own component.
 *
 * Figma overlaps the two by all but 13px, and the front chip is opaque white,
 * so "Valency - 4" was drawn and then completely covered - on the one screen
 * whose heading asks how many bonds carbon makes. The deck look is kept; the
 * front chip is dropped far enough for both facts to read.
 */
export function FactChipStack() {
  return (
    <div style={{ height: 133, position: 'relative', flexShrink: 0, width: 290 }}>
      {/* Back chip - Figma 4245:1243 */}
      <div
        style={{
          position: 'absolute',
          backgroundColor: '#ffffff',
          alignContent: 'stretch',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          left: 0,
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 10,
          paddingBottom: 10,
          borderRadius: 16,
          top: 0,
          width: 290,
          height: 68,
        }}
      >
        <FrameStroke width={290} height={68} strokeWidth={3} color="#437fed" radius={16} />
        <div style={{ height: 44, position: 'relative', flexShrink: 0, width: 42 }}>
          <div style={{ position: 'absolute', inset: '-1.25% -1.48%' }}>
            <img alt="" src="/figma/d3a5b.svg" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
          </div>
        </div>
        <p style={{ wordBreak: 'break-word', fontFamily: 'Lexend, sans-serif', fontWeight: 500, lineHeight: 0, position: 'relative', flexShrink: 0, fontSize: 24, color: '#000000', letterSpacing: -0.96, whiteSpace: 'nowrap' }}>
          <span style={{ lineHeight: 'normal' }}>Valency -</span>
          <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, lineHeight: 'normal' }}>{' 4'}</span>
        </p>
      </div>

      {/* Front chip - Figma 4245:1247 */}
      <div
        style={{
          position: 'absolute',
          backgroundColor: '#ffffff',
          alignContent: 'stretch',
          display: 'flex',
          gap: 16,
          height: 73,
          alignItems: 'center',
          left: 0,
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 10,
          paddingBottom: 10,
          borderRadius: 16,
          top: 60,
          width: 290,
        }}
      >
        <FrameStroke width={290} height={73} strokeWidth={4} color="#437fed" radius={16} align="center" />
        <div style={{ height: 44, position: 'relative', flexShrink: 0, width: 42 }}>
          <div style={{ position: 'absolute', inset: '1.02% 0.9%' }}>
            <img alt="" src="/figma/cbf4c.svg" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
          </div>
        </div>
        <p style={{ wordBreak: 'break-word', fontFamily: 'Lexend, sans-serif', fontWeight: 500, lineHeight: 0, position: 'relative', flexShrink: 0, fontSize: 0, color: '#000000', letterSpacing: -0.96, whiteSpace: 'nowrap' }}>
          <span style={{ lineHeight: 'normal', fontSize: 22 }}>Atomic No</span>
          <span style={{ lineHeight: 'normal', fontSize: 24 }}>{' -'}</span>
          <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, lineHeight: 'normal', fontSize: 24 }}>{' 6'}</span>
        </p>
      </div>

      {/* Hatched strip - Figma 4246:1290 */}
      <div style={{ position: 'absolute', height: 10, left: 15, top: 2, width: 266 }}>
        <div style={{ position: 'absolute', inset: '0 -0.22% -4.15% 0' }}>
          <img alt="" src="/figma/e765d.svg" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  );
}
