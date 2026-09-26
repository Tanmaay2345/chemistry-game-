import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GameplayScene } from './GameplayScene';
import { ViewportBackground } from './components/ViewportBackground';
import { DESIGN, useGameplayLayout } from './layout/useGameplayLayout';
import { GAMEPLAY_SCENES } from './data';
import { GAMEPLAY_STEPS } from './flow/steps';
import { FLOW_MOTION, type FlowStep } from './flow/types';
import type { Scene, SceneElement } from './scene/types';

/**
 * Plays the gameplay flow. This is a front-end simulation: clicks and timers
 * step through the Figma states; nothing is computed. The real game engine
 * will later take over deciding which scene comes next - the renderer and the
 * scene data stay as they are.
 *
 * Layout: the component fills the window. The background is laid out against
 * the window; the gameplay itself lives in one design-coordinate layer that
 * `useGameplayLayout` sizes and places (see there for the rules).
 */

const SCENES_BY_ID = new Map(GAMEPLAY_SCENES.map((scene) => [scene.id, scene]));

function hasKey(elements: SceneElement[] | undefined, key: string): boolean {
  return (elements ?? []).some((el) => el.key === key || (el.kind === 'group' && hasKey(el.children, key)));
}

/** Where the click lands: the step's target, or the card if a frame lacks it. */
function clickTarget(step: FlowStep, scene: Scene): string | undefined {
  if (step.advance.kind !== 'click' || step.advance.target === 'none') return undefined;
  const target = step.advance.target;
  if (target === 'panel' || hasKey(scene.elements, target) || hasKey(scene.rootElements, target)) return target;
  if (import.meta.env.DEV) console.warn(`[gameplay] ${scene.id} has no element "${target}"; using the card.`);
  return 'panel';
}

/**
 * `?scene=methane-05` opens a single state and holds it (timers off), which is
 * how each state is checked against its Figma frame.
 */
function requestedScene(): string | null {
  return new URLSearchParams(window.location.search).get('scene');
}

type Props = {
  /** Reports each state as it is shown - the hook a voice layer or engine can use. */
  onStepChange?: (step: FlowStep, index: number) => void;
  /**
   * Called from the last frame. The Figma flow ends on the first bonded
   * hydrogen; without this the walkthrough was a dead end with no way on to
   * the game it is demonstrating.
   */
  onContinue?: () => void;
};

export function GameplayFlow({ onStepChange, onContinue }: Props) {
  const pinned = useMemo(requestedScene, []);
  const [index, setIndex] = useState(() => {
    const found = GAMEPLAY_STEPS.findIndex((step) => step.scene === pinned);
    return found >= 0 ? found : 0;
  });

  const step = GAMEPLAY_STEPS[index];
  const scene = SCENES_BY_ID.get(step.scene);

  const hostRef = useRef<HTMLDivElement>(null);
  const layout = useGameplayLayout(hostRef);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastRects = useRef<Map<string, DOMRect> | null>(null);

  const atEnd = index === GAMEPLAY_STEPS.length - 1;

  const advance = useCallback(() => {
    // Remember where every keyed element is, so the next scene can move it
    // from here rather than jump.
    const root = containerRef.current;
    if (root) {
      const rects = new Map<string, DOMRect>();
      root.querySelectorAll<HTMLElement>('[data-key]').forEach((el) => rects.set(el.dataset.key!, el.getBoundingClientRect()));
      lastRects.current = rects;
    }
    setIndex((i) => Math.min(i + 1, GAMEPLAY_STEPS.length - 1));
  }, []);

  /** The card is the control the flow already uses; on the last frame it leads on. */
  const onCardClick = useCallback(() => {
    if (atEnd) onContinue?.();
    else advance();
  }, [atEnd, onContinue, advance]);

  // Motion between states (FLIP): keyed elements glide from their previous
  // position; elements new to a motion frame fade in. Figma carries no motion
  // data for these frames, so timing comes from FLOW_MOTION.
  useLayoutEffect(() => {
    const root = containerRef.current;
    const previous = lastRects.current;
    lastRects.current = null;
    if (!root || !previous || step.transition !== 'tween') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const scale = root.getBoundingClientRect().width / root.offsetWidth || 1;
    const options = { duration: FLOW_MOTION.tweenMs, easing: FLOW_MOTION.easing };
    root.querySelectorAll<HTMLElement>('[data-key]').forEach((el) => {
      const before = previous.get(el.dataset.key!);
      if (!before) {
        el.animate([{ opacity: 0 }, { opacity: 1 }], options);
        return;
      }
      const after = el.getBoundingClientRect();
      const dx = (before.left - after.left) / scale;
      const dy = (before.top - after.top) / scale;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], options);
    });
  }, [index, step.transition]);

  useEffect(() => {
    onStepChange?.(step, index);
  }, [step, index, onStepChange]);

  // Frames Figma draws mid-motion play by themselves.
  useEffect(() => {
    if (pinned || step.advance.kind !== 'auto') return;
    const timer = window.setTimeout(advance, step.advance.afterMs);
    return () => window.clearTimeout(timer);
  }, [step, pinned, advance]);

  // Development-only handle for checking every state at every window size.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handle = {
      scenes: GAMEPLAY_STEPS.map((s) => s.scene),
      goTo: (id: string) => {
        const found = GAMEPLAY_STEPS.findIndex((s) => s.scene === id);
        if (found >= 0) setIndex(found);
        return found >= 0;
      },
    };
    (window as unknown as { __gameplay?: typeof handle }).__gameplay = handle;
  }, []);

  if (!scene) {
    throw new Error(`Gameplay step refers to unknown scene "${step.scene}"`);
  }

  // Ruled lines are centred on the frame (design y 512); make them long
  // enough to reach both window edges.
  const centre = layout.offsetY + 512 * layout.unit;
  const ruleLength = Math.max(1022, (2 * Math.max(centre, layout.height - centre)) / layout.unit + 4);

  return (
    <div ref={hostRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#ffffff' }}>
      <ViewportBackground layout={layout} />
      <div
        ref={containerRef}
        data-layout-unit={layout.unit.toFixed(4)}
        style={{
          position: 'absolute',
          left: layout.offsetX,
          top: layout.offsetY,
          width: DESIGN.width,
          height: DESIGN.height,
          transformOrigin: '0 0',
          transform: `scale(${layout.unit})`,
        }}
      >
        <GameplayScene
          scene={atEnd && onContinue ? { ...scene, panel: { ...scene.panel, body: `${scene.panel.body} Now play it yourself.` } } : scene}
          hotspot={atEnd && onContinue ? 'panel' : clickTarget(step, scene)}
          onHotspot={onCardClick}
          // The card advances every step, not only the ones that name it. The
          // element hotspots stay as the thing the frame is pointing at, but
          // they are no longer the only way on.
          onCardAdvance={onCardClick}
          bands={false}
          ruleLength={ruleLength}
        />
      </div>
    </div>
  );
}
