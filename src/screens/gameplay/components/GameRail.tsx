import { FrameStroke } from '../../../components/FrameStroke';
import type { RailSpec } from '../scene/types';
import { ChipHighlight } from './SceneElements';

/**
 * The prefix rail as the gameplay frames draw it (e.g. Figma 4589:21608).
 *
 * One chip is enlarged by `activeScale`; every other chip is the standard
 * 106 x 86 chip. Chip strokes are centred overlays, as verified on the prefix
 * screen. The pins and dashed timeline are fixed decorations.
 */

const LABELS = ['Meth', 'Eth', 'Prop', 'But', 'Pent', 'Hex', 'Hept', 'oct'];

const PINS = [
  { left: 89, top: -12 },
  { left: 230, top: -13 },
  { left: 357, top: -17 },
  { left: 494, top: -12 },
  { left: 621, top: -13 },
  { left: 751, top: -14 },
  { left: 880, top: -15 },
  { left: 1011, top: -13 },
];

function Chip({ label, k, outline, hatch, highlight, fill }: {
  label: string;
  k: number;
  outline: string;
  hatch: string;
  highlight?: RailSpec['highlightInChip'];
  fill?: RailSpec['activeFill'];
}) {
  const w = 95 * k;
  const h = 73 * k;
  return (
    <div data-chip={label} style={{ height: 86 * k, position: 'relative', flexShrink: 0, width: 106 * k }}>
      <div style={{ position: 'absolute', height: 86 * k, left: 0, top: 0, width: 106 * k }}>
        <div style={{ position: 'absolute', inset: fill?.outlineInset ?? 0 }}>
          <img alt="" src={outline} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          backgroundColor: fill?.background ?? '#ffffff',
          alignContent: 'stretch',
          display: 'flex',
          height: h,
          alignItems: 'center',
          left: 0,
          paddingLeft: 24 * k,
          paddingRight: 24 * k,
          paddingTop: 10 * k,
          paddingBottom: 10 * k,
          borderRadius: 16 * k,
          top: 13 * k,
          width: w,
        }}
      >
        <FrameStroke width={w} height={h} strokeWidth={4 * k} color="#437fed" radius={16 * k} align="center" />
        <p
          style={{
            wordBreak: 'break-word',
            fontFamily: 'Lexend, sans-serif',
            fontWeight: 500,
            lineHeight: 'normal',
            position: 'relative',
            flexShrink: 0,
            fontSize: 22 * k,
            color: fill?.textColor ?? '#000000',
            letterSpacing: -0.88 * k,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </p>
      </div>
      <div style={{ position: 'absolute', height: 10 * k, left: 5 * k, top: 2 * k, width: 92 * k }}>
        <div style={{ position: 'absolute', inset: '0 0 -4.15% 0' }}>
          <img alt="" src={hatch} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      </div>
      {highlight && <ChipHighlight el={highlight} />}
    </div>
  );
}

export function GameRail({ rail }: { rail: RailSpec }) {
  return (
    <div style={{ position: 'absolute', height: rail.containerHeight, left: rail.left, top: rail.top, width: rail.width ?? 1180 }}>
      <div
        style={{
          position: 'absolute',
          alignContent: 'stretch',
          display: 'flex',
          gap: 24,
          height: rail.innerHeight,
          alignItems: 'center',
          justifyContent: 'center',
          left: rail.innerLeft ?? 3,
          padding: 16,
          top: rail.innerTop ?? 14,
          width: rail.innerWidth ?? 1173,
        }}
      >
        <div aria-hidden style={{ position: 'absolute', backgroundColor: '#ffffff', inset: 0, pointerEvents: 'none' }} />
        <div style={{ alignContent: 'stretch', display: 'flex', gap: 24, alignItems: 'center', position: 'relative', flexShrink: 0, width: 1059 }}>
          {LABELS.map((label, i) =>
            i === rail.activeIndex ? (
              <Chip key={label} label={label} k={rail.activeScale} outline={rail.activeOutline} hatch={rail.activeHatch} highlight={rail.highlightInChip} fill={rail.activeFill} />
            ) : (
              <Chip key={label} label={label} k={1} outline={rail.inactiveOutline ?? '/figma/dc754.svg'} hatch={rail.inactiveHatch ?? '/figma/eaad0.svg'} />
            ),
          )}
        </div>
        {PINS.map((pin, i) => (
          <div key={i} style={{ position: 'absolute', height: 35, left: pin.left, top: pin.top, width: 21 }}>
            <img alt="" src="/figma/af4cc.svg" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
          </div>
        ))}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit', boxShadow: 'inset 0px 4px 4px 0px white' }} />
      </div>
      <div style={{ position: 'absolute', display: 'flex', height: 2, alignItems: 'center', justifyContent: 'center', left: rail.timelineLeft ?? 0, top: 0, width: 1180 }}>
        <div style={{ flex: 'none', transform: 'rotate(-0.1deg)' }}>
          <div style={{ height: 0, position: 'relative', width: 1180.002 }}>
            <div style={{ position: 'absolute', inset: '-4px 0 0 0' }}>
              <img alt="" src={rail.timeline} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
