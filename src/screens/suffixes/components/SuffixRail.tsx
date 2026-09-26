import { FrameStroke } from '../../../components/FrameStroke';
import { CHIP_COLORS, CHIP_LABELS, type ChipId, type SuffixFrame } from '../data/suffixFrames';

/**
 * The Ane / Ene / Yne rail - Figma "Bond semester" (4589:29882 / 4589:30045 /
 * 4589:30204).
 *
 * Every measurement of the active chip is the inactive chip times the frame's
 * scale (e.g. 142/106 on 67: card 127.264/95, border 5.358/4, label 29.472/22),
 * so a chip is described once at base size and scaled when active. Chip
 * strokes are drawn as centred overlays, as verified on the prefix rail.
 */

const ORDER: ChipId[] = ['ane', 'ene', 'yne'];

function SuffixChip({ id, frame }: { id: ChipId; frame: SuffixFrame }) {
  const k = id === frame.active ? frame.activeScale : 1;
  const art = frame.chips[id];
  const cardWidth = 95 * k;
  const cardHeight = 73 * k;

  return (
    <div style={{ height: 86 * k, position: 'relative', flexShrink: 0, width: 106 * k }}>
      <div style={{ position: 'absolute', height: 86 * k, left: 0, top: 0, width: 106 * k }}>
        <img alt="" src={art.outline} style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
      </div>
      <div
        style={{
          position: 'absolute',
          backgroundColor: '#ffffff',
          alignContent: 'stretch',
          display: 'flex',
          height: cardHeight,
          alignItems: 'center',
          left: 0,
          paddingLeft: 24 * k,
          paddingRight: 24 * k,
          paddingTop: 10 * k,
          paddingBottom: 10 * k,
          borderRadius: 16 * k,
          top: 13 * k,
          width: cardWidth,
        }}
      >
        <FrameStroke width={cardWidth} height={cardHeight} strokeWidth={4 * k} color={CHIP_COLORS[id]} radius={16 * k} align="center" />
        <p
          style={{
            wordBreak: 'break-word',
            fontFamily: 'Lexend, sans-serif',
            fontWeight: 600,
            lineHeight: 'normal',
            position: 'relative',
            flexShrink: 0,
            fontSize: 22 * k,
            color: '#000000',
            letterSpacing: -0.88 * k,
            whiteSpace: 'nowrap',
          }}
        >
          {CHIP_LABELS[id]}
        </p>
      </div>
      <div style={{ position: 'absolute', height: 10 * k, left: 5 * k, top: 2 * k, width: 92 * k }}>
        <div style={{ position: 'absolute', inset: '0 0 -4.15% 0' }}>
          <img alt="" src={art.hatch} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  );
}

export function SuffixRail({ frame }: { frame: SuffixFrame }) {
  return (
    <div
      style={{
        position: 'absolute',
        backgroundColor: '#ffffff',
        alignContent: 'stretch',
        display: 'flex',
        gap: 56,
        alignItems: 'center',
        left: frame.rail.left,
        top: frame.rail.top,
      }}
    >
      {ORDER.map((id) => (
        <SuffixChip key={id} id={id} frame={frame} />
      ))}
      {frame.pins.map((pin, i) => (
        <div key={i} style={{ position: 'absolute', height: 35, left: pin.left, top: pin.top, width: 21 }}>
          <img alt="" src={pin.src} style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      ))}
    </div>
  );
}

/** The bond-type pill above the rail (Figma 4589:29928 / 4589:30355 / 4589:30250). */
export function BondTag({ frame }: { frame: SuffixFrame }) {
  const t = frame.tag;
  return (
    <div
      style={{
        position: 'absolute',
        backgroundColor: t.color,
        borderColor: '#dadada',
        borderStyle: 'solid',
        borderTopWidth: t.topBorder,
        borderRightWidth: t.sideBorder,
        borderBottomWidth: t.sideBorder,
        borderLeftWidth: t.sideBorder,
        alignContent: 'stretch',
        display: 'flex',
        height: t.height,
        width: t.width,
        alignItems: 'center',
        justifyContent: 'center',
        left: t.left,
        paddingLeft: t.paddingX,
        paddingRight: t.paddingX,
        paddingTop: t.paddingY,
        paddingBottom: t.paddingY,
        borderRadius: t.radius,
        top: t.top,
      }}
    >
      <p
        style={{
          wordBreak: 'break-word',
          fontFamily: 'Lexend, sans-serif',
          fontWeight: 600,
          lineHeight: 'normal',
          position: 'relative',
          flexShrink: 0,
          fontSize: t.fontSize,
          color: '#ffffff',
          whiteSpace: 'nowrap',
        }}
      >
        {t.label}
      </p>
    </div>
  );
}
