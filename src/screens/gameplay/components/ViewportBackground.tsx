import type { GameplayLayout } from '../layout/useGameplayLayout';

/**
 * The part of the gameplay page laid out against the window rather than the
 * design frame: the white page and the two pencil bands, pinned to the left
 * and right edges.
 *
 * Each band is two 53px strips of ruled lines with a 24px gap (Figma
 * 4589:21513 / 4589:21548). Their width follows the design unit, so they
 * never reach into the gameplay; their height always fills the window. The
 * strips are near-vertical lines, so only the vertical is stretched when the
 * window is taller than the design (a stretch along the lines is invisible).
 */

const BAND_WIDTH = 130;
const STRIP_WIDTH = 53;
const STRIP_GAP = 24;
const STRIPS = [
  { src: '/figma/d77c7.svg', height: 1035 },
  { src: '/figma/2f6db.svg', height: 1026 },
];
/** Figma sizes the band group 1025 high and centres the strips in it. */
const BAND_HEIGHT = 1025;

function Band({ left, k, height }: { left: number; k: number; height: number }) {
  const stretch = height / (BAND_HEIGHT * k);
  return (
    <div
      aria-hidden
      style={{ position: 'absolute', backgroundColor: '#ffffff', display: 'flex', gap: STRIP_GAP * k, height, alignItems: 'center', left, top: 0 }}
    >
      {STRIPS.map((strip) => (
        <div key={strip.src} style={{ height: strip.height * k * stretch, position: 'relative', flexShrink: 0, width: STRIP_WIDTH * k }}>
          <img alt="" src={strip.src} style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      ))}
    </div>
  );
}

export function ViewportBackground({ layout }: { layout: GameplayLayout }) {
  const k = layout.unit;
  const height = Math.max(layout.height, BAND_HEIGHT * k);
  return (
    <>
      <Band left={0} k={k} height={height} />
      <Band left={layout.width - BAND_WIDTH * k} k={k} height={height} />
    </>
  );
}
