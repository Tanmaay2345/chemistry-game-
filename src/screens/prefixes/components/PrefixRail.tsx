import { useLayoutEffect, useRef, useState } from 'react';
import { PrefixChip } from './PrefixChip';
import { MOTION, VISIBLE_CHIPS, type Prefix } from '../data/prefixes';

/**
 * The prefix rail - Figma 4589:15600, plus the highlight (4589:15726) and the
 * carbon-count badge (4589:15723) that travel with the active chip.
 *
 * The pins that hang from the dashed timeline are fixed decorations: Figma
 * places them at the same eight offsets whether or not a chip is active.
 */

type Props = {
  prefixes: Prefix[];
  activeIndex: number;
  onSelect?: (index: number) => void;
};

// Figma offsets of the pins inside the rail (4589:15698 - 4589:15719).
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

/** Slots before the rolling one, which shows oct / Non / Dec. */
const FIXED_SLOTS = VISIBLE_CHIPS - 1;

/** Figma places the highlight 17px left of the active chip (frame 915). */
const HIGHLIGHT_OFFSET = -17;

/**
 * The badge is hand-placed in each frame rather than pinned to the chip:
 * frame 915 puts it at 85,173 over the first slot and the "Non" frame
 * (4589:17655) at 991,179 over the last. Both anchors are honoured exactly and
 * the slots between them interpolate, which lands the badge over its chip.
 */
const BADGE_ANCHORS = { first: { left: 85, top: 173 }, last: { left: 991, top: 179 } };

function badgePosition(slot: number, slots: number) {
  const t = slots > 1 ? slot / (slots - 1) : 0;
  return {
    left: BADGE_ANCHORS.first.left + (BADGE_ANCHORS.last.left - BADGE_ANCHORS.first.left) * t,
    top: BADGE_ANCHORS.first.top + (BADGE_ANCHORS.last.top - BADGE_ANCHORS.first.top) * t,
  };
}

export function PrefixRail({ prefixes, activeIndex, onSelect }: Props) {
  // Seven fixed chips plus the rolling slot: it shows the active prefix once
  // the count passes seven, and "oct" until then - as all three frames draw it.
  const rollingIndex = Math.max(activeIndex, FIXED_SLOTS);
  const chips = [
    ...prefixes.slice(0, FIXED_SLOTS).map((prefix, index) => ({ label: prefix.label, index })),
    { label: prefixes[rollingIndex].label, index: rollingIndex },
  ];
  const activeSlot = activeIndex < FIXED_SLOTS ? activeIndex : FIXED_SLOTS;

  const railRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [chipLeft, setChipLeft] = useState<number | null>(null);

  // Track where the active chip ends up so the highlight and badge can follow
  // it. Measured rather than computed: the chips change width as they grow.
  // Rects are used because the chips' offset parent is the row, not the frame,
  // and the whole canvas may be scaled to the viewport.
  useLayoutEffect(() => {
    const rail = railRef.current;
    const chip = chipRefs.current[activeSlot];
    const frame = rail?.offsetParent as HTMLElement | null;
    if (!rail || !chip || !frame) return;

    const frameRect = frame.getBoundingClientRect();
    const scale = frameRect.width / frame.offsetWidth || 1;
    setChipLeft((chip.getBoundingClientRect().left - frameRect.left) / scale);
  }, [activeSlot, prefixes.length]);

  const travel = `left ${MOTION.transition}ms ${MOTION.easing}`;
  const badge = badgePosition(activeSlot, chips.length);

  return (
    <>
      {/* Carbon count - Figma 4589:15723 */}
      <div
        style={{
          position: 'absolute',
          height: 56,
          left: badge.left,
          top: badge.top,
          width: 55,
          transition: `${travel}, top ${MOTION.transition}ms ${MOTION.easing}`,
        }}
      >
        <div style={{ position: 'absolute', height: 56, left: 0, top: 0, width: 55 }}>
          <div style={{ position: 'absolute', inset: '-50% -50.91%' }}>
            <img alt="" src="/figma/11b9f.svg" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
          </div>
        </div>
        <p
          style={{
            wordBreak: 'break-word',
            position: 'absolute',
            fontFamily: 'Lexend, sans-serif',
            fontWeight: 500,
            lineHeight: 0,
            left: 12,
            color: '#fffefe',
            fontSize: 0,
            top: 8,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ lineHeight: 'normal', fontSize: 32 }}>{prefixes[activeIndex].carbonCount}</span>
          <span style={{ lineHeight: 'normal', fontSize: 20 }}>C</span>
        </p>
      </div>

      {/* Rail - Figma 4589:15600 */}
      <div
        ref={railRef}
        style={{
          position: 'absolute',
          alignContent: 'stretch',
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          justifyContent: 'center',
          left: 3,
          padding: 16,
          top: 279,
          width: 1177,
        }}
      >
        <div aria-hidden style={{ position: 'absolute', backgroundColor: '#ffffff', inset: 0, pointerEvents: 'none' }} />

        <div style={{ alignContent: 'stretch', display: 'flex', gap: 24, alignItems: 'center', position: 'relative', flexShrink: 0, width: 1059 }}>
          {chips.map((chip, slot) => (
            <PrefixChip
              key={slot}
              ref={(node) => {
                chipRefs.current[slot] = node;
              }}
              label={chip.label}
              active={slot === activeSlot}
              onSelect={onSelect ? () => onSelect(chip.index) : undefined}
            />
          ))}
        </div>

        {PINS.map((pin, i) => (
          <div key={i} style={{ position: 'absolute', height: 35, left: pin.left, top: pin.top, width: 21 }}>
            <img alt="" src="/figma/af4cc.svg" style={{ position: 'absolute', display: 'block', inset: 0, maxWidth: 'none', width: '100%', height: '100%' }} />
          </div>
        ))}

        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit', boxShadow: 'inset 0px 4px 4px 0px white' }} />
      </div>

      {/* Active highlight - Figma 4589:15726 */}
      <div
        style={{
          position: 'absolute',
          borderWidth: 1,
          borderColor: '#e4e2e2',
          borderStyle: 'solid',
          height: 134,
          left: chipLeft === null ? 45 : chipLeft + HIGHLIGHT_OFFSET,
          pointerEvents: 'none',
          borderRadius: 21,
          boxShadow: '0px 4px 4px 0px rgba(152,145,145,0.25)',
          top: 283,
          width: 158,
          transition: travel,
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 21,
            background: 'linear-gradient(to right, rgba(16,153,255,0.2) 30%, rgba(172,199,219,0.2) 100%)',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: 'inset 0px 4px 4px 0px rgba(193,191,191,0.25)' }} />
      </div>
    </>
  );
}
