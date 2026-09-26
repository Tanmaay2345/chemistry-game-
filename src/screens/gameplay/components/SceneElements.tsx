import type { CSSProperties } from 'react';
import type {
  BoxElement,
  CarbonColor,
  CarbonElement,
  CarbonGroupsElement,
  HighlightElement,
  HydrogenColor,
  HydrogenElement,
  ImageElement,
  LineElement,
  TextElement,
  TrayElement,
} from '../scene/types';
import { CARBON_FILL, HYDROGEN_ART } from './art';

/**
 * Visual primitives of a gameplay scene. Each draws one element exactly as the
 * Figma export does; none of them knows what the element means chemically.
 */

/** Pill geometry of the two carbon sizes, from Figma's "Single bind" nodes. */
const CARBON_SIZE = {
  large: { width: 88.56, height: 82, top: 12.703, side: 2.117, px: 16.937, py: 8.468, radius: 55.76, font: 32.8, tracking: 0.328 },
  small: { width: 54, height: 50, top: 7.745, side: 1.291, px: 10.327, py: 5.164, radius: 34, font: 20, tracking: 0.2 },
} as const;

function place(el: { left: number | string; top: number; centerX?: boolean }, extra?: string): CSSProperties {
  const transforms = [el.centerX ? 'translateX(-50%)' : '', extra ?? ''].filter(Boolean).join(' ');
  return { position: 'absolute', left: el.left, top: el.top, transform: transforms || undefined };
}

/** Carbon pill - Figma "Single bind". */
export function CarbonPill({ color, size = 'large', highlight, style, dataKey }: {
  color: CarbonColor;
  size?: 'large' | 'small';
  highlight?: number;
  style?: CSSProperties;
  dataKey?: string;
}) {
  const g = CARBON_SIZE[size];
  return (
    <div
      data-atom="C"
      data-color={color}
      data-key={dataKey}
      style={{
        position: 'relative',
        flexShrink: 0,
        backgroundColor: CARBON_FILL[color],
        borderColor: `rgba(255,255,255,${highlight ?? 1})`,
        borderStyle: 'solid',
        borderTopWidth: g.top,
        borderRightWidth: g.side,
        borderBottomWidth: g.side,
        borderLeftWidth: g.side,
        alignContent: 'stretch',
        display: 'flex',
        height: g.height,
        alignItems: 'center',
        paddingLeft: g.px,
        paddingRight: g.px,
        paddingTop: g.py,
        paddingBottom: g.py,
        borderRadius: g.radius,
        width: g.width,
        ...style,
      }}
    >
      <p
        style={{
          wordBreak: 'break-word',
          flex: '1 0 0',
          fontFamily: 'Lexend, sans-serif',
          fontWeight: 500,
          lineHeight: 'normal',
          minWidth: 1,
          position: 'relative',
          fontSize: g.font,
          textAlign: 'center',
          color: '#ffffff',
          letterSpacing: g.tracking,
        }}
      >
        C
      </p>
    </div>
  );
}

export function Carbon({ el }: { el: CarbonElement }) {
  return <CarbonPill color={el.color} size={el.size} highlight={el.highlight} style={place(el, el.transform)} dataKey={el.key} />;
}

/** Selectable carbon groups - white boxes of small carbons in a row. */
export function CarbonGroups({ el }: { el: CarbonGroupsElement }) {
  return (
    <div data-key={el.key} style={{ ...place(el), alignContent: 'stretch', display: 'flex', gap: el.gap, alignItems: 'center' }}>
      {el.groups.map((group, i) => (
        <div
          key={i}
          data-group={i}
          style={{
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#e6e6e6',
            borderStyle: 'solid',
            alignContent: 'stretch',
            display: 'flex',
            gap: 9,
            alignItems: 'center',
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 8,
            paddingBottom: 8,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {group.map((color, j) => (
            <CarbonPill key={j} color={color} size="small" highlight={el.highlight} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Text placed on the play area. */
export function PlacedText({ el }: { el: TextElement }) {
  return (
    <p
      data-key={el.key}
      style={{
        ...place(el),
        wordBreak: 'break-word',
        fontFamily: 'Lexend, sans-serif',
        fontWeight: el.fontWeight,
        lineHeight: 'normal',
        fontSize: el.fontSize,
        color: el.color,
        whiteSpace: 'nowrap',
      }}
    >
      {el.text}
    </p>
  );
}

/** The 47px hydrogen disc with its "H" label - Figma "\Mocule". */
export function HydrogenGlyph({ color, style, dataKey, art }: { color: HydrogenColor; style?: CSSProperties; dataKey?: string; art?: string }) {
  return (
    <div data-atom="H" data-color={color} data-key={dataKey} style={{ position: 'relative', flexShrink: 0, width: 47, height: 47, ...style }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 47, height: 47 }}>
        <img alt="" src={art ?? HYDROGEN_ART[color]} style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
      </div>
      <p
        style={{
          wordBreak: 'break-word',
          position: 'absolute',
          fontFamily: 'Lexend, sans-serif',
          fontWeight: 500,
          lineHeight: 'normal',
          left: 24,
          fontSize: 20,
          textAlign: 'center',
          color: '#ffffff',
          top: 11,
          letterSpacing: 0.2,
          whiteSpace: 'nowrap',
          transform: 'translateX(-50%)',
        }}
      >
        H
      </p>
    </div>
  );
}

export function Hydrogen({ el }: { el: HydrogenElement }) {
  const extra = [el.rotate ? `rotate(${el.rotate}deg)` : '', el.scale ? `scale(${el.scale})` : ''].filter(Boolean).join(' ');
  return <HydrogenGlyph color={el.color} style={{ ...place(el, extra || undefined), opacity: el.opacity }} dataKey={el.key} art={el.art} />;
}

const TRAY_STYLE = {
  dashed: { borderStyle: 'dashed', borderColor: '#d4cdcd', radius: 8 },
  solid: { borderStyle: 'solid', borderColor: '#d8d8d8', radius: 5 },
  plain: { borderStyle: 'solid', borderColor: '#e8e8e8', radius: 8 },
} as const;

/** A row of hydrogens in a selection, collected or ethane tray. */
export function Tray({ el }: { el: TrayElement }) {
  const dashed = el.variant === 'dashed';
  const look = TRAY_STYLE[el.variant];
  return (
    <div
      data-key={el.key}
      style={{
        ...place(el),
        width: el.width,
        borderWidth: 1,
        borderStyle: look.borderStyle,
        borderColor: el.borderColor ?? look.borderColor,
        backgroundColor: dashed || el.filled === false ? undefined : '#ffffff',
        alignContent: 'stretch',
        display: 'flex',
        gap: el.gap,
        alignItems: 'center',
        paddingTop: el.padding.top,
        paddingRight: el.padding.right,
        paddingBottom: el.padding.bottom,
        paddingLeft: el.padding.left,
        borderRadius: look.radius,
      }}
    >
      {dashed && <div aria-hidden style={{ position: 'absolute', backgroundColor: '#ffffff', inset: 0, pointerEvents: 'none', borderRadius: 8 }} />}
      {el.atoms.map((color, i) => (
        <HydrogenGlyph key={i} color={color} />
      ))}
      {el.innerShadow && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit', boxShadow: el.innerShadow }} />
      )}
    </div>
  );
}

/** A rotated line bitmap: bond slots and paper trajectories. */
export function Line({ el }: { el: LineElement }) {
  const image = (
    <div style={{ position: 'absolute', inset: typeof el.inset === 'number' ? `-${el.inset}px 0 0 0` : el.inset }}>
      <img alt="" src={el.src} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
    </div>
  );
  if (el.rotate === undefined) {
    return <div data-key={el.key} style={{ ...place(el), width: el.width, height: 0 }}>{image}</div>;
  }
  return (
    <div data-key={el.key} style={{ ...place(el), display: 'flex', alignItems: 'center', justifyContent: 'center', width: el.width, height: el.height }}>
      <div style={{ flex: 'none', transform: `rotate(${el.rotate}deg)` }}>
        <div style={{ height: 0, position: 'relative', width: el.length }}>{image}</div>
      </div>
    </div>
  );
}

/** Any other placed bitmap: paper, arrows, splash. */
export function PlacedImage({ el }: { el: ImageElement }) {
  const img = <img alt="" src={el.src} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />;
  return (
    <div data-key={el.key} style={{ ...place(el, el.rotate ? `rotate(${el.rotate}deg)` : undefined), width: el.width, height: el.height, opacity: el.opacity, mixBlendMode: el.blendMode as CSSProperties['mixBlendMode'] }}>
      {el.inset ? <div style={{ position: 'absolute', inset: el.inset }}>{img}</div> : <div style={{ position: 'absolute', inset: 0 }}>{img}</div>}
    </div>
  );
}

/** A bordered container drawn on its own, with its atoms placed separately. */
export function Box({ el }: { el: BoxElement }) {
  return (
    <div
      data-key={el.key}
      style={{
        ...place(el),
        width: el.width,
        height: el.height,
        borderWidth: 1,
        borderStyle: el.border,
        borderColor: el.borderColor,
        backgroundColor: el.filled === false ? undefined : '#ffffff',
        borderRadius: el.radius,
        boxShadow: el.innerShadow,
      }}
    />
  );
}

/** Translucent highlight over the active prefix chip. */
export function ChipHighlight({ el }: { el: Pick<HighlightElement, 'left' | 'top' | 'width' | 'height'> & { centerX?: boolean } }) {
  return (
    <div
      style={{
        ...place(el),
        borderWidth: 1,
        borderColor: '#e4e2e2',
        borderStyle: 'solid',
        width: el.width,
        height: el.height,
        pointerEvents: 'none',
        borderRadius: 21,
        boxShadow: '0px 4px 4px 0px rgba(152,145,145,0.25)',
      }}
    >
      <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 21, background: 'linear-gradient(to right, rgba(16,153,255,0.2) 30%, rgba(172,199,219,0.2) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: 'inset 0px 4px 4px 0px rgba(193,191,191,0.25)' }} />
    </div>
  );
}
