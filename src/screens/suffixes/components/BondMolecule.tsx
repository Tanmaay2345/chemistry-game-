import type { CSSProperties } from 'react';
import type { SuffixFrame } from '../data/suffixFrames';

/**
 * The two-carbon card on each suffix frame (Figma 4802:129 on 67, 4802:145 on
 * 68, 4802:180 on 69). The three are laid out differently in Figma - a flex
 * row on 67, absolutely placed atoms on 68 and 69 - so each is kept as drawn.
 *
 * Pictures only: nothing here knows what a bond is.
 */

/** A carbon atom pill. Figma draws its thick white top stroke translucent. */
function Atom({ color, highlight, style }: { color: string; highlight: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        backgroundColor: color,
        borderColor: `rgba(255,255,255,${highlight})`,
        borderStyle: 'solid',
        borderTopWidth: 11.928,
        borderRightWidth: 1.988,
        borderBottomWidth: 1.988,
        borderLeftWidth: 1.988,
        alignContent: 'stretch',
        display: 'flex',
        height: 77,
        alignItems: 'center',
        paddingLeft: 15.904,
        paddingRight: 15.904,
        paddingTop: 7.952,
        paddingBottom: 7.952,
        position: 'relative',
        borderRadius: 52.36,
        flexShrink: 0,
        width: 83.16,
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
          fontSize: 30.8,
          textAlign: 'center',
          color: '#ffffff',
          letterSpacing: 0.308,
        }}
      >
        C
      </p>
    </div>
  );
}

type BondLineProps = { src: string; width: number; inset: number; rotate?: number; style?: CSSProperties };

/**
 * A bond line: a zero-height strip holding the dotted-line bitmap. Rotated
 * lines sit in a 1px flex box, as Figma exports them; the rotated strip is a
 * hair longer (Figma's own length) so the rotation covers the box.
 */
function BondLine({ src, width, inset, rotate, style }: BondLineProps) {
  const image = (
    <div style={{ position: 'absolute', inset: `-${inset}px 0 0 0` }}>
      <img alt="" src={src} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
    </div>
  );
  if (rotate === undefined) {
    return <div style={{ height: 0, position: 'relative', flexShrink: 0, width, ...style }}>{image}</div>;
  }
  return (
    <div style={{ display: 'flex', height: 1, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0, width, ...style }}>
      <div style={{ flex: 'none', transform: `rotate(${rotate}deg)` }}>
        <div style={{ height: 0, position: 'relative', width: width + 0.004 }}>{image}</div>
      </div>
    </div>
  );
}

const card: CSSProperties = {
  position: 'absolute',
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#e9e8e8',
  borderStyle: 'solid',
  alignContent: 'stretch',
  display: 'flex',
  transform: 'translateX(-50%)',
};

/** 67 - one line between the carbons. Sits on the page root. */
function SingleBond({ frame }: { frame: SuffixFrame }) {
  return (
    <div
      style={{
        ...card,
        alignItems: 'center',
        left: 'calc(50% - 0.34px)',
        paddingLeft: 17,
        paddingRight: 17,
        paddingTop: 16,
        paddingBottom: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        top: 483,
      }}
    >
      <Atom color={frame.atomColor} highlight={frame.atomHighlight} />
      <BondLine src="/figma/8550b.svg" width={119} inset={4} rotate={0.48} />
      <Atom color={frame.atomColor} highlight={frame.atomHighlight} />
    </div>
  );
}

/** 68 - two lines. Sits inside the ruled frame. */
function DoubleBond({ frame }: { frame: SuffixFrame }) {
  return (
    <div style={{ ...card, flexDirection: 'column', alignItems: 'flex-start', left: '50%', padding: 16, borderRadius: 16, top: 486, width: 311 }}>
      <div style={{ alignContent: 'stretch', display: 'flex', gap: 10, height: 77, alignItems: 'flex-start', padding: 10, position: 'relative', flexShrink: 0, width: '100%' }}>
        <Atom color={frame.atomColor} highlight={frame.atomHighlight} style={{ position: 'absolute', left: 0, top: 0 }} />
        <BondLine src="/figma/3bccc.svg" width={119} inset={5} rotate={0.48} style={{ position: 'absolute', left: 83.16, top: 38 }} />
        <BondLine src="/figma/3bccc.svg" width={119} inset={5} rotate={0.48} style={{ position: 'absolute', left: 83, top: 50 }} />
        <Atom color={frame.atomColor} highlight={frame.atomHighlight} style={{ position: 'absolute', left: 202.16, top: 0 }} />
      </div>
    </div>
  );
}

/** 69 - three lines. Sits on the page root. */
function TripleBond({ frame }: { frame: SuffixFrame }) {
  return (
    <div style={{ ...card, flexDirection: 'column', alignItems: 'flex-start', left: 'calc(50% - 0.34px)', padding: 16, borderRadius: 16, top: 498, width: 305.32 }}>
      <div
        style={{
          alignContent: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          gap: 17,
          alignItems: 'flex-start',
          paddingLeft: 78,
          paddingRight: 78,
          paddingTop: 29,
          paddingBottom: 29,
          position: 'relative',
          flexShrink: 0,
          width: '100%',
        }}
      >
        <BondLine src="/figma/4feb6.png" width={129} inset={4} rotate={-0.44} />
        <BondLine src="/figma/6e295.png" width={126} inset={4} />
        <Atom color={frame.atomColor} highlight={frame.atomHighlight} style={{ position: 'absolute', left: 0, top: 0 }} />
        <BondLine src="/figma/29946.png" width={127} inset={4} style={{ position: 'absolute', left: 81, top: 37 }} />
        <Atom color={frame.atomColor} highlight={frame.atomHighlight} style={{ position: 'absolute', left: 202.16, top: 0 }} />
      </div>
    </div>
  );
}

export function BondMolecule({ frame }: { frame: SuffixFrame }) {
  if (frame.molecule === 'single') return <SingleBond frame={frame} />;
  if (frame.molecule === 'double') return <DoubleBond frame={frame} />;
  return <TripleBond frame={frame} />;
}
