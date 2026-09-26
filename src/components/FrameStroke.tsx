/**
 * A Figma frame stroke, drawn as SVG on top of the element.
 *
 * Two reasons not to use a CSS border for these frames:
 *
 * 1. Figma strokes do not take part in layout. A CSS border does, so it pushes
 *    the frame's children inwards by the border width.
 * 2. `border-style: dashed` uses a browser-chosen rhythm. The design relies on
 *    specific ones - 2/2 on the instruction cards, 38/36 on the molecule cards.
 *
 * `align` mirrors Figma's stroke alignment: inside the frame, or centred on
 * its edge.
 */

type Props = {
  width: number;
  height: number;
  strokeWidth: number;
  color: string;
  /** SVG stroke-dasharray, e.g. "2 2". Omit for a solid stroke. */
  dash?: string;
  radius?: number;
  align?: 'inside' | 'center';
  /** Offset from the parent's padding box; pass -borderWidth to reach its border box. */
  left?: number;
  top?: number;
  /** Shifts the dash rhythm so it starts where the design starts it. */
  dashOffset?: number;
};

export function FrameStroke({
  width,
  height,
  strokeWidth,
  color,
  dash,
  radius = 0,
  align = 'inside',
  dashOffset = 0,
  left = 0,
  top = 0,
}: Props) {
  const inset = align === 'inside' ? strokeWidth / 2 : 0;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', left, top, pointerEvents: 'none', overflow: 'visible' }}
      aria-hidden="true"
    >
      <rect
        x={inset}
        y={inset}
        width={width - inset * 2}
        height={height - inset * 2}
        rx={Math.max(radius - inset, 0)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
}
