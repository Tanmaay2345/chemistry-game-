import { FrameStroke } from '../../../components/FrameStroke';

/**
 * Carbon with its four hydrogens - Figma "C2H4" frame on H3 (4244:1137),
 * 469 x 352, white with a 3px dashed #437fed frame at 22px radius.
 *
 * Purely a picture at this stage: the atoms carry no state and nothing here
 * knows about valency or bonding.
 */

const hydrogen = (src: string) => (
  <div style={{ height: 42, position: 'relative', flexShrink: 0, width: 46 }}>
    <div style={{ position: 'absolute', height: 42, left: 0, top: 0, width: 46 }}>
      <div style={{ position: 'absolute', inset: '0 -8.7% -19.05% -8.7%' }}>
        <img alt="" src={src} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
      </div>
    </div>
    <p
      style={{
        wordBreak: 'break-word',
        position: 'absolute',
        fontFamily: 'Lexend, sans-serif',
        fontWeight: 500,
        lineHeight: 'normal',
        left: 15,
        color: '#a0a0a0',
        fontSize: 20,
        top: 8,
        letterSpacing: -0.8,
        whiteSpace: 'nowrap',
      }}
    >
      H
    </p>
  </div>
);

/**
 * A bond drawn vertically: the same zero-height strip as a horizontal bond,
 * rotated inside a box as tall as the bond is long.
 */
const verticalBond = (src: string, length: number, rotate: number) => (
  <div style={{ display: 'flex', height: length, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0, width: '100%' }}>
    <div style={{ flex: 'none', transform: `rotate(${rotate}deg)` }}>
      <div style={{ height: 0, position: 'relative', width: length }}>
        <div style={{ position: 'absolute', inset: '-1px 0 0 0' }}>
          <img alt="" src={src} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  </div>
);

const bond = (src: string, width: number) => (
  <div style={{ height: 0, position: 'relative', flexShrink: 0, width }}>
    <div style={{ position: 'absolute', inset: '-1px 0 0 0' }}>
      <img alt="" src={src} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
    </div>
  </div>
);

export function MethaneCard() {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        height: 352,
        position: 'relative',
        borderRadius: 22,
        flexShrink: 0,
        width: '100%',
      }}
    >
      <FrameStroke width={469} height={352} strokeWidth={3} color="#437fed" dash="38 36" radius={22} align="center" dashOffset={17} />

      {/* Carbon */}
      <div style={{ position: 'absolute', height: 92, left: 167.5, top: 108.5, width: 98 }}>
        <div style={{ position: 'absolute', inset: '-1.09% -5.1% -9.78% -5.1%' }}>
          <img alt="" src="/figma/53847.svg" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      </div>
      <p
        style={{
          wordBreak: 'break-word',
          position: 'absolute',
          fontFamily: 'Lexend, sans-serif',
          fontWeight: 500,
          lineHeight: 'normal',
          left: 206.5,
          fontSize: 30,
          color: '#000000',
          top: 136.5,
          letterSpacing: -1.2,
          whiteSpace: 'nowrap',
        }}
      >
        C
      </p>

      {/* West hydrogen */}
      <div style={{ position: 'absolute', alignContent: 'stretch', display: 'flex', alignItems: 'center', left: 53.5, top: 134.5 }}>
        {hydrogen('/figma/58d1e.svg')}
        {bond('/figma/00510.svg', 70)}
      </div>

      {/* East hydrogen */}
      <div style={{ position: 'absolute', alignContent: 'stretch', display: 'flex', alignItems: 'center', left: 265.5, top: 133.5 }}>
        {bond('/figma/e68cb.svg', 58)}
        {hydrogen('/figma/5fd2c.svg')}
      </div>

      {/* North hydrogen */}
      <div style={{ position: 'absolute', alignContent: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', left: 193.5, top: 14.5, width: 49.99 }}>
        <div style={{ height: 42, position: 'relative', flexShrink: 0, width: '100%' }}>
          <div style={{ position: 'absolute', height: 42, left: 0, top: 0, width: 46 }}>
            <div style={{ position: 'absolute', inset: '0 -8.7% -19.05% -8.7%' }}>
              <img alt="" src="/figma/ee079.svg" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
            </div>
          </div>
          <p style={{ wordBreak: 'break-word', position: 'absolute', fontFamily: 'Lexend, sans-serif', fontWeight: 500, lineHeight: 'normal', left: 15, color: '#a0a0a0', fontSize: 20, top: 8, letterSpacing: -0.8, whiteSpace: 'nowrap' }}>
            H
          </p>
        </div>
        {verticalBond('/figma/2d970.svg', 49.99, 90)}
      </div>

      {/* South hydrogen */}
      <div style={{ position: 'absolute', alignContent: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', left: 186.5, top: 200.5, width: 60.001 }}>
        {verticalBond('/figma/60225.svg', 60.001, 89.28)}
        {hydrogen('/figma/a6659.svg')}
      </div>
    </div>
  );
}
