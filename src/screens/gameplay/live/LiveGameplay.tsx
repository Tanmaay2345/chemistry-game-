import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Vec } from '../../../game/chemistry/molecule.ts';
import { useGameAudio } from '../../../game/audio/useGameAudio.ts';
import { useGameVoice } from '../../../game/voice/useGameVoice.ts';
import { ALKANE_CHALLENGES } from '../../../game/engine/config.ts';
import { GameEngine } from '../../../game/engine/engine.ts';
import type { GameEvent } from '../../../game/engine/events.ts';
import { progressMessage } from './announce.ts';
import { GameControls } from './GameControls';
import { GameplayScene } from '../GameplayScene';
import type { Scene } from '../scene/types';
import { ViewportBackground } from '../components/ViewportBackground';
import { DESIGN, useGameplayLayout } from '../layout/useGameplayLayout';
import { pointerAction } from './pointerAction.ts';
import { projectScene } from './projectScene.ts';

/**
 * The game, played.
 *
 * This component owns no rules. It runs the clock, turns pointer positions into
 * gameplay coordinates, and draws whatever the engine's snapshot says - through
 * the same scene renderer and the same responsive layer the transcribed Figma
 * frames use. The 31-frame walkthrough is untouched and still runs on its own
 * route; this is the same picture with the engine underneath.
 */

/** Where the ruled frame sits inside the 1440 x 1024 design: gameplay (0, 0). */
const FRAME_ORIGIN = { x: 127, y: 1 };

/** How long "Resumed." stays on the card after the tab comes back. */
const RESUMED_NOTICE_MS = 1800;

/** Longer than this between frames is a gap in real time, not a slow frame. */
const MAX_FRAME_MS = 1000;

/**
 * The card, while the tab is away and just after it comes back.
 *
 * It is the same card in the same place - the game has one place where it
 * tells the player what is happening, and this is not a reason to invent a
 * second one.
 */
function pausedScene(scene: Scene, hidden: boolean, justResumed: boolean): Scene {
  if (hidden) {
    return {
      ...scene,
      panel: {
        ...scene.panel,
        title: 'Paused',
        body: 'This tab is in the background, so the clock has stopped. Come back to carry on.',
        note: undefined,
      },
    };
  }
  if (justResumed) return { ...scene, panel: { ...scene.panel, note: 'Resumed.' } };
  return scene;
}

/** Ruled lines are centred on the frame; make them reach the window edges. */
function ruleLengthFor(offsetY: number, unit: number, height: number): number {
  const centre = offsetY + 512 * unit;
  return Math.max(1022, (2 * Math.max(centre, height - centre)) / unit + 4);
}

type Props = {
  /** Which challenge to play. Defaults to ethane, the Figma walkthrough's molecule. */
  molecule?: string;
  /** The one after it in the teaching order, or null at the end. */
  nextMolecule?: string | null;
  /** Moves the round on once this molecule has been built. */
  onAdvance?: (molecule: string) => void;
  /** Lets an audio layer (or a test) listen in without touching the engine. */
  onEvent?: (event: GameEvent) => void;
  /** Back to the walkthrough. Absent when the game is opened on its own. */
  onExit?: () => void;
};

export function LiveGameplay({ molecule = 'ethane', nextMolecule = null, onAdvance, onEvent, onExit }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layout = useGameplayLayout(hostRef);

  /**
   * Bumped to play again.
   *
   * Restarting builds a new engine rather than resetting the old one: every
   * field - molecule, bonds, tray, paper, web, flyer, impact, timer, score,
   * mistakes, held atoms, phase - comes from the constructor, so nothing can
   * leak from the round before. The audio layer and the frame loop both key
   * off the engine, so they are rebuilt with it.
   */
  const [round, setRound] = useState(0);

  const engine = useMemo(() => {
    const challenge = ALKANE_CHALLENGES[molecule] ?? ALKANE_CHALLENGES.ethane;
    return new GameEngine(challenge);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [molecule, round]);

  // The snapshot is replaced every frame; React draws whatever is current.
  const [snapshot, setSnapshot] = useState(() => engine.snapshot());

  /**
   * A backgrounded tab pauses the round, and says so.
   *
   * The clock already stopped when the tab was hidden - the browser stops
   * calling `requestAnimationFrame`, so the engine simply was not ticked -
   * but nothing told the player, so coming back to an unchanged clock looked
   * like the game had broken. The pause is now deliberate: stated on the card
   * while it lasts, acknowledged for a moment on the way back, and with the
   * frame clock reset so no time passes while the tab is away.
   */
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden');
  const [resumedAt, setResumedAt] = useState(0);
  const lastFrameRef = useRef(performance.now());

  useEffect(() => {
    const onVisibility = () => {
      const nowHidden = document.visibilityState === 'hidden';
      setHidden(nowHidden);
      if (nowHidden) return;
      // Coming back: no time passed, so the next frame starts from now. Left
      // alone, that frame would carry the whole time the tab was away and the
      // engine would advance a projectile the player never saw thrown.
      lastFrameRef.current = performance.now();
      setResumedAt(Date.now());
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // The "resumed" note clears itself.
  useEffect(() => {
    if (!resumedAt) return;
    const timer = window.setTimeout(() => setResumedAt(0), RESUMED_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [resumedAt]);

  // Sound: one subscription to the engine's events (see game/audio). Muted
  // with ?mute=1 so visual checks can run silently.
  const unmuted = new URLSearchParams(window.location.search).get('mute') !== '1';
  useGameAudio(engine, unmuted);
  // Narration: a second subscription to the same bus (see game/voice). It
  // reads events and the snapshot and speaks; it cannot touch the round.
  // `nextMolecule` is passed because the engine does not know the teaching
  // order, and the summary line differs at the end of it.
  useGameVoice(engine, unmuted, nextMolecule);

  useEffect(() => {
    if (!onEvent) return;
    return engine.bus.on(onEvent);
  }, [engine, onEvent]);

  useEffect(() => {
    // A fresh engine's picture, before the first frame of the new round.
    setSnapshot(engine.snapshot());
    engine.start();
    let frame = 0;
    lastFrameRef.current = performance.now();
    const loop = (now: number) => {
      // A hidden tab is paused: the frame clock keeps up with real time but
      // the engine is not advanced, so nothing moves and no time is spent.
      //
      // The size check is the same rule for the cases `visibilitychange` does
      // not cover - an occluded window, a throttled tab, a machine that went
      // to sleep. A frame worth more than a second of play is a gap, not a
      // frame, and a gap costs the player nothing.
      const delta = now - lastFrameRef.current;
      if (document.visibilityState === 'visible' && delta <= MAX_FRAME_MS) engine.tick(delta);
      lastFrameRef.current = now;
      setSnapshot({ ...engine.snapshot() });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine]);

  /** Pointer position in gameplay coordinates - the frame's own coordinates. */
  const toGameplay = useCallback(
    (clientX: number, clientY: number): Vec => {
      const host = hostRef.current;
      if (!host) return { x: 0, y: 0 };
      const rect = host.getBoundingClientRect();
      return {
        x: (clientX - rect.left - layout.offsetX) / layout.unit - FRAME_ORIGIN.x,
        y: (clientY - rect.top - layout.offsetY) / layout.unit - FRAME_ORIGIN.y,
      };
    },
    [layout],
  );

  const handleMove = useCallback(
    (event: React.PointerEvent) => {
      engine.aim(toGameplay(event.clientX, event.clientY));
    },
    [engine, toGameplay],
  );

  /**
   * One pointer: pick a group, web an atom, or throw. Which of those it is
   * depends on the phase and on what is under the pointer - the engine is
   * asked, it is not decided here.
   */
  const handleDown = useCallback(
    (event: React.PointerEvent) => {
      if (document.visibilityState !== 'visible') return;
      const point = toGameplay(event.clientX, event.clientY);
      engine.aim(point);
      // A teaching beat is skippable: the first click ends it.
      if (engine.skipTeachingBeat()) return;
      const current = engine.snapshot();

      // The carbon phase is a paper throw: the player aims anywhere and the
      // paper flies there. Whichever group it lands on is the one chosen, so
      // the choice is made by the throw rather than by a click on a list.
      if (current.phase === 'CARBON_SELECTION') {
        engine.throwPaperAt(point);
        return;
      }
      if (current.phase === 'PAPER_FLIGHT' || current.phase === 'CARBON_IMPACT') return;

      const action = pointerAction(engine, current, point);
      if (action.kind === 'collect') engine.fireWeb(action.atomId);
      else if (action.kind === 'throw') engine.throwAt(point);
    },
    [engine, toGameplay],
  );

  // Development-only handle: lets a check drive the game the way a player
  // does, and read back what the engine thinks happened.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __live?: unknown }).__live = { engine, toGameplay, frameOrigin: FRAME_ORIGIN };
  }, [engine, toGameplay]);

  const restart = useCallback(() => setRound((n) => n + 1), []);

  /**
   * What the summary's control does.
   *
   * A molecule that was built leads on to the next one in the teaching order;
   * a round that ran out of time is offered again. At the end of the order
   * there is nothing further, so it replays.
   */
  const solved = snapshot.summary?.completion === 'completed';
  const goesOnTo = solved && nextMolecule && onAdvance ? nextMolecule : null;
  const onSummary = useCallback(() => {
    if (goesOnTo && onAdvance) onAdvance(goesOnTo);
    else restart();
  }, [goesOnTo, onAdvance, restart]);

  const scene = pausedScene(projectScene(snapshot, goesOnTo), hidden, resumedAt > 0);
  const ruleLength = ruleLengthFor(layout.offsetY, layout.unit, layout.height);
  // Announced about once a second rather than on every frame, so a screen
  // reader is kept up to date without being talked over continuously.
  const progress = progressMessage({ ...snapshot, timeRemaining: Math.floor(snapshot.timeRemaining) });

  return (
    <div
      ref={hostRef}
      onPointerMove={handleMove}
      onPointerDown={handleDown}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: layout.clamped ? 'auto' : 'hidden',
        backgroundColor: '#ffffff',
        cursor: snapshot.phase === 'SUMMARY' ? 'default' : 'crosshair',
        touchAction: 'none',
      }}
      role="application"
      aria-label={`${snapshot.objective}. Tab to move between the carbon sets, the hydrogen row and the free bonds; Enter to act.`}
    >
      <ViewportBackground layout={layout} />
      <p
        // Where the round is, for anyone not reading the board.
        role="status"
        aria-live="polite"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}
      >
        {progress}
      </p>
      <div
        data-layout-unit={layout.unit.toFixed(4)}
        data-phase={snapshot.phase}
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
        {/* On the summary the card becomes the control that starts the next
            round - the same card-as-button the rest of the flow already
            uses, rather than a new pattern. */}
        <GameplayScene
          scene={scene}
          hotspot={snapshot.phase === 'SUMMARY' ? 'panel' : undefined}
          onHotspot={snapshot.phase === 'SUMMARY' ? onSummary : undefined}
          bands={false}
          ruleLength={ruleLength}
        />
        <GameControls
          engine={engine}
          snapshot={snapshot}
          origin={FRAME_ORIGIN}
          onRestart={onSummary}
          nextMolecule={goesOnTo}
          onExit={onExit}
        />
      </div>
    </div>
  );
}
