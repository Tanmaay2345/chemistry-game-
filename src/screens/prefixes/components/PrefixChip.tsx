import { forwardRef } from 'react';
import { FrameStroke } from '../../../components/FrameStroke';
import { ACTIVE_SCALE, MOTION } from '../data/prefixes';

/**
 * One prefix chip from the rail - Figma 4589:15614 (inactive) and 4589:15602
 * (active).
 *
 * Every measurement of the active chip in Figma is the inactive chip times
 * 130.651/106: card 117.093/95, height 89.977/73, border 4.93/4, radius
 * 19.721/16, label 27.116/22. So the chip is drawn once at its base size and
 * scaled, which also gives the growth something continuous to animate.
 */

type Props = {
  label: string;
  active: boolean;
  onSelect?: () => void;
};

export const PrefixChip = forwardRef<HTMLButtonElement, Props>(function PrefixChip(
  { label, active, onSelect },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="prefixChip"
      style={{
        width: active ? 106 * ACTIVE_SCALE : 106,
        height: active ? 86 * ACTIVE_SCALE : 86,
        position: 'relative',
        flexShrink: 0,
        padding: 0,
        border: 'none',
        background: 'none',
        cursor: onSelect ? 'pointer' : 'default',
        transition: `width ${MOTION.transition}ms ${MOTION.easing}, height ${MOTION.transition}ms ${MOTION.easing}`,
      }}
    >
      <div
        style={{
          width: 106,
          height: 86,
          position: 'relative',
          transformOrigin: 'top left',
          transform: active ? `scale(${ACTIVE_SCALE})` : 'scale(1)',
          transition: `transform ${MOTION.transition}ms ${MOTION.easing}`,
        }}
      >
        {/* Sketched chip outline - Figma 4589:15615 */}
        <div style={{ position: 'absolute', height: 86, left: 0, top: 0, width: 106 }}>
          <img alt="" src="/figma/dc754.svg" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
        </div>

        {/* Label card - Figma 4589:15617 */}
        <div
          style={{
            position: 'absolute',
            backgroundColor: '#ffffff',
            alignContent: 'stretch',
            display: 'flex',
            height: 73,
            alignItems: 'center',
            left: 0,
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 10,
            paddingBottom: 10,
            borderRadius: 16,
            top: 13,
            width: 95,
          }}
        >
          <FrameStroke width={95} height={73} strokeWidth={4} color="#437fed" radius={16} align="center" />
          <p
            style={{
              wordBreak: 'break-word',
              fontFamily: 'Lexend, sans-serif',
              fontWeight: 500,
              lineHeight: 'normal',
              position: 'relative',
              flexShrink: 0,
              fontSize: 22,
              color: '#000000',
              letterSpacing: -0.88,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </p>
        </div>

        {/* Hatched top strip - Figma 4589:15619 */}
        <div style={{ position: 'absolute', height: 10, left: 5, top: 2, width: 92 }}>
          <div style={{ position: 'absolute', inset: '0 0 -4.15% 0' }}>
            <img alt="" src="/figma/eaad0.svg" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
          </div>
        </div>
      </div>
    </button>
  );
});
