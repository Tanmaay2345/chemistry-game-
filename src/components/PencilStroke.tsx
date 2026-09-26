/**
 * One hand-drawn rule from the Figma graph paper.
 *
 * Figma exports each rule as a bitmap laid out in a rotated wrapper: an
 * absolutely positioned box, a rotation, then a zero-height strip holding the
 * image. This component reproduces that structure so the grids on every screen
 * can be expressed as data instead of repeated markup.
 */

export type Stroke = {
  src: string;
  /** Figma `left`, either a number of design pixels or a calc() string. */
  left: number | string;
  top: number;
  /** Size of the positioned box. */
  width: number;
  height: number;
  /** Rotation in degrees; omitted for rules Figma exported unrotated. */
  rotate?: number;
  /** Length of the image strip inside the rotation. */
  length: number;
  /** Top inset of the image, -1 or -2 px depending on the export. */
  inset?: 1 | 2;
};

export function PencilStroke({ src, left, top, width, height, rotate, length, inset = 1 }: Stroke) {
  const image = (
    <div style={{ position: 'absolute', inset: `-${inset}px 0 0 0` }}>
      <img alt="" src={src} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
    </div>
  );

  if (rotate === undefined) {
    return (
      <div style={{ position: 'absolute', left, top, width, height: 0 }}>{image}</div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        left,
        top,
        width,
        height,
      }}
    >
      <div style={{ flex: 'none', transform: `rotate(${rotate}deg)` }}>
        <div style={{ height: 0, position: 'relative', width: length }}>{image}</div>
      </div>
    </div>
  );
}

export function PencilGrid({ strokes }: { strokes: Stroke[] }) {
  return (
    <>
      {strokes.map((stroke, i) => (
        <PencilStroke key={i} {...stroke} />
      ))}
    </>
  );
}
