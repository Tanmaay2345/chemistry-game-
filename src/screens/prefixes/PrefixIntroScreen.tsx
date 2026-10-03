import { useEffect, useRef, useState } from 'react';
import { InstructionCard } from '../../components/InstructionCard';
import { StudyPaper } from './components/StudyPaper';
import { PrefixRail } from './components/PrefixRail';
import { PREFIXES, prefixHoldMs } from './data/prefixes';
import type { PrefixEventHandler } from './events';

/**
 * Carbon-chain prefix introduction - Figma frame "915" (4589:15506),
 * 1440 x 1024.
 *
 * The frame is one state of a sequence: "Meth" is the active chip and the
 * badge reads 1C. The screen walks the rail, growing each chip in turn while
 * the highlight, the badge and the instruction copy follow it.
 *
 * `onEvent` is where a voice layer will attach; this component never speaks.
 */

type Props = {
  /** Report what is on screen, for a future voice layer. */
  onEvent?: PrefixEventHandler;
  /** Advance automatically. Off leaves the rail under the learner's control. */
  autoPlay?: boolean;
  /** Prefix to open on; used for visual checks against the Figma frames. */
  startIndex?: number;
  /** Moves on to the bond screens; the card is the only control on the frame. */
  onContinue?: () => void;
};

export function PrefixIntroScreen({ onEvent, autoPlay = true, startIndex = 0, onContinue }: Props) {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  // The walk is on or off for the life of the screen now: nothing stops it
  // part-way, because nothing may take it over while it is playing.
  const playing = autoPlay;
  const previousIndex = useRef(startIndex);
  const started = useRef(false);

  // Report what is showing. Kept separate from the timer so a learner-driven
  // jump reports the same events an automatic step does.
  useEffect(() => {
    const prefix = PREFIXES[activeIndex];
    if (!started.current) {
      started.current = true;
      onEvent?.({ type: 'instructionStarted', prefix: prefix.title, carbonCount: prefix.carbonCount });
    } else if (previousIndex.current !== activeIndex) {
      onEvent?.({
        type: 'prefixChanged',
        from: PREFIXES[previousIndex.current].title,
        to: prefix.title,
        carbonCount: prefix.carbonCount,
        index: activeIndex,
      });
    }
    previousIndex.current = activeIndex;

    onEvent?.({ type: 'prefixShown', prefix: prefix.title, carbonCount: prefix.carbonCount, index: activeIndex });

    if (activeIndex === PREFIXES.length - 1) {
      onEvent?.({ type: 'instructionCompleted', prefix: prefix.title, carbonCount: prefix.carbonCount });
    }
  }, [activeIndex, onEvent]);

  // The sequence: hold on each prefix, then grow the next one. It rests on the
  // last prefix rather than looping, since the design shows a single pass.
  useEffect(() => {
    if (!playing) return;
    if (activeIndex >= PREFIXES.length - 1) return;
    const delay = prefixHoldMs(activeIndex);
    const timer = window.setTimeout(() => setActiveIndex((index) => index + 1), delay);
    return () => window.clearTimeout(timer);
  }, [activeIndex, playing]);

  // While the sequence is playing it plays itself. A chip press used to take
  // it over, which would let a learner jump past a prefix - and past the line
  // being said about it - in a stretch of the lesson that is meant to be
  // watched. With the walk stopped (`?autoplay=off`) the chips still work.
  const handleSelect = (index: number) => {
    if (playing) return;
    setActiveIndex(index);
  };

  const prefix = PREFIXES[activeIndex];

  return (
    <div style={{ backgroundColor: '#ffffff', position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <StudyPaper>
        <PrefixRail prefixes={PREFIXES} activeIndex={activeIndex} onSelect={handleSelect} />
      </StudyPaper>

      {/* Paper plane + instruction card - Figma 4589:15727 */}
      <div
        style={{
          position: 'absolute',
          alignContent: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          left: '50%',
          top: 564,
          width: 1010,
          transform: 'translateX(-50%)',
        }}
      >
        <div style={{ height: 54.5, position: 'relative', flexShrink: 0, width: 173 }}>
          <div style={{ position: 'absolute', inset: '-1.83% -0.25% -1.87% -1.14%' }}>
            <img alt="" src="/figma/0b2dc.svg" style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%' }} />
          </div>
        </div>
        <InstructionCard
          title={prefix.title}
          body={prefix.body}
          width={1010}
          height={120}
          tickBottom={116}
          bodyFontSize={24}
          fadeKey={prefix.label}
          onContinue={onContinue}
        />
      </div>
    </div>
  );
}
