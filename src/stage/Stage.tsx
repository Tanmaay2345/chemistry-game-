import { useRef, type ReactNode } from 'react';
import { useDesignFit, type ContentBand } from '../layout/designFit';

/**
 * Fixed design canvas.
 *
 * The Figma frames are absolutely positioned on an artboard, so the app renders
 * that artboard at its exact size and scales it to the viewport as one piece.
 * Design pixels stay 1:1 with Figma at every window size, and pointer targets
 * move with the art because they are the same scaled elements.
 *
 * The scaling rule is shared with the gameplay (`layout/designFit`), so a
 * lesson and the game that follows it are drawn at the same size on the same
 * screen.
 */

export const STAGE_WIDTH = 1444;
export const STAGE_HEIGHT = 1024;

type Props = {
  children: ReactNode;
  /** Canvas size in design pixels; defaults to the onboarding frames' size. */
  width?: number;
  height?: number;
  /**
   * The band of the artboard that holds content. Everything outside it is
   * margin, which a short window may take before the design is scaled down.
   * Defaults to the whole artboard, which fits the frame exactly as drawn.
   */
  content?: ContentBand;
};

export function Stage({ children, width = STAGE_WIDTH, height = STAGE_HEIGHT, content }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fit = useDesignFit(hostRef, { width, height, content: content ?? { top: 0, bottom: height } });

  // Zoomed in past the point where the artboard fits, the host scrolls rather
  // than shrinking the design any further - see designFit's minUnit.
  return (
    <div ref={hostRef} className="stageHost" style={fit.clamped ? { overflow: 'auto' } : undefined}>
      <div style={fit.clamped ? { width: fit.scrollWidth, height: fit.scrollHeight, position: 'relative' } : { display: 'contents' }}>
        <div
          className="stageCanvas"
          data-stage-unit={fit.unit.toFixed(4)}
          data-stage-clamped={fit.clamped ? 'true' : undefined}
          style={{
            width,
            height,
            left: fit.offsetX,
            top: fit.offsetY,
            transform: `scale(${fit.unit})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
