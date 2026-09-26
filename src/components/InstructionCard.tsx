import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { CogBadge } from './CogBadge';
import { FrameStroke } from './FrameStroke';

/**
 * Instruction card used by the carbon onboarding screens
 * (Figma 4673:1302 on H2, 4246:1293 on H3).
 *
 * Same frame as the sign-in card - white, 4px dashed #5bb9ff, 16px radius,
 * 24px padding, 16px gap, torn-paper ticks on the left edge - with the cog
 * badge in the icon slot instead of the paper illustration.
 *
 * The card doubles as the "continue" control in the flow: the Figma frames
 * carry no separate button, so advancing is attached here.
 */

type Props = {
  title: string;
  body: string;
  width: number;
  /** Height of the Figma frame. Copy longer than the design's can grow past it. */
  height: number;
  /** Vertical offset of the lower torn-paper tick. */
  tickBottom: number;
  /** Body size in design pixels: 18 on the onboarding screens, 24 on the rail screen. */
  bodyFontSize?: number;
  /**
   * Why the last action did not work, in the player's terms. Drawn under the
   * body in its own colour: a mistake is explained on the same card that gave
   * the instruction, not announced somewhere else.
   */
  note?: string;
  /** Change this to cross-fade the copy when the card swaps content. */
  fadeKey?: string | number;
  onContinue?: () => void;
};

const base: CSSProperties = {
  backgroundColor: '#ffffff',
  borderWidth: 4,
  borderColor: 'transparent',
  borderStyle: 'solid',
  alignContent: 'stretch',
  display: 'flex',
  gap: 16,
  alignItems: 'center',
  padding: 24,
  position: 'relative',
  borderRadius: 16,
  flexShrink: 0,
  font: 'inherit',
  textAlign: 'left',
};

export function InstructionCard({ title, body, width, height, tickBottom, bodyFontSize = 18, note, fadeKey, onContinue }: Props) {
  const interactive = Boolean(onContinue);
  const Tag = interactive ? 'button' : 'div';

  // The dashed frame is drawn at the card's real height, so copy longer than
  // the design's still gets a frame that fits it.
  const cardRef = useRef<HTMLElement>(null);
  const [drawnHeight, setDrawnHeight] = useState(height);
  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const measure = () => setDrawnHeight(node.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [height, note]);

  return (
    <Tag
      {...(interactive
        ? {
            type: 'button' as const,
            onClick: onContinue,
            className: 'instructionCard',
            // What the card says, and what pressing it does. Without this the
            // card reads out but never says it is the way forward.
            'aria-label': [title, body, note, 'Continue.'].filter(Boolean).join(' '),
          }
        : {})}
      ref={cardRef as never}
      style={{ ...base, width, minHeight: height, cursor: interactive ? 'pointer' : 'default' }}
    >
      <FrameStroke width={width} height={drawnHeight} strokeWidth={4} color="#5bb9ff" dash="2 2" radius={16} left={-4} top={-4} />
      <CogBadge />
      <div
        key={fadeKey}
        className={fadeKey === undefined ? undefined : 'cardCopy'}
        // Read out as it changes, so the instruction and the reason a throw
        // failed reach a screen reader without the player hunting for them.
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          wordBreak: 'break-word',
          alignContent: 'stretch',
          display: 'flex',
          flex: '1 0 0',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-start',
          lineHeight: 'normal',
          minWidth: 1,
          position: 'relative',
        }}
      >
        <p style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 600, position: 'relative', flexShrink: 0, fontSize: 24, color: '#000000', width: '100%' }}>
          {title}
        </p>
        {body && (
          <p style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 500, position: 'relative', flexShrink: 0, color: '#6d6d6d', fontSize: bodyFontSize, width: '100%' }}>
            {body}
          </p>
        )}
        {note && (
          <p
            style={{
              fontFamily: 'Lexend, sans-serif',
              fontWeight: 500,
              position: 'relative',
              flexShrink: 0,
              color: '#b3400f',
              fontSize: bodyFontSize,
              width: '100%',
            }}
          >
            {note}
          </p>
        )}
      </div>
      <div style={{ position: 'absolute', height: 0, left: -1, top: tickBottom, width: 39 }}>
        <div style={{ position: 'absolute', inset: '-7px 0 0 0' }}>
          <img alt="" src="/figma/ddfd1.svg" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', height: 0, left: 1, top: 2, width: 39 }}>
        <div style={{ position: 'absolute', inset: '-7px 0 0 0' }}>
          <img alt="" src="/figma/ddfd1.svg" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>
      </div>
    </Tag>
  );
}
